import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common exercise name translations (FR → EN) for wger search
const exerciseTranslations: Record<string, string> = {
  "développé couché": "bench press",
  "développé incliné": "incline bench press",
  "développé décliné": "decline bench press",
  "développé militaire": "military press",
  "développé haltères": "dumbbell press",
  "squat": "squat",
  "squat avant": "front squat",
  "squat bulgare": "bulgarian split squat",
  "fente": "lunge",
  "fentes": "lunges",
  "soulevé de terre": "deadlift",
  "rowing": "barbell row",
  "rowing barre": "barbell row",
  "rowing haltère": "dumbbell row",
  "tirage vertical": "lat pulldown",
  "tirage horizontal": "seated cable row",
  "tirage poitrine": "lat pulldown",
  "traction": "pull up",
  "tractions": "pull ups",
  "pompe": "push up",
  "pompes": "push ups",
  "dips": "dips",
  "curl biceps": "bicep curl",
  "curl haltères": "dumbbell curl",
  "curl barre": "barbell curl",
  "curl marteau": "hammer curl",
  "extension triceps": "tricep extension",
  "triceps poulie": "tricep pushdown",
  "élévation latérale": "lateral raise",
  "élévations latérales": "lateral raise",
  "oiseau": "reverse fly",
  "oiseau haltères": "reverse fly",
  "presse à cuisses": "leg press",
  "leg press": "leg press",
  "leg curl": "leg curl",
  "leg extension": "leg extension",
  "hip thrust": "hip thrust",
  "mollets": "calf raise",
  "crunch": "crunch",
  "crunches": "crunches",
  "gainage": "plank",
  "planche": "plank",
  "abdos": "crunches",
  "pec deck": "pec deck",
  "butterfly": "butterfly",
  "écarté": "chest fly",
  "écartés": "chest fly",
  "écarté haltères": "dumbbell fly",
  "presse épaules": "shoulder press",
  "shrug": "shrugs",
  "face pull": "face pull",
  "good morning": "good morning",
  "hack squat": "hack squat",
  "machine convergente": "chest press machine",
  "poulie haute": "cable crossover",
  "poulie basse": "cable curl",
};

/**
 * Search wger.de for exercise images using multiple strategies
 */
async function fetchWgerImages(exerciseName: string): Promise<string[]> {
  try {
    const nameLower = exerciseName.toLowerCase().trim();
    
    // Try to find English translation
    let searchTerm = exerciseName;
    for (const [fr, en] of Object.entries(exerciseTranslations)) {
      if (nameLower.includes(fr)) {
        searchTerm = en;
        break;
      }
    }

    console.log(`Searching wger for: "${searchTerm}" (original: "${exerciseName}")`);

    // Use the search endpoint which returns exercise IDs with base_id
    const searchUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(searchTerm)}&language=en&format=json`;
    const searchRes = await fetch(searchUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!searchRes.ok) {
      console.error("wger search failed:", searchRes.status);
      return [];
    }

    const searchData = await searchRes.json();
    console.log("wger search keys:", Object.keys(searchData));
    
    // The search endpoint returns { suggestions: [...] } where each has data.id (exercise ID) and data.base_id
    const suggestions = searchData?.suggestions || [];
    
    if (suggestions.length === 0) {
      console.log("No wger search results found");
      return [];
    }

    // Log first suggestion structure for debugging
    console.log("First suggestion:", JSON.stringify(suggestions[0]).slice(0, 500));

    // The suggestion has data.base_id (exercise base for fetching images via exerciseinfo)
    // and data.image which is a direct image path
    const firstSuggestion = suggestions[0];
    const baseId = firstSuggestion?.data?.base_id;
    
    // Collect direct images from suggestions that match the same base
    const directImages: string[] = [];
    for (const s of suggestions) {
      if (s?.data?.base_id === baseId && s?.data?.image) {
        const imgPath = s.data.image;
        const fullUrl = imgPath.startsWith("http") ? imgPath : `https://wger.de${imgPath}`;
        if (!directImages.includes(fullUrl)) {
          directImages.push(fullUrl);
        }
      }
    }

    // Also fetch from exerciseinfo which has all images for this exercise base
    if (baseId) {
      console.log(`Fetching exerciseinfo for base_id: ${baseId}`);
      const infoUrl = `https://wger.de/api/v2/exerciseinfo/${baseId}/?format=json`;
      const infoRes = await fetch(infoUrl, { headers: { "Accept": "application/json" } });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData?.images && infoData.images.length > 0) {
          for (const img of infoData.images) {
            const imgUrl = img?.image;
            if (imgUrl && !directImages.includes(imgUrl)) {
              directImages.push(imgUrl);
            }
          }
          console.log(`Found ${infoData.images.length} images from exerciseinfo, total: ${directImages.length}`);
        }
      }
    }

    console.log(`Returning ${directImages.length} wger images`);
    return directImages.slice(0, 4);
  } catch (err) {
    console.error("wger image fetch error:", err);
    return [];
  }
}

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

    // Fetch AI details and wger images in parallel
    const [aiDetailPromise, wgerImagesPromise] = [
      (async () => {
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
            throw new Error("rate_limit");
          }
          const errorText = await response.text();
          console.error("Gemini API error:", response.status, errorText);
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) throw new Error("No content from AI");

        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          const jsonStr = jsonMatch[1].trim();
          return JSON.parse(jsonStr);
        } catch {
          console.error("Failed to parse AI response:", content);
          return {
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
      })(),
      fetchWgerImages(exerciseName),
    ];

    const [exerciseDetail, wgerImages] = await Promise.all([aiDetailPromise, wgerImagesPromise]);

    // Merge wger images into the response
    if (wgerImages.length > 0) {
      exerciseDetail.wger_images = wgerImages;
    }

    console.log("Exercise detail generated successfully, wger images:", wgerImages.length);

    return new Response(JSON.stringify(exerciseDetail), {
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
