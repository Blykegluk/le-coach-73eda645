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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
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
    const videoPath = `exercise-videos/${normalizedName}.mp4`;

    // Check if video already exists in storage
    const { data: existingFile } = await supabase.storage
      .from('chat-uploads')
      .list('exercise-videos', { search: `${normalizedName}.mp4` });

    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(videoPath);

      console.log(`Video already exists for ${exerciseName}`);
      return new Response(
        JSON.stringify({ video_url: urlData.publicUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating video for exercise: ${exerciseName}`);

    // First, generate a starting frame image using Gemini image generation
    const imagePrompt = `Professional fitness demonstration starting position for "${exerciseName}" exercise. 
Clean gym background, athletic person in proper form showing the starting position. 
Professional lighting, high quality fitness photography style. No text or labels.`;

    console.log("Generating starting frame image...");

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: imagePrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      if (imageResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (imageResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await imageResponse.text();
      console.error("Image generation error:", imageResponse.status, errorText);
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    
    // Check for error in the response (API might return 200 but with error in body)
    const choiceError = imageData.choices?.[0]?.error;
    if (choiceError) {
      console.error("Image generation error in response:", JSON.stringify(choiceError));
      if (choiceError.code === 429 || choiceError.code === 502) {
        return new Response(
          JSON.stringify({ error: "Service temporairement surchargé. Réessaie dans quelques secondes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(choiceError.message || "Image generation failed");
    }
    
    const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image generated:", JSON.stringify(imageData));
      throw new Error("Impossible de générer l'aperçu. Réessaie.");
    }

    console.log("Starting frame generated, now generating video...");

    // Now generate video from the image using video generation
    // Since videogen tool is for the agent, we'll use the image as a still for now
    // and return it as a fallback, or use a video generation API if available

    // For now, let's save the image and return it as a "preview"
    // In production, you'd integrate with a video generation service

    // Extract base64 data from data URL
    const base64Match = generatedImage.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image format");
    }

    const imageBuffer = Uint8Array.from(atob(base64Match[1]), c => c.charCodeAt(0));

    // Save as a preview image for now
    const imagePath = `exercise-videos/${normalizedName}_preview.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-uploads')
      .upload(imagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload preview image");
    }

    const { data: urlData } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(imagePath);

    console.log("Preview image saved successfully");

    // Return the preview image URL
    // Note: In a full implementation, you'd use a video generation service here
    return new Response(
      JSON.stringify({ 
        video_url: urlData.publicUrl,
        type: 'image', // Indicate this is an image preview
        message: "Aperçu de l'exercice généré" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Exercise video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
