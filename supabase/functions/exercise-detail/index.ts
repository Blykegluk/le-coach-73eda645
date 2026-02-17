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

interface WgerData {
  exercise_images: string[];
  muscle_images_main: string[];
  muscle_images_secondary: string[];
  muscles_main: string[];
  muscles_secondary: string[];
}

/**
 * Search wger.de for exercise images AND muscle diagram SVGs
 */
async function fetchWgerData(exerciseName: string): Promise<WgerData> {
  const result: WgerData = {
    exercise_images: [],
    muscle_images_main: [],
    muscle_images_secondary: [],
    muscles_main: [],
    muscles_secondary: [],
  };

  try {
    const nameLower = exerciseName.toLowerCase().trim();
    
    let searchTerm = exerciseName;
    for (const [fr, en] of Object.entries(exerciseTranslations)) {
      if (nameLower.includes(fr)) {
        searchTerm = en;
        break;
      }
    }

    console.log(`Searching wger for: "${searchTerm}" (original: "${exerciseName}")`);

    const searchUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(searchTerm)}&language=en&format=json`;
    const searchRes = await fetch(searchUrl, { headers: { "Accept": "application/json" } });

    if (!searchRes.ok) return result;

    const searchData = await searchRes.json();
    const suggestions = searchData?.suggestions || [];
    
    if (suggestions.length === 0) return result;

    const firstSuggestion = suggestions[0];
    const baseId = firstSuggestion?.data?.base_id;

    if (!baseId) return result;

    // Fetch exerciseinfo which has images + muscle data
    console.log(`Fetching exerciseinfo for base_id: ${baseId}`);
    const infoUrl = `https://wger.de/api/v2/exerciseinfo/${baseId}/?format=json`;
    const infoRes = await fetch(infoUrl, { headers: { "Accept": "application/json" } });
    
    if (!infoRes.ok) return result;

    const infoData = await infoRes.json();

    // Exercise images (positions)
    if (infoData?.images?.length > 0) {
      for (const img of infoData.images) {
        if (img?.image) {
          result.exercise_images.push(img.image);
        }
      }
    }

    // Muscle images (SVG diagrams from wger) - main
    if (infoData?.muscles?.length > 0) {
      for (const muscle of infoData.muscles) {
        if (muscle?.image_url_main) {
          const url = muscle.image_url_main.startsWith("http") 
            ? muscle.image_url_main 
            : `https://wger.de${muscle.image_url_main}`;
          if (!result.muscle_images_main.includes(url)) {
            result.muscle_images_main.push(url);
          }
        }
        // Get muscle name
        const muscleName = muscle?.name_en || muscle?.name || "";
        if (muscleName) result.muscles_main.push(muscleName);
      }
    }

    // Secondary muscles
    if (infoData?.muscles_secondary?.length > 0) {
      for (const muscle of infoData.muscles_secondary) {
        if (muscle?.image_url_secondary) {
          const url = muscle.image_url_secondary.startsWith("http")
            ? muscle.image_url_secondary
            : `https://wger.de${muscle.image_url_secondary}`;
          if (!result.muscle_images_secondary.includes(url)) {
            result.muscle_images_secondary.push(url);
          }
        }
        const muscleName = muscle?.name_en || muscle?.name || "";
        if (muscleName) result.muscles_secondary.push(muscleName);
      }
    }

    console.log(`wger data: ${result.exercise_images.length} exercise imgs, ${result.muscle_images_main.length} main muscle imgs, ${result.muscle_images_secondary.length} secondary muscle imgs`);
    return result;
  } catch (err) {
    console.error("wger fetch error:", err);
    return result;
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

    // Fetch AI details and wger data in parallel
    const [aiDetail, wgerData] = await Promise.all([
      (async () => {
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
      })(),
      fetchWgerData(exerciseName),
    ]);

    const result = {
      how_to: aiDetail.how_to,
      key_points: aiDetail.key_points,
      muscles_targeted: aiDetail.muscles_targeted,
      exercise_images: wgerData.exercise_images.slice(0, 2),
      muscle_images_main: wgerData.muscle_images_main,
      muscle_images_secondary: wgerData.muscle_images_secondary,
    };

    console.log("Exercise detail generated successfully");

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
