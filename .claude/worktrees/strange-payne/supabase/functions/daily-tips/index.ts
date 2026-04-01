import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const hour = now.getHours();

    // Fetch all user context in parallel
    const [
      profileResult,
      metricsResult,
      nutritionResult,
      activitiesResult,
      bodyCompResult,
      healthContextResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("daily_metrics").select("*").eq("user_id", userId).eq("date", today).single(),
      supabase.from("nutrition_logs").select("*").eq("user_id", userId).gte("logged_at", `${today}T00:00:00`).order("logged_at", { ascending: false }),
      supabase.from("activities").select("*").eq("user_id", userId).gte("performed_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("performed_at", { ascending: false }),
      supabase.from("body_composition").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(3),
      supabase.from("user_context").select("*").eq("user_id", userId),
    ]);

    const profile = profileResult.data;
    const metrics = metricsResult.data;
    const todayMeals = nutritionResult.data || [];
    const weekActivities = activitiesResult.data || [];
    const bodyCompositions = bodyCompResult.data || [];
    const healthContext = healthContextResult.data || [];

    // Calculate today's totals
    const totalProtein = todayMeals.reduce((sum: number, meal: { protein?: number }) => sum + (meal.protein || 0), 0);
    const totalCalories = todayMeals.reduce((sum: number, meal: { calories?: number }) => sum + (meal.calories || 0), 0);
    const waterMl = metrics?.water_ml || 0;
    const steps = metrics?.steps || 0;

    // Goals
    const waterGoal = profile?.target_water_ml || 2500;
    const caloriesGoal = profile?.target_calories || 2000;
    const stepsGoal = profile?.target_steps || 10000;
    const proteinGoal = Math.round((profile?.weight_kg || 70) * 2);
    const goal = profile?.goal;

    // Progress percentages
    const waterPct = Math.round((waterMl / waterGoal) * 100);
    const caloriesPct = Math.round((totalCalories / caloriesGoal) * 100);
    const proteinPct = Math.round((totalProtein / proteinGoal) * 100);
    const stepsPct = Math.round((steps / stepsGoal) * 100);

    // Build context for AI
    const contextParts: string[] = [];
    
    contextParts.push(`**Profil:** ${profile?.first_name || "Utilisateur"}, ${profile?.gender === "male" ? "homme" : profile?.gender === "female" ? "femme" : ""}, ${profile?.weight_kg || "?"}kg, objectif: ${goal || "non défini"}`);
    
    if (profile?.target_weight_kg) {
      contextParts.push(`Poids cible: ${profile.target_weight_kg}kg`);
    }
    if (profile?.target_body_fat_pct) {
      contextParts.push(`Masse grasse cible: ${profile.target_body_fat_pct}%`);
    }

    contextParts.push(`\n**Aujourd'hui (${hour}h):**`);
    contextParts.push(`- Hydratation: ${(waterMl / 1000).toFixed(1)}L / ${(waterGoal / 1000).toFixed(1)}L (${waterPct}%)`);
    contextParts.push(`- Calories: ${totalCalories} / ${caloriesGoal} kcal (${caloriesPct}%)`);
    contextParts.push(`- Protéines: ${Math.round(totalProtein)}g / ${proteinGoal}g (${proteinPct}%)`);
    contextParts.push(`- Pas: ${steps} / ${stepsGoal} (${stepsPct}%)`);

    if (todayMeals.length > 0) {
      const mealTypes = todayMeals.map((m: { meal_type: string }) => m.meal_type);
      const uniqueMeals = [...new Set(mealTypes)];
      contextParts.push(`- Repas enregistrés: ${uniqueMeals.join(", ")}`);
    }

    contextParts.push(`\n**Cette semaine:** ${weekActivities.length} séance(s) de sport`);
    if (weekActivities.length > 0) {
      const activityTypes = weekActivities.slice(0, 3).map((a: { activity_type: string; duration_min: number }) => `${a.activity_type} (${a.duration_min}min)`);
      contextParts.push(`Dernières séances: ${activityTypes.join(", ")}`);
    }

    if (bodyCompositions.length > 0) {
      const latest = bodyCompositions[0];
      const parts: string[] = [];
      if (latest.body_fat_pct) parts.push(`masse grasse ${latest.body_fat_pct}%`);
      if (latest.muscle_mass_kg) parts.push(`masse musculaire ${latest.muscle_mass_kg}kg`);
      if (latest.visceral_fat_index) parts.push(`graisse viscérale ${latest.visceral_fat_index}`);
      if (parts.length > 0) {
        contextParts.push(`\n**Dernière composition corporelle:** ${parts.join(", ")}`);
      }
    }

    if (healthContext.length > 0) {
      contextParts.push(`\n**Contexte santé mémorisé:**`);
      for (const ctx of healthContext) {
        contextParts.push(`- ${ctx.key}: ${ctx.value}`);
      }
    }

    const userContext = contextParts.join("\n");

    // Call Gemini AI
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY non configurée");
    }

    const systemPrompt = `Tu es un coach sportif et nutritionnel expert. Tu dois générer exactement 3 conseils personnalisés et actionnables pour l'utilisateur, basés sur son contexte actuel.

RÈGLES STRICTES:
1. Génère EXACTEMENT 3 conseils, pas plus, pas moins
2. Chaque conseil doit être SPÉCIFIQUE et ACTIONNABLE (pas de généralités vagues)
3. Base-toi sur les DONNÉES RÉELLES de l'utilisateur (hydratation, protéines, calories, activité, objectifs)
4. Utilise des chiffres concrets quand possible (ex: "Il te reste 0.8L d'eau à boire")
5. Adapte le ton : encourageant pour les succès, motivant pour ce qui reste à faire
6. Prends en compte l'heure de la journée pour des conseils pertinents
7. Si l'utilisateur a des contraintes de santé (blessures, allergies), adapte tes conseils
8. Chaque conseil doit être court (1-2 phrases max) avec un emoji pertinent

FORMAT DE RÉPONSE (JSON strict):
{
  "tips": [
    { "message": "Conseil 1 avec emoji 💪", "type": "success|suggestion|reminder" },
    { "message": "Conseil 2 avec emoji 🎯", "type": "success|suggestion|reminder" },
    { "message": "Conseil 3 avec emoji 💧", "type": "success|suggestion|reminder" }
  ]
}

Types:
- success: objectif atteint ou très bonne progression (vert)
- suggestion: conseil proactif pour optimiser (bleu)
- reminder: rappel important ou alerte (orange)`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nContexte de l'utilisateur:\n${userContext}\n\nGénère les 3 conseils personnalisés.` }] },
          ],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let tips = [];
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        tips = parsed.tips || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      // Fallback tips
      tips = [
        { message: "Continue tes efforts, tu es sur la bonne voie ! 💪", type: "suggestion" },
        { message: "Pense à bien t'hydrater tout au long de la journée 💧", type: "reminder" },
        { message: "Chaque petite action compte vers ton objectif 🎯", type: "suggestion" },
      ];
    }

    // Ensure we have exactly 3 tips
    while (tips.length < 3) {
      tips.push({ message: "Continue tes efforts, tu es sur la bonne voie ! 💪", type: "suggestion" });
    }
    tips = tips.slice(0, 3);

    return new Response(JSON.stringify({ tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("daily-tips error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
