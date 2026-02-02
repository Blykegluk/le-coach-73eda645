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
      description: "Enregistre un NOUVEAU repas pour l'utilisateur. Ne pas utiliser pour modifier un repas existant.",
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
      name: "get_recent_meals",
      description: "Récupère les repas récents de l'utilisateur pour pouvoir les modifier ou vérifier ce qui a été enregistré",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de repas à récupérer (défaut: 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_meal",
      description: "Modifie un repas existant. Utiliser get_recent_meals d'abord pour obtenir l'ID du repas.",
      parameters: {
        type: "object",
        properties: {
          meal_id: {
            type: "string",
            description: "ID du repas à modifier (obtenu via get_recent_meals)",
          },
          food_name: {
            type: "string",
            description: "Nouveau nom/description du repas (optionnel)",
          },
          calories: {
            type: "number",
            description: "Nouvelles calories (optionnel)",
          },
          protein: {
            type: "number",
            description: "Nouvelles protéines en grammes (optionnel)",
          },
          carbs: {
            type: "number",
            description: "Nouveaux glucides en grammes (optionnel)",
          },
          fat: {
            type: "number",
            description: "Nouveaux lipides en grammes (optionnel)",
          },
        },
        required: ["meal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_meal",
      description: "Supprime un repas existant. Utiliser get_recent_meals d'abord pour obtenir l'ID.",
      parameters: {
        type: "object",
        properties: {
          meal_id: {
            type: "string",
            description: "ID du repas à supprimer",
          },
        },
        required: ["meal_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_activities",
      description: "Récupère les activités sportives récentes de l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre d'activités à récupérer (défaut: 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_activity",
      description: "Modifie une activité sportive existante",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "ID de l'activité à modifier",
          },
          activity_type: {
            type: "string",
            description: "Nouveau type d'activité (optionnel)",
          },
          duration_min: {
            type: "number",
            description: "Nouvelle durée en minutes (optionnel)",
          },
          calories_burned: {
            type: "number",
            description: "Nouvelles calories brûlées (optionnel)",
          },
          distance_km: {
            type: "number",
            description: "Nouvelle distance en km (optionnel)",
          },
          notes: {
            type: "string",
            description: "Nouvelles notes (optionnel)",
          },
        },
        required: ["activity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_activity",
      description: "Supprime une activité sportive existante",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "ID de l'activité à supprimer",
          },
        },
        required: ["activity_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_summary",
      description: "Récupère le résumé de la journée de l'utilisateur (calories, eau, poids, repas, activités)",
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
  {
    type: "function",
    function: {
      name: "log_activity",
      description: "Enregistre une NOUVELLE séance de sport. Ne pas utiliser pour modifier une activité existante.",
      parameters: {
        type: "object",
        properties: {
          activity_type: {
            type: "string",
            description: "Type d'activité (ex: course, musculation, natation, vélo, yoga, marche, HIIT, crossfit, etc.)",
          },
          duration_min: {
            type: "number",
            description: "Durée de l'activité en minutes",
          },
          calories_burned: {
            type: "number",
            description: "Calories brûlées estimées (optionnel)",
          },
          distance_km: {
            type: "number",
            description: "Distance parcourue en km (optionnel, pour course/vélo/marche)",
          },
          notes: {
            type: "string",
            description: "Notes ou détails supplémentaires sur la séance",
          },
        },
        required: ["activity_type", "duration_min"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_body_fat",
      description: "Enregistre le pourcentage de masse grasse de l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          body_fat_pct: {
            type: "number",
            description: "Pourcentage de masse grasse (ex: 18.5)",
          },
        },
        required: ["body_fat_pct"],
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

      case "get_recent_meals": {
        const limit = args.limit || 5;
        const { data: meals, error } = await supabase
          .from("nutrition_logs")
          .select("id, food_name, meal_type, calories, protein, carbs, fat, logged_at")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        const formattedMeals = (meals || []).map((m: any) => ({
          id: m.id,
          food_name: m.food_name,
          meal_type: m.meal_type,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          logged_at: m.logged_at,
          time_ago: getTimeAgo(m.logged_at),
        }));

        return {
          success: true,
          message: `${formattedMeals.length} repas récent(s) trouvé(s)`,
          data: formattedMeals,
        };
      }

      case "update_meal": {
        // First get the current meal to calculate calorie difference
        const { data: currentMeal } = await supabase
          .from("nutrition_logs")
          .select("calories, food_name")
          .eq("id", args.meal_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!currentMeal) {
          return { success: false, message: "Repas non trouvé" };
        }

        const updates: any = {};
        if (args.food_name !== undefined) updates.food_name = args.food_name;
        if (args.calories !== undefined) updates.calories = args.calories;
        if (args.protein !== undefined) updates.protein = args.protein;
        if (args.carbs !== undefined) updates.carbs = args.carbs;
        if (args.fat !== undefined) updates.fat = args.fat;

        const { error } = await supabase
          .from("nutrition_logs")
          .update(updates)
          .eq("id", args.meal_id)
          .eq("user_id", userId);

        if (error) throw error;

        // Update daily calories if calories changed
        if (args.calories !== undefined && args.calories !== currentMeal.calories) {
          const calorieDiff = args.calories - (currentMeal.calories || 0);
          const { data: metrics } = await supabase
            .from("daily_metrics")
            .select("calories_in")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          const newCalories = (metrics?.calories_in || 0) + calorieDiff;
          await supabase.from("daily_metrics").upsert(
            { user_id: userId, date: today, calories_in: Math.max(0, newCalories) },
            { onConflict: "user_id,date" }
          );
        }

        return {
          success: true,
          message: `✏️ "${currentMeal.food_name}" mis à jour${args.protein ? ` (${args.protein}g protéines)` : ""}`,
          data: updates,
        };
      }

      case "delete_meal": {
        // Get meal calories before deleting
        const { data: meal } = await supabase
          .from("nutrition_logs")
          .select("calories, food_name")
          .eq("id", args.meal_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!meal) {
          return { success: false, message: "Repas non trouvé" };
        }

        const { error } = await supabase
          .from("nutrition_logs")
          .delete()
          .eq("id", args.meal_id)
          .eq("user_id", userId);

        if (error) throw error;

        // Update daily calories
        if (meal.calories) {
          const { data: metrics } = await supabase
            .from("daily_metrics")
            .select("calories_in")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          const newCalories = (metrics?.calories_in || 0) - meal.calories;
          await supabase.from("daily_metrics").upsert(
            { user_id: userId, date: today, calories_in: Math.max(0, newCalories) },
            { onConflict: "user_id,date" }
          );
        }

        return {
          success: true,
          message: `🗑️ "${meal.food_name}" supprimé`,
        };
      }

      case "get_recent_activities": {
        const limit = args.limit || 5;
        const { data: activities, error } = await supabase
          .from("activities")
          .select("id, activity_type, duration_min, calories_burned, distance_km, notes, performed_at")
          .eq("user_id", userId)
          .order("performed_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        const formattedActivities = (activities || []).map((a: any) => ({
          id: a.id,
          activity_type: a.activity_type,
          duration_min: a.duration_min,
          calories_burned: a.calories_burned,
          distance_km: a.distance_km,
          notes: a.notes,
          performed_at: a.performed_at,
          time_ago: getTimeAgo(a.performed_at),
        }));

        return {
          success: true,
          message: `${formattedActivities.length} activité(s) récente(s) trouvée(s)`,
          data: formattedActivities,
        };
      }

      case "update_activity": {
        const { data: currentActivity } = await supabase
          .from("activities")
          .select("activity_type, calories_burned")
          .eq("id", args.activity_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!currentActivity) {
          return { success: false, message: "Activité non trouvée" };
        }

        const updates: any = {};
        if (args.activity_type !== undefined) updates.activity_type = args.activity_type;
        if (args.duration_min !== undefined) updates.duration_min = args.duration_min;
        if (args.calories_burned !== undefined) updates.calories_burned = args.calories_burned;
        if (args.distance_km !== undefined) updates.distance_km = args.distance_km;
        if (args.notes !== undefined) updates.notes = args.notes;

        const { error } = await supabase
          .from("activities")
          .update(updates)
          .eq("id", args.activity_id)
          .eq("user_id", userId);

        if (error) throw error;

        // Update daily calories burned if changed
        if (args.calories_burned !== undefined && args.calories_burned !== currentActivity.calories_burned) {
          const calorieDiff = args.calories_burned - (currentActivity.calories_burned || 0);
          const { data: metrics } = await supabase
            .from("daily_metrics")
            .select("calories_burned")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          const newBurned = (metrics?.calories_burned || 0) + calorieDiff;
          await supabase.from("daily_metrics").upsert(
            { user_id: userId, date: today, calories_burned: Math.max(0, newBurned) },
            { onConflict: "user_id,date" }
          );
        }

        return {
          success: true,
          message: `✏️ ${currentActivity.activity_type} mis à jour`,
          data: updates,
        };
      }

      case "delete_activity": {
        const { data: activity } = await supabase
          .from("activities")
          .select("activity_type, calories_burned")
          .eq("id", args.activity_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!activity) {
          return { success: false, message: "Activité non trouvée" };
        }

        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", args.activity_id)
          .eq("user_id", userId);

        if (error) throw error;

        // Update daily calories burned
        if (activity.calories_burned) {
          const { data: metrics } = await supabase
            .from("daily_metrics")
            .select("calories_burned")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          const newBurned = (metrics?.calories_burned || 0) - activity.calories_burned;
          await supabase.from("daily_metrics").upsert(
            { user_id: userId, date: today, calories_burned: Math.max(0, newBurned) },
            { onConflict: "user_id,date" }
          );
        }

        return {
          success: true,
          message: `🗑️ ${activity.activity_type} supprimé`,
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

        const { data: activities } = await supabase
          .from("activities")
          .select("*")
          .eq("user_id", userId)
          .gte("performed_at", `${today}T00:00:00`)
          .lte("performed_at", `${today}T23:59:59`);

        const { data: profile } = await supabase
          .from("profiles")
          .select("target_calories, target_water_ml, target_weight_kg, weight_kg, goal, current_body_fat_pct, target_body_fat_pct")
          .eq("user_id", userId)
          .maybeSingle();

        // Get latest body fat from daily metrics
        const { data: latestBodyFat } = await supabase
          .from("daily_metrics")
          .select("body_fat_pct, date")
          .eq("user_id", userId)
          .not("body_fat_pct", "is", null)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          success: true,
          message: "Résumé récupéré",
          data: {
            date: today,
            calories_in: metrics?.calories_in || 0,
            calories_burned: metrics?.calories_burned || 0,
            target_calories: profile?.target_calories || 2000,
            water_ml: metrics?.water_ml || 0,
            target_water_ml: profile?.target_water_ml || 2000,
            weight: metrics?.weight || profile?.weight_kg,
            target_weight: profile?.target_weight_kg,
            goal: profile?.goal,
            current_body_fat_pct: profile?.current_body_fat_pct,
            target_body_fat_pct: profile?.target_body_fat_pct,
            latest_body_fat: latestBodyFat?.body_fat_pct,
            latest_body_fat_date: latestBodyFat?.date,
            meals_count: meals?.length || 0,
            meals: meals || [],
            activities_count: activities?.length || 0,
            activities: activities || [],
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

      case "log_activity": {
        const { error } = await supabase.from("activities").insert({
          user_id: userId,
          activity_type: args.activity_type,
          duration_min: args.duration_min,
          calories_burned: args.calories_burned || null,
          distance_km: args.distance_km || null,
          notes: args.notes || null,
          performed_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Also update daily calories burned
        if (args.calories_burned) {
          const { data: currentMetrics } = await supabase
            .from("daily_metrics")
            .select("calories_burned")
            .eq("user_id", userId)
            .eq("date", today)
            .maybeSingle();

          const currentBurned = currentMetrics?.calories_burned || 0;
          const newBurned = currentBurned + args.calories_burned;

          await supabase.from("daily_metrics").upsert(
            {
              user_id: userId,
              date: today,
              calories_burned: newBurned,
            },
            { onConflict: "user_id,date" }
          );
        }

        return {
          success: true,
          message: `🏋️ ${args.activity_type} enregistré (${args.duration_min} min${args.calories_burned ? `, ~${args.calories_burned} kcal brûlées` : ""})`,
          data: args,
        };
      }

      case "log_body_fat": {
        const { error } = await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: today,
            body_fat_pct: args.body_fat_pct,
          },
          { onConflict: "user_id,date" }
        );

        if (error) throw error;

        // Get profile goal info for progress feedback
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_body_fat_pct, target_body_fat_pct")
          .eq("user_id", userId)
          .maybeSingle();

        let progressMsg = "";
        if (profile?.current_body_fat_pct && profile?.target_body_fat_pct) {
          const start = profile.current_body_fat_pct;
          const target = profile.target_body_fat_pct;
          const current = args.body_fat_pct;
          const totalToLose = start - target;
          const lost = start - current;
          const progressPct = Math.round((lost / totalToLose) * 100);
          
          if (progressPct > 0 && progressPct <= 100) {
            progressMsg = ` Tu as atteint ${progressPct}% de ton objectif ! (${start}% → ${current}% → ${target}%)`;
          } else if (current <= target) {
            progressMsg = " 🎉 Tu as atteint ton objectif !";
          }
        }

        return {
          success: true,
          message: `📊 Masse grasse enregistrée: ${args.body_fat_pct}%${progressMsg}`,
          data: { body_fat_pct: args.body_fat_pct },
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

// Helper function to format time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return "hier";
  return `il y a ${diffDays} jours`;
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
        .select("first_name, goal, weight_kg, target_weight_kg, height_cm, activity_level, current_body_fat_pct, target_body_fat_pct")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const goalLabels: Record<string, string> = {
          weight_loss: "perdre du poids",
          fat_loss: "perdre de la masse graisseuse",
          muscle_gain: "prendre du muscle",
          maintain: "maintenir son poids",
          recomposition: "recomposition corporelle (perdre du gras et gagner du muscle)",
          wellness: "bien-être général",
        };
        const goalKey = profile.goal || "";
        
        // Build detailed goal context
        let goalContext = goalLabels[goalKey] || "améliorer sa santé";
        if (profile.current_body_fat_pct || profile.target_body_fat_pct) {
          const parts: string[] = [];
          if (profile.current_body_fat_pct) parts.push(`départ: ${profile.current_body_fat_pct}%`);
          if (profile.target_body_fat_pct) parts.push(`objectif: ${profile.target_body_fat_pct}%`);
          goalContext += ` (masse grasse: ${parts.join(" → ")})`;
        }
        
        userContext = `
L'utilisateur s'appelle ${profile.first_name || "l'utilisateur"}.
Son objectif est de ${goalContext}.
${profile.weight_kg ? `Poids actuel: ${profile.weight_kg}kg` : ""}
${profile.target_weight_kg ? `Poids cible: ${profile.target_weight_kg}kg` : ""}
${profile.height_cm ? `Taille: ${profile.height_cm}cm` : ""}
${profile.current_body_fat_pct ? `Masse grasse de départ: ${profile.current_body_fat_pct}%` : ""}
${profile.target_body_fat_pct ? `Masse grasse cible: ${profile.target_body_fat_pct}%` : ""}
`;
      }
    }

    const systemPrompt = `Tu es un coach santé et fitness bienveillant et motivant. Tu parles français de manière naturelle et encourageante.

${userContext}

Ton rôle:
- Aider l'utilisateur à atteindre ses objectifs de santé
- Enregistrer ses repas, son hydratation, son poids ET ses séances de sport via les outils disponibles
- MODIFIER les données existantes quand l'utilisateur te corrige ou te donne plus de précisions
- Donner des conseils personnalisés et motivants
- Être concis mais chaleureux (max 2-3 paragraphes)

RÈGLES IMPORTANTES:
1. Quand l'utilisateur mentionne un NOUVEAU repas/activité → utilise log_meal ou log_activity
2. Quand l'utilisateur CORRIGE ou PRÉCISE une entrée précédente (ex: "en fait c'était 45g de protéines", "j'avais oublié de préciser...") → utilise d'abord get_recent_meals ou get_recent_activities pour trouver l'entrée, puis update_meal ou update_activity
3. Si tu as un DOUTE sur si c'est un nouvel élément ou une correction → DEMANDE à l'utilisateur! Ex: "Tu parles du shaker de ce matin ou c'est un nouveau shaker ?"
4. Quand l'utilisateur veut supprimer quelque chose → utilise delete_meal ou delete_activity

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

    let assistantMessage = data.choices[0].message;
    const executedActions: { name: string; result: { success: boolean; message: string } }[] = [];
    let conversationHistory: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    
    // Maximum iterations to prevent infinite loops
    const MAX_ITERATIONS = 5;
    let iteration = 0;

    // Loop to handle chained tool calls (e.g., get_recent_meals -> delete_meal)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && userId && iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`Tool calls iteration ${iteration}:`, assistantMessage.tool_calls.length);

      // Execute each tool call
      const currentToolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const result = await executeToolCall(supabase, userId, toolCall);
        executedActions.push({ name: toolCall.function.name, result });
        currentToolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Update conversation history with assistant message and tool results
      conversationHistory.push(assistantMessage);
      conversationHistory.push(...currentToolResults);

      console.log(`Calling AI for follow-up (iteration ${iteration})`);

      // Call AI again with updated history
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationHistory,
          tools: tools,
          tool_choice: "auto",
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
      assistantMessage = followUpData.choices[0].message;
    }

    // Return final response (either after tool chain completed or no tool calls)
    return new Response(
      JSON.stringify({
        content: assistantMessage.content || executedActions.map((a) => a.result.message).join("\n"),
        actions: executedActions,
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