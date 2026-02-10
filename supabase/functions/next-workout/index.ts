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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and goals
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get recent activities (last 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: activities } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .gte("performed_at", twoWeeksAgo.toISOString())
      .order("performed_at", { ascending: false });

    // Get health context (injuries, limitations)
    const { data: healthContext } = await supabase
      .from("user_context")
      .select("*")
      .eq("user_id", user.id);

    // Get user's available equipment
    const equipmentContext = healthContext?.find(c => c.key === "gym_equipment");
    const availableEquipment = equipmentContext?.value || "Standard gym equipment";

    // Build context for AI
    const goal = profile?.goal || "general_fitness";
    const injuries = healthContext?.filter(c => 
      c.key.includes("injury") || c.key.includes("limitation") || c.key.includes("blessure")
    ) || [];

    const recentWorkoutTypes = activities?.map(a => a.activity_type) || [];
    const lastWorkout = activities?.[0];
    const daysSinceLastWorkout = lastWorkout 
      ? Math.floor((Date.now() - new Date(lastWorkout.performed_at).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    // Count workout types in last 2 weeks for balance
    const workoutCounts: Record<string, number> = {};
    recentWorkoutTypes.forEach(type => {
      const normalized = type.toLowerCase();
      if (normalized.includes("jambes") || normalized.includes("leg") || normalized.includes("squat")) {
        workoutCounts["legs"] = (workoutCounts["legs"] || 0) + 1;
      } else if (normalized.includes("dos") || normalized.includes("back") || normalized.includes("tirage")) {
        workoutCounts["back"] = (workoutCounts["back"] || 0) + 1;
      } else if (normalized.includes("pec") || normalized.includes("chest") || normalized.includes("poitrine")) {
        workoutCounts["chest"] = (workoutCounts["chest"] || 0) + 1;
      } else if (normalized.includes("épaule") || normalized.includes("shoulder")) {
        workoutCounts["shoulders"] = (workoutCounts["shoulders"] || 0) + 1;
      } else if (normalized.includes("bras") || normalized.includes("biceps") || normalized.includes("triceps") || normalized.includes("arm")) {
        workoutCounts["arms"] = (workoutCounts["arms"] || 0) + 1;
      } else if (normalized.includes("cardio") || normalized.includes("course") || normalized.includes("vélo")) {
        workoutCounts["cardio"] = (workoutCounts["cardio"] || 0) + 1;
      } else {
        workoutCounts["full_body"] = (workoutCounts["full_body"] || 0) + 1;
      }
    });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = `Tu es un coach fitness expert. Tu dois générer un programme d'entraînement personnalisé pour la prochaine séance.

PROFIL UTILISATEUR:
- Objectif: ${goal === "lose_fat" ? "Perte de gras" : goal === "build_muscle" ? "Prise de muscle" : goal === "maintain" ? "Maintien" : "Forme générale"}
- Poids actuel: ${profile?.weight_kg || "Non renseigné"} kg
- Poids cible: ${profile?.target_weight_kg || "Non renseigné"} kg

CONTRAINTES DE SANTÉ:
${injuries.length > 0 ? injuries.map(i => `- ${i.value}`).join("\n") : "Aucune contrainte particulière"}

ÉQUIPEMENT DISPONIBLE:
${availableEquipment}

HISTORIQUE RÉCENT (2 semaines):
- Dernière séance: ${lastWorkout ? `${lastWorkout.activity_type} il y a ${daysSinceLastWorkout} jour(s)` : "Aucune séance récente"}
- Répartition: ${Object.entries(workoutCounts).map(([k, v]) => `${k}: ${v}x`).join(", ") || "Aucune donnée"}

RÈGLES:
1. Propose 4-6 exercices adaptés
2. Pour chaque exercice, donne: nom, séries, répétitions, poids recommandé (en % du max ou en kg si possible)
3. Équilibre les groupes musculaires selon l'historique
4. Adapte l'intensité au niveau de récupération (jours depuis dernière séance)
5. Respecte ABSOLUMENT les contraintes de santé

IMPORTANT: Retourne un JSON valide avec cette structure exacte:
{
  "workout_name": "Nom de la séance",
  "target_muscles": ["groupe1", "groupe2"],
  "estimated_duration_min": 45,
  "exercises": [
    {
      "name": "Nom de l'exercice",
      "sets": 3,
      "reps": "10-12",
      "weight_recommendation": "70% du max ou 20kg",
      "rest_seconds": 90,
      "notes": "Conseil technique optionnel"
    }
  ],
  "warmup_notes": "Conseil d'échauffement",
  "coach_advice": "Conseil personnalisé pour cette séance"
}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère ma prochaine séance d'entraînement." },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content from AI");
    }

    // Parse the JSON response
    let workout;
    try {
      workout = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse workout JSON");
      }
    }

    return new Response(JSON.stringify(workout), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating workout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
