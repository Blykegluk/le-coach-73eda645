import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generate a SINGLE image containing both start and end positions side by side
 * This ensures visual coherence (same person, same style, same angle)
 */
async function generatePositionsImage(exerciseName: string, apiKey: string): Promise<string | null> {
  try {
    const prompt = `Generate a single wide illustration showing TWO positions of the exercise "${exerciseName}" side by side:
- LEFT side: the starting position
- RIGHT side: the ending/contracted position
Same person, same angle, same style throughout. The style should be like a professional fitness anatomy textbook (Strength Training Anatomy by Frederic Delavier): realistic human body proportions, visible muscle definition and shading, semi-transparent skin showing underlying engaged muscles. 3/4 or side view, plain white background. An arrow or visual flow from left to right showing the movement progression. No text, no labels. Clean, high-quality, detailed anatomical drawing. Wide landscape format.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Gemini positions image error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return part.inlineData.data; // raw base64 without prefix
      }
    }
    return null;
  } catch (err) {
    console.error("Gemini positions image failed:", err);
    return null;
  }
}

/**
 * Generate a muscle diagram showing targeted muscles
 */
async function generateMuscleDiagram(exerciseName: string, muscles: string[], apiKey: string): Promise<string | null> {
  const muscleList = muscles.length > 0 ? muscles.join(", ") : "main muscles";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an anatomical muscle map illustration showing the muscles targeted during the exercise "${exerciseName}". Targeted muscles: ${muscleList}. Style: two human body silhouettes side by side (front view and back view), with the targeted muscles highlighted in bright red/orange color, and the rest of the body in light gray. Realistic anatomical muscle rendering, like a fitness anatomy textbook (Frederic Delavier style). White background. No text, no labels. Clean, professional, detailed.` }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Gemini muscle diagram error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (err) {
    console.error("Gemini muscle diagram failed:", err);
    return null;
  }
}

/**
 * Upload raw base64 image data to Supabase Storage, return public URL
 */
async function uploadToStorage(
  supabase: any,
  base64Data: string,
  path: string
): Promise<string | null> {
  try {
    // Convert base64 to Uint8Array using chunks to avoid stack overflow
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from("chat-uploads")
      .upload(path, bytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from("chat-uploads")
      .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
    if (signError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signError);
      return null;
    }
    return signedData.signedUrl;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { exerciseName } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: "Le nom de l'exercice est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedName = exerciseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

    console.log(`Generating exercise detail for: ${exerciseName}`);

    // Check if images already exist in storage
    const positionsPath = `exercise-images/${normalizedName}_positions.png`;
    const musclePath = `exercise-images/${normalizedName}_muscles.png`;

    const { data: existingFiles } = await supabase.storage
      .from("chat-uploads")
      .list("exercise-images", { search: normalizedName });

    const hasPositions = existingFiles?.some((f: any) => f.name === `${normalizedName}_positions.png`);
    const hasMuscles = existingFiles?.some((f: any) => f.name === `${normalizedName}_muscles.png`);

    // Step 1: Get AI text details (need muscles for diagram)
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

    // Step 2: Generate images (only if not already in storage)
    let positionsUrl: string | null = null;
    let muscleUrl: string | null = null;

    if (hasPositions) {
      const { data } = await supabase.storage.from("chat-uploads").createSignedUrl(positionsPath, 60 * 60 * 24 * 30);
      positionsUrl = data?.signedUrl || null;
    }
    if (hasMuscles) {
      const { data } = await supabase.storage.from("chat-uploads").createSignedUrl(musclePath, 60 * 60 * 24 * 30);
      muscleUrl = data?.signedUrl || null;
    }

    if (!hasPositions || !hasMuscles) {
      console.log("Generating exercise illustrations via Gemini...");
      const [positionsBase64, muscleBase64] = await Promise.all([
        !hasPositions ? generatePositionsImage(exerciseName, GEMINI_API_KEY) : Promise.resolve(null),
        !hasMuscles ? generateMuscleDiagram(exerciseName, aiDetail.muscles_targeted || [], GEMINI_API_KEY) : Promise.resolve(null),
      ]);

      // Upload to storage in parallel
      const [uploadedPositions, uploadedMuscle] = await Promise.all([
        positionsBase64 ? uploadToStorage(supabase, positionsBase64, positionsPath) : Promise.resolve(null),
        muscleBase64 ? uploadToStorage(supabase, muscleBase64, musclePath) : Promise.resolve(null),
      ]);

      if (uploadedPositions) positionsUrl = uploadedPositions;
      if (uploadedMuscle) muscleUrl = uploadedMuscle;
    }

    const result = {
      how_to: aiDetail.how_to,
      key_points: aiDetail.key_points,
      muscles_targeted: aiDetail.muscles_targeted,
      // Now returns a single coherent positions image URL instead of 2 separate base64
      positions_image: positionsUrl,
      muscle_diagram: muscleUrl,
      // Keep backward compat
      exercise_images: positionsUrl ? [positionsUrl] : [],
    };

    console.log(`Exercise detail generated: positions=${!!positionsUrl}, muscles=${!!muscleUrl}`);

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
