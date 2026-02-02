// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// Available tools for the coach
const tools = [
  {
    type: "function",
    function: {
      name: "log_water",
      description: "Enregistre une consommation d'eau pour l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          amount_ml: {
            type: "number",
            description: "Quantité d'eau en millilitres (250 = 1 verre)",
          },
        },
        required: ["amount_ml"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Enregistre un repas pour l'utilisateur avec estimation des macros",
      parameters: {
        type: "object",
        properties: {
          meal_type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Type de repas",
          },
          food_name: {
            type: "string",
            description: "Nom/description du repas",
          },
          calories: {
            type: "number",
            description: "Calories estimées",
          },
          protein: {
            type: "number",
            description: "Protéines estimées en grammes",
          },
          carbs: {
            type: "number",
            description: "Glucides estimés en grammes",
          },
          fat: {
            type: "number",
            description: "Lipides estimés en grammes",
          },
        },
        required: ["meal_type", "food_name", "calories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_summary",
      description: "Récupère le résumé de la journée de l'utilisateur (calories, eau, poids)",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_weight",
      description: "Enregistre le poids de l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          weight_kg: {
            type: "number",
            description: "Poids en kilogrammes",
          },
        },
        required: ["weight_kg"],
      },
    },
  },
];

// Execute tool calls
async function executeToolCall(
  supabase: any,
  userId: string,
  toolCall: ToolCall
): Promise<{ success: boolean; message: string; data?: unknown }> {
  const { name, arguments: argsStr } = toolCall.function;
  const args = JSON.parse(argsStr);
  const today = new Date().toISOString().split("T")[0];

  console.log(`Executing tool: ${name}`, args);

  try {
    switch (name) {
      case "log_water": {
        // Get current water and add to it
        const { data: current } = await supabase
          .from("daily_metrics")
          .select("water_ml")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();

        const currentWater = current?.water_ml || 0;
        const newTotal = currentWater + args.amount_ml;

        const { error } = await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: today,
            water_ml: newTotal,
          },
          { onConflict: "user_id,date" }
        );

        if (error) throw error;
        return {
          success: true,
          message: `💧 ${args.amount_ml}ml d'eau ajoutés (total: ${newTotal}ml)`,
          data: { total: newTotal },
        };
      }

      case "log_meal": {
        const { error } = await supabase.from("nutrition_logs").insert({
          user_id: userId,
          meal_type: args.meal_type,
          food_name: args.food_name,
          calories: args.calories || 0,
          protein: args.protein || 0,
          carbs: args.carbs || 0,
          fat: args.fat || 0,
        });

        if (error) throw error;

        // Also update daily calories
        const { data: currentMetrics } = await supabase
          .from("daily_metrics")
          .select("calories_in")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();

        const currentCals = currentMetrics?.calories_in || 0;
        const newCalories = currentCals + (args.calories || 0);

        await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: today,
            calories_in: newCalories,
          },
          { onConflict: "user_id,date" }
        );

        return {
          success: true,
          message: `🍽️ ${args.food_name} enregistré (${args.calories} kcal)`,
          data: args,
        };
      }

      case "get_daily_summary": {
        const { data: metrics } = await supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();

        const { data: meals } = await supabase
          .from("nutrition_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", `${today}T00:00:00`)
          .lte("logged_at", `${today}T23:59:59`);

        const { data: profile } = await supabase
          .from("profiles")
          .select("target_calories, target_water_ml, target_weight_kg, weight_kg, goal")
          .eq("user_id", userId)
          .maybeSingle();

        return {
          success: true,
          message: "Résumé récupéré",
          data: {
            date: today,
            calories_in: metrics?.calories_in || 0,
            target_calories: profile?.target_calories || 2000,
            water_ml: metrics?.water_ml || 0,
            target_water_ml: profile?.target_water_ml || 2000,
            weight: metrics?.weight || profile?.weight_kg,
            target_weight: profile?.target_weight_kg,
            goal: profile?.goal,
            meals_count: meals?.length || 0,
            meals: meals || [],
          },
        };
      }

      case "log_weight": {
        const { error } = await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: today,
            weight: args.weight_kg,
          },
          { onConflict: "user_id,date" }
        );

        if (error) throw error;

        // Also update profile weight
        await supabase
          .from("profiles")
          .update({ weight_kg: args.weight_kg })
          .eq("user_id", userId);

        return {
          success: true,
          message: `⚖️ Poids enregistré: ${args.weight_kg} kg`,
          data: { weight: args.weight_kg },
        };
      }

      default:
        return { success: false, message: `Outil inconnu: ${name}` };
    }
  } catch (error) {
    console.error(`Error executing ${name}:`, error);
    return {
      success: false,
      message: `Erreur lors de l'exécution de ${name}: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { messages, userId } = (await req.json()) as {
      messages: ChatMessage[];
      userId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Get user profile for context
    let userContext = "";
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, goal, weight_kg, target_weight_kg, height_cm, activity_level")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const goalLabels: Record<string, string> = {
          weight_loss: "perdre du poids",
          fat_loss: "perdre de la masse graisseuse",
          muscle_gain: "prendre du muscle",
          maintain: "maintenir son poids",
          recomposition: "recomposition corporelle",
          wellness: "bien-être général",
        };
        const goalKey = profile.goal || "";
        userContext = `
L'utilisateur s'appelle ${profile.first_name || "l'utilisateur"}.
Son objectif est de ${goalLabels[goalKey] || "améliorer sa santé"}.
${profile.weight_kg ? `Poids actuel: ${profile.weight_kg}kg` : ""}
${profile.target_weight_kg ? `Poids cible: ${profile.target_weight_kg}kg` : ""}
${profile.height_cm ? `Taille: ${profile.height_cm}cm` : ""}
`;
      }
    }

    const systemPrompt = `Tu es un coach santé et fitness bienveillant et motivant. Tu parles français de manière naturelle et encourageante.

${userContext}

Ton rôle:
- Aider l'utilisateur à atteindre ses objectifs de santé
- Enregistrer ses repas, son hydratation et son poids via les outils disponibles
- Donner des conseils personnalisés et motivants
- Être concis mais chaleureux (max 2-3 paragraphes)

Quand l'utilisateur mentionne un repas ou une boisson, utilise l'outil approprié pour l'enregistrer.
Quand il demande son bilan, utilise get_daily_summary puis commente les résultats.
Utilise des emojis avec modération pour rendre la conversation plus vivante 🎯

Important: Après avoir utilisé un outil, confirme l'action de manière naturelle et encourage l'utilisateur.`;

    console.log("Calling AI gateway with", messages.length, "messages");

    // First API call - may include tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: userId ? tools : undefined, // Only enable tools if user is logged in
        tool_choice: userId ? "auto" : undefined,
      }),
    });

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
    console.log("AI response received");

    const assistantMessage = data.choices[0].message;
    const executedActions: { name: string; result: { success: boolean; message: string } }[] = [];

    // Check if there are tool calls to execute
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && userId) {
      console.log("Tool calls detected:", assistantMessage.tool_calls.length);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const result = await executeToolCall(supabase, userId, toolCall);
        executedActions.push({ name: toolCall.function.name, result });
      }

      // Build tool results for follow-up
      const toolResults = assistantMessage.tool_calls.map(
        (tc: ToolCall, idx: number) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(executedActions[idx].result),
        })
      );

      console.log("Calling AI for follow-up after tool execution");

      // Second API call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up AI error:", followUpResponse.status, errorText);
        // Return partial response if follow-up fails
        return new Response(
          JSON.stringify({
            content: executedActions.map((a) => a.result.message).join("\n"),
            actions: executedActions,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const followUpData = await followUpResponse.json();
      return new Response(
        JSON.stringify({
          content: followUpData.choices[0].message.content,
          actions: executedActions,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls - return direct response
    return new Response(
      JSON.stringify({
        content: assistantMessage.content,
        actions: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Coach chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
