import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generate exercise position illustrations using Gemini image generation
 * Returns 2 base64 images: start position and end position
 */
async function generateExerciseImages(exerciseName: string, apiKey: string): Promise<string[]> {
  const images: string[] = [];
  
  const positions = [
    `starting position`,
    `ending/contracted position`,
  ];

  for (const positionDesc of positions) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Generate a realistic anatomical illustration of a muscular male figure performing the ${positionDesc} of the exercise "${exerciseName}". The style should be like a professional fitness anatomy textbook: realistic human body proportions, visible muscle definition and shading, semi-transparent skin showing the underlying muscle groups engaged. The figure should be shown from a 3/4 or side view against a plain white background. No text, no labels, no equipment labels. Clean, high-quality, detailed anatomical drawing style similar to Strength Training Anatomy by Frederic Delavier.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        console.error(`Image gen error for "${positionDesc}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        images.push(imageUrl);
      }
    } catch (err) {
      console.error(`Image gen failed for "${positionDesc}":`, err);
    }
  }

  return images;
}

/**
 * Generate a muscle diagram showing targeted muscles
 */
async function generateMuscleDiagram(exerciseName: string, muscles: string[], apiKey: string): Promise<string | null> {
  try {
    const muscleList = muscles.length > 0 ? muscles.join(", ") : "muscles principaux";
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate an anatomical muscle map illustration showing the muscles targeted during the exercise "${exerciseName}". Targeted muscles: ${muscleList}. Style: two human body silhouettes side by side (front view and back view), with the targeted muscles highlighted in bright red/orange color, and the rest of the body in light gray. Realistic anatomical muscle rendering, like a fitness anatomy textbook (Frederic Delavier style). White background. No text, no labels. Clean, professional, detailed.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`Muscle diagram gen error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch (err) {
    console.error("Muscle diagram gen failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { exerciseName } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: "Le nom de l'exercice est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating exercise detail for: ${exerciseName}`);

    // Step 1: Get AI text details first (we need muscles list for the diagram)
    const aiDetail = await (async () => {
      const systemPrompt = `Tu es un coach fitness expert. Réponds UNIQUEMENT avec un JSON valide, sans markdown.

Format EXACT:
{
  "how_to": "Explication concise en 2-3 phrases de comment réaliser l'exercice correctement.",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "muscles_targeted": ["muscle principal 1", "muscle principal 2"]
}

Règles:
- "how_to": 2-3 phrases maximum, va droit au but
- "key_points": exactement 3 points d'attention essentiels (sécurité, posture, respiration)
- "muscles_targeted": 2-4 muscles en français
- Tout en français, langage simple et direct`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\nExercice: "${exerciseName}"` }] },
            ],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) throw new Error("rate_limit");
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("No content from AI");

      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return {
          how_to: `${exerciseName} : placez-vous en position de départ, effectuez le mouvement de manière contrôlée, puis revenez lentement.`,
          key_points: ["Gardez le dos droit", "Respirez correctement", "Contrôlez le mouvement"],
          muscles_targeted: ["muscles principaux"],
        };
      }
    })();

    // Step 2: Generate all images in parallel using Lovable AI gateway
    console.log("Generating uniform exercise illustrations via AI...");
    const [exerciseImages, muscleDiagram] = await Promise.all([
      generateExerciseImages(exerciseName, LOVABLE_API_KEY),
      generateMuscleDiagram(exerciseName, aiDetail.muscles_targeted || [], LOVABLE_API_KEY),
    ]);

    const result = {
      how_to: aiDetail.how_to,
      key_points: aiDetail.key_points,
      muscles_targeted: aiDetail.muscles_targeted,
      exercise_images: exerciseImages,
      muscle_diagram: muscleDiagram,
    };

    console.log(`Exercise detail generated: ${exerciseImages.length} position imgs, muscle diagram: ${!!muscleDiagram}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Exercise detail error:", error);
    
    if (error instanceof Error && error.message === "rate_limit") {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes, réessaie dans un moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
