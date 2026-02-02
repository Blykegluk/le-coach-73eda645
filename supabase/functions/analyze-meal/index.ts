import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MealAnalysis {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { description, mealType, imageUrl, userId } = await req.json();

    if (!description && !imageUrl) {
      throw new Error("Description ou image requise");
    }

    if (!userId) {
      throw new Error("Utilisateur non identifié");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Analyzing meal for user ${userId}: ${description || 'image'}`);

    // Build the prompt for Gemini
    const systemPrompt = `Tu es un nutritionniste expert. Analyse la description du repas fournie et retourne une estimation précise des valeurs nutritionnelles.

IMPORTANT: Tu dois UNIQUEMENT appeler la fonction analyze_meal avec les données structurées. Ne réponds pas en texte.

Règles d'estimation:
- Sois réaliste avec les portions françaises standards
- Pour les aliments peu clairs, fais une estimation raisonnable basée sur une portion moyenne
- Arrondis les calories au nombre entier le plus proche
- Arrondis les macros à 1 décimale

Exemples de références (pour 100g):
- Poulet grillé: 165 kcal, 31g protéines, 0g glucides, 3.6g lipides
- Riz blanc cuit: 130 kcal, 2.7g protéines, 28g glucides, 0.3g lipides
- Œuf entier: 155 kcal, 13g protéines, 1.1g glucides, 11g lipides
- Pain complet: 247 kcal, 13g protéines, 41g glucides, 3.4g lipides
- Shaker whey (30g): 120 kcal, 24g protéines, 2g glucides, 1.5g lipides`;

    const userMessage = imageUrl
      ? `Analyse cette image de repas et estime les valeurs nutritionnelles.`
      : `Analyse ce repas et estime les valeurs nutritionnelles: "${description}"`;

    // Prepare messages with optional image
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt },
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    // Call Lovable AI Gateway with tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_meal",
              description: "Enregistre l'analyse nutritionnelle d'un repas",
              parameters: {
                type: "object",
                properties: {
                  food_name: {
                    type: "string",
                    description: "Nom descriptif et concis du repas (ex: '3 œufs au plat avec pain complet')",
                  },
                  calories: {
                    type: "number",
                    description: "Calories totales estimées (kcal)",
                  },
                  protein: {
                    type: "number",
                    description: "Protéines en grammes",
                  },
                  carbs: {
                    type: "number",
                    description: "Glucides en grammes",
                  },
                  fat: {
                    type: "number",
                    description: "Lipides en grammes",
                  },
                },
                required: ["food_name", "calories", "protein", "carbs", "fat"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_meal" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques secondes" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_meal") {
      console.error("No valid tool call in response:", aiData);
      throw new Error("L'IA n'a pas pu analyser ce repas");
    }

    const analysis: MealAnalysis = JSON.parse(toolCall.function.arguments);
    console.log("Parsed analysis:", analysis);

    // Save to nutrition_logs
    const { data: nutritionLog, error: insertError } = await supabase
      .from("nutrition_logs")
      .insert({
        user_id: userId,
        meal_type: mealType || "snack",
        food_name: analysis.food_name,
        calories: Math.round(analysis.calories),
        protein: Math.round(analysis.protein * 10) / 10,
        carbs: Math.round(analysis.carbs * 10) / 10,
        fat: Math.round(analysis.fat * 10) / 10,
        photo_url: imageUrl || null,
        ai_analysis_json: analysis,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Erreur lors de l'enregistrement du repas");
    }

    console.log("Meal saved successfully:", nutritionLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${analysis.food_name} enregistré (${analysis.calories} kcal)`,
        data: nutritionLog,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analyze meal error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
