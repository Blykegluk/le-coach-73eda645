import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { exerciseName } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: "Le nom de l'exercice est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating exercise detail for: ${exerciseName}`);

    const systemPrompt = `Tu es un coach fitness expert. Tu fournis des informations détaillées sur les exercices de musculation et fitness en français.

Tu dois TOUJOURS répondre avec un JSON valide dans ce format exact:
{
  "description": "Description courte de l'exercice (2-3 phrases)",
  "instructions": ["Étape 1", "Étape 2", "Étape 3", ...],
  "muscles_targeted": ["muscle1", "muscle2"],
  "tips": ["Conseil 1", "Conseil 2"],
  "common_mistakes": ["Erreur 1", "Erreur 2"]
}

Règles:
- Sois précis et pédagogique
- Instructions claires et numérotées (4-6 étapes)
- 2-4 muscles ciblés (principaux et secondaires)
- 2-3 conseils pratiques
- 2-3 erreurs courantes à éviter
- Tout en français`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nDonne-moi les informations détaillées pour l'exercice: "${exerciseName}"` }] },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content from AI");
    }

    // Parse the JSON response
    let exerciseDetail;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      exerciseDetail = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback response
      exerciseDetail = {
        description: `${exerciseName} est un exercice efficace pour développer votre force et votre musculature.`,
        instructions: [
          "Placez-vous en position de départ",
          "Effectuez le mouvement de manière contrôlée",
          "Maintenez la tension musculaire",
          "Revenez à la position initiale"
        ],
        muscles_targeted: ["muscles principaux"],
        tips: ["Gardez le dos droit", "Respirez correctement"],
        common_mistakes: ["Mouvement trop rapide", "Mauvaise posture"]
      };
    }

    console.log("Exercise detail generated successfully");

    return new Response(JSON.stringify(exerciseDetail), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Exercise detail error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
