import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      throw new Error("Supabase or GEMINI_API_KEY configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { exerciseName } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: "Le nom de l'exercice est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize exercise name for storage
    const normalizedName = exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    // Check if images already exist in storage
    const { data: existingFiles } = await supabase.storage
      .from('chat-uploads')
      .list('exercise-images', { search: normalizedName });

    const existingImages = existingFiles?.filter(f => f.name.startsWith(normalizedName)) || [];
    
    if (existingImages.length >= 3) {
      // Return existing images
      const imageUrls = existingImages
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 3)
        .map(f => {
          const { data } = supabase.storage.from('chat-uploads').getPublicUrl(`exercise-images/${f.name}`);
          return data.publicUrl;
        });

      console.log(`Images already exist for ${exerciseName}`);
      return new Response(
        JSON.stringify({ images: imageUrls, type: 'images' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating images for exercise: ${exerciseName}`);

    // Generate 3 images: start position, movement, end position
    const phases = [
      { name: "start", prompt: `Starting position for "${exerciseName}" exercise. Athletic person in proper starting form, clean gym background, professional fitness photography. Show the initial stance before the movement begins. No text.` },
      { name: "mid", prompt: `Middle/movement phase of "${exerciseName}" exercise. Athletic person in the middle of the movement, showing proper technique and muscle engagement. Clean gym background, professional fitness photography. No text.` },
      { name: "end", prompt: `End/final position of "${exerciseName}" exercise. Athletic person at the peak of the movement or return position. Clean gym background, professional fitness photography. No text.` },
    ];

    const generatedUrls: string[] = [];

    for (const phase of phases) {
      console.log(`Generating ${phase.name} phase image...`);

      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: phase.prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        }
      );

      if (!imageResponse.ok) {
        if (imageResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Trop de requêtes, réessaie dans un moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await imageResponse.text();
        console.error("Image generation error:", imageResponse.status, errorText);
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      
      // Extract base64 image from Gemini response
      const imagePart = imageData.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      const generatedImage = imagePart ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` : null;

      if (!generatedImage) {
        console.error("No image generated for phase:", phase.name);
        throw new Error(`Impossible de générer l'image (${phase.name}). Réessaie.`);
      }

      // Extract base64 data from data URL
      const base64Match = generatedImage.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (!base64Match) {
        throw new Error("Invalid image format");
      }

      const imageBuffer = Uint8Array.from(atob(base64Match[1]), c => c.charCodeAt(0));
      const imagePath = `exercise-images/${normalizedName}_${phase.name}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(imagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload image");
      }

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(imagePath);

      generatedUrls.push(urlData.publicUrl);
      console.log(`${phase.name} phase image saved successfully`);
    }

    return new Response(
      JSON.stringify({ 
        images: generatedUrls,
        type: 'images',
        message: "Images de démonstration générées" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Exercise images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
