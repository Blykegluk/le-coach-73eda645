// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── CORS ───────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── ZOD VALIDATION SCHEMAS ─────────────────────────────────────────────────
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const timeSchema = z.string().max(10).optional();

const toolSchemas: Record<string, z.ZodSchema> = {
  log_water: z.object({ amount_ml: z.number().positive().max(10000), date: dateSchema }),
  remove_water: z.object({ amount_ml: z.number().positive().max(10000), date: dateSchema }),
  log_meal: z.object({
    meal_type: z.enum(["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert", "snack"]),
    food_name: z.string().min(1).max(500),
    calories: z.number().nonnegative().max(10000),
    protein: z.number().nonnegative().max(500).optional(),
    carbs: z.number().nonnegative().max(1000).optional(),
    fat: z.number().nonnegative().max(500).optional(),
    estimated_time: timeSchema,
    date: dateSchema,
  }),
  get_recent_meals: z.object({ limit: z.number().int().positive().max(50).optional() }),
  update_meal: z.object({
    meal_id: z.string().uuid(),
    meal_type: z.enum(["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert"]).optional(),
    food_name: z.string().min(1).max(500).optional(),
    estimated_time: timeSchema,
    calories: z.number().nonnegative().max(10000).optional(),
    protein: z.number().nonnegative().max(500).optional(),
    carbs: z.number().nonnegative().max(1000).optional(),
    fat: z.number().nonnegative().max(500).optional(),
  }),
  delete_meal: z.object({ meal_id: z.string().uuid() }),
  get_recent_activities: z.object({ limit: z.number().int().positive().max(50).optional() }),
  update_activity: z.object({
    activity_id: z.string().uuid(),
    activity_type: z.string().min(1).max(100).optional(),
    duration_min: z.number().positive().max(600).optional(),
    calories_burned: z.number().nonnegative().max(10000).optional(),
    distance_km: z.number().nonnegative().max(500).optional(),
    notes: z.string().max(1000).optional(),
  }),
  delete_activity: z.object({ activity_id: z.string().uuid() }),
  get_daily_summary: z.object({ date: dateSchema }),
  log_weight: z.object({ weight_kg: z.number().positive().min(20).max(300) }),
  log_activity: z.object({
    activity_type: z.string().min(1).max(100),
    duration_min: z.number().positive().max(600),
    calories_burned: z.number().nonnegative().max(10000).optional(),
    distance_km: z.number().nonnegative().max(500).optional(),
    notes: z.string().max(1000).optional(),
    date: dateSchema,
  }),
  log_body_fat: z.object({ body_fat_pct: z.number().positive().max(80) }),
  log_body_composition: z.object({
    weight_kg: z.number().positive().min(20).max(300).optional(),
    body_fat_pct: z.number().positive().max(80).optional(),
    muscle_mass_kg: z.number().nonnegative().max(200).optional(),
    lean_mass_kg: z.number().nonnegative().max(200).optional(),
    bone_mass_kg: z.number().nonnegative().max(20).optional(),
    water_pct: z.number().nonnegative().max(100).optional(),
    bmi: z.number().positive().max(100).optional(),
    bmr_kcal: z.number().positive().max(10000).optional(),
    visceral_fat_index: z.number().int().nonnegative().max(59).optional(),
    body_age: z.number().int().positive().max(120).optional(),
    protein_pct: z.number().nonnegative().max(100).optional(),
    protein_kg: z.number().nonnegative().max(100).optional(),
    subcutaneous_fat_pct: z.number().nonnegative().max(100).optional(),
    fat_mass_kg: z.number().nonnegative().max(200).optional(),
    skeletal_muscle_pct: z.number().nonnegative().max(100).optional(),
    standard_weight_kg: z.number().positive().max(300).optional(),
  }),
  get_body_composition_history: z.object({ limit: z.number().int().positive().max(50).optional() }),
  save_health_context: z.object({
    category: z.string().min(1).max(100),
    key: z.string().min(1).max(200),
    value: z.string().min(1).max(2000),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  }),
  get_health_context: z.object({}),
  get_prepared_workout: z.object({}),
  generate_workout: z.object({
    focus: z.enum(["upper_body", "lower_body", "full_body", "push", "pull", "cardio", "core"]).default("full_body"),
    intensity: z.enum(["light", "moderate", "intense"]).default("moderate"),
    duration_min: z.number().positive().max(180).optional(),
    exclude_exercises: z.array(z.string().max(50)).optional(),
    special_request: z.string().max(500).optional(),
  }),
  get_active_program: z.object({}),
  get_program_progress: z.object({ program_id: z.string().uuid() }),
  skip_program_session: z.object({
    session_id: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
  modify_program_session: z.object({
    session_id: z.string().uuid(),
    workout_data: z.record(z.any()),
  }),
  delete_program_session: z.object({
    session_id: z.string().uuid(),
  }),
  update_program_week: z.object({
    program_id: z.string().uuid(),
    current_week: z.number().int().positive().max(52),
  }),
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const MEAL_DEFAULT_TIMES: Record<string, string> = {
  breakfast: "08:00", morning_snack: "10:30", lunch: "12:30",
  afternoon_snack: "16:00", dinner: "19:30", dessert: "20:30",
};
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "petit-déjeuner", morning_snack: "collation matin",
  lunch: "déjeuner", afternoon_snack: "goûter", dinner: "dîner", dessert: "dessert",
};

function getLocalDate(dateStr?: string): string {
  const now = new Date();
  const parisDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const currentYear = parseInt(parisDate.slice(0, 4));
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    if (parseInt(dateStr.slice(0, 4)) < currentYear) return parisDate;
    return dateStr;
  }
  return parisDate;
}

function normalizeTimeToHHMM(input?: string): string | null {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  const full = raw.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})$/);
  const hourOnly = raw.match(/^(\d{1,2})\s*h$/);
  const toHHMM = (h: number, m: number) => {
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  if (full) return toHHMM(parseInt(full[1]), parseInt(full[2]));
  if (hourOnly) return toHHMM(parseInt(hourOnly[1]), 0);
  const hhmm = raw.match(/^(\d{2}):(\d{2})$/);
  if (hhmm) return toHHMM(parseInt(hhmm[1]), parseInt(hhmm[2]));
  return null;
}

function getTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return "hier";
  return `il y a ${diffDays} jours`;
}

// ─── TOOL DEFINITIONS (Claude format) ───────────────────────────────────────
const tools = [
  {
    name: "log_water",
    description: "Enregistre une consommation d'eau. Par défaut aujourd'hui (Paris).",
    input_schema: {
      type: "object",
      properties: {
        amount_ml: { type: "number", description: "Quantité en ml (250 = 1 verre)" },
        date: { type: "string", description: "Date YYYY-MM-DD (défaut: aujourd'hui)" },
      },
      required: ["amount_ml"],
    },
  },
  {
    name: "remove_water",
    description: "Retire une quantité d'eau (correction d'erreur).",
    input_schema: {
      type: "object",
      properties: {
        amount_ml: { type: "number", description: "Quantité à retirer en ml" },
        date: { type: "string", description: "Date YYYY-MM-DD (défaut: aujourd'hui)" },
      },
      required: ["amount_ml"],
    },
  },
  {
    name: "log_meal",
    description: "Enregistre un NOUVEAU repas. Ne pas utiliser pour modifier un repas existant.",
    input_schema: {
      type: "object",
      properties: {
        meal_type: {
          type: "string",
          enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert"],
          description: "Type: breakfast=petit-déj, morning_snack=collation matin, lunch=déjeuner, afternoon_snack=goûter, dinner=dîner, dessert=dessert",
        },
        food_name: { type: "string", description: "Nom/description du repas" },
        calories: { type: "number", description: "Calories estimées" },
        protein: { type: "number", description: "Protéines en grammes" },
        carbs: { type: "number", description: "Glucides en grammes" },
        fat: { type: "number", description: "Lipides en grammes" },
        estimated_time: { type: "string", description: "Heure HH:MM" },
        date: { type: "string", description: "Date YYYY-MM-DD (défaut: aujourd'hui)" },
      },
      required: ["meal_type", "food_name", "calories"],
    },
  },
  {
    name: "get_recent_meals",
    description: "Récupère les repas récents pour modifier ou vérifier.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Nombre de repas (défaut: 10)" } },
      required: [],
    },
  },
  {
    name: "update_meal",
    description: "Modifie un repas existant. Utiliser get_recent_meals d'abord pour l'ID.",
    input_schema: {
      type: "object",
      properties: {
        meal_id: { type: "string", description: "ID du repas (obtenu via get_recent_meals)" },
        meal_type: { type: "string", enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert"] },
        food_name: { type: "string" },
        estimated_time: { type: "string", description: "Heure HH:MM" },
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["meal_id"],
    },
  },
  {
    name: "delete_meal",
    description: "Supprime un repas existant.",
    input_schema: {
      type: "object",
      properties: { meal_id: { type: "string", description: "ID du repas" } },
      required: ["meal_id"],
    },
  },
  {
    name: "get_recent_activities",
    description: "Récupère les séances sportives récentes.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Nombre d'activités (défaut: 5)" } },
      required: [],
    },
  },
  {
    name: "update_activity",
    description: "Modifie une séance existante.",
    input_schema: {
      type: "object",
      properties: {
        activity_id: { type: "string" },
        activity_type: { type: "string" },
        duration_min: { type: "number" },
        calories_burned: { type: "number" },
        distance_km: { type: "number" },
        notes: { type: "string" },
      },
      required: ["activity_id"],
    },
  },
  {
    name: "delete_activity",
    description: "Supprime une séance sportive.",
    input_schema: {
      type: "object",
      properties: { activity_id: { type: "string" } },
      required: ["activity_id"],
    },
  },
  {
    name: "get_daily_summary",
    description: "Récupère le résumé complet d'une journée (calories, protéines, eau, activités, poids). Appeler systématiquement pour tout bilan ou question sur le jour.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "Date YYYY-MM-DD (défaut: aujourd'hui)" } },
      required: [],
    },
  },
  {
    name: "log_weight",
    description: "Enregistre le poids de l'utilisateur.",
    input_schema: {
      type: "object",
      properties: { weight_kg: { type: "number", description: "Poids en kg" } },
      required: ["weight_kg"],
    },
  },
  {
    name: "log_activity",
    description: "Enregistre une NOUVELLE séance de sport.",
    input_schema: {
      type: "object",
      properties: {
        activity_type: { type: "string", description: "Type d'activité (musculation, course, etc.)" },
        duration_min: { type: "number", description: "Durée en minutes" },
        calories_burned: { type: "number" },
        distance_km: { type: "number" },
        notes: { type: "string" },
        date: { type: "string", description: "Date YYYY-MM-DD (défaut: aujourd'hui)" },
      },
      required: ["activity_type", "duration_min"],
    },
  },
  {
    name: "log_body_fat",
    description: "Enregistre le pourcentage de masse grasse.",
    input_schema: {
      type: "object",
      properties: { body_fat_pct: { type: "number" } },
      required: ["body_fat_pct"],
    },
  },
  {
    name: "log_body_composition",
    description: "Enregistre une mesure complète d'impédancemètre (poids, masse grasse, musculaire, eau, etc.).",
    input_schema: {
      type: "object",
      properties: {
        weight_kg: { type: "number" }, body_fat_pct: { type: "number" },
        muscle_mass_kg: { type: "number" }, lean_mass_kg: { type: "number" },
        bone_mass_kg: { type: "number" }, water_pct: { type: "number" },
        bmi: { type: "number" }, bmr_kcal: { type: "number" },
        visceral_fat_index: { type: "number" }, body_age: { type: "number" },
        protein_pct: { type: "number" }, protein_kg: { type: "number" },
        subcutaneous_fat_pct: { type: "number" }, fat_mass_kg: { type: "number" },
        skeletal_muscle_pct: { type: "number" }, standard_weight_kg: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "get_body_composition_history",
    description: "Récupère l'historique des mesures corporelles pour voir la progression.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Nombre de mesures (défaut: 5)" } },
      required: [],
    },
  },
  {
    name: "save_health_context",
    description: "Sauvegarde une information importante sur l'utilisateur (blessure, allergie, préférence d'entraînement, équipement, objectif, etc.). À appeler dès qu'une info structurante est mentionnée.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["injury", "allergy", "medical_condition", "physical_limitation", "preference", "training_preference", "equipment", "lifestyle", "other"],
          description: "Catégorie de l'info",
        },
        key: { type: "string", description: "Identifiant court (ex: 'split_haut_bas', 'allergie_gluten', 'equipement_dispo')" },
        value: { type: "string", description: "Description détaillée" },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["category", "key", "value", "severity"],
    },
  },
  {
    name: "get_health_context",
    description: "Récupère toutes les informations sauvegardées sur l'utilisateur (blessures, préférences, équipement, etc.). Appeler en début de session et avant toute génération de séance.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "delete_health_context",
    description: "Supprime une information de santé obsolète.",
    input_schema: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
    },
  },
  {
    name: "get_prepared_workout",
    description: "Récupère la séance actuellement préparée dans l'aperçu de l'app.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "generate_workout",
    description: "Génère un programme d'entraînement personnalisé et le sauvegarde dans l'aperçu. Toujours appeler get_health_context et get_recent_workout_sessions AVANT pour personnaliser.",
    input_schema: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          enum: ["upper_body", "lower_body", "full_body", "push", "pull", "cardio", "core"],
          description: "Focus musculaire",
        },
        intensity: {
          type: "string",
          enum: ["light", "moderate", "intense"],
          description: "Intensité",
        },
        duration_min: { type: "number" },
        exclude_exercises: { type: "array", items: { type: "string" } },
        special_request: { type: "string" },
      },
      required: ["focus", "intensity"],
    },
  },
  {
    name: "get_recent_workout_sessions",
    description: "Récupère les séances terminées. Utiliser date_from/date_to pour filtrer par période. Pour 'cette semaine': date_from=lundi, date_to=dimanche.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre de séances (défaut: 20)" },
        date: { type: "string", description: "Date spécifique YYYY-MM-DD" },
        date_from: { type: "string", description: "Date début YYYY-MM-DD" },
        date_to: { type: "string", description: "Date fin YYYY-MM-DD" },
      },
      required: [],
    },
  },
  {
    name: "get_workout_exercises",
    description: "Récupère les exercices détaillés d'une séance spécifique.",
    input_schema: {
      type: "object",
      properties: { session_id: { type: "string" } },
      required: ["session_id"],
    },
  },
  {
    name: "update_workout_exercise",
    description: "Modifie un exercice d'une séance (sets, reps, poids).",
    input_schema: {
      type: "object",
      properties: {
        exercise_id: { type: "string" },
        actual_sets: { type: "number" },
        actual_reps: { type: "string" },
        actual_weight: { type: "string" },
        notes: { type: "string" },
        skipped: { type: "boolean" },
      },
      required: ["exercise_id"],
    },
  },
  {
    name: "delete_workout_exercise",
    description: "Supprime un exercice d'une séance.",
    input_schema: {
      type: "object",
      properties: { exercise_id: { type: "string" } },
      required: ["exercise_id"],
    },
  },
  {
    name: "get_active_program",
    description: "Récupère le programme d'entraînement multi-semaines actif de l'utilisateur, avec sa progression.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_program_progress",
    description: "Récupère le détail d'un programme (semaines, séances complétées/restantes).",
    input_schema: {
      type: "object",
      properties: { program_id: { type: "string" } },
      required: ["program_id"],
    },
    cache_control: { type: "ephemeral" },
  },
  {
    name: "skip_program_session",
    description: "Marque une séance du programme comme complétée/skippée (ex: l'utilisateur l'a déjà faite ou veut la passer). Utile quand la 1ère séance du programme correspond à une séance déjà faite.",
    input_schema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "ID de la program_session à skip" },
        reason: { type: "string", description: "Raison du skip (ex: 'déjà faite aujourd'hui', 'blessure', 'fatigue')" },
      },
      required: ["session_id"],
    },
  },
  {
    name: "modify_program_session",
    description: "Modifie le contenu (exercices, sets, reps) d'une séance du programme. Utilise get_program_progress d'abord pour voir les séances et leur session_id. Envoie le workout_data complet modifié.",
    input_schema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "ID de la program_session" },
        workout_data: { type: "object", description: "Nouveau workout_data complet (workout_name, target_muscles, exercises, etc.)" },
      },
      required: ["session_id", "workout_data"],
    },
  },
  {
    name: "delete_program_session",
    description: "Supprime une séance du programme. Attention: irréversible.",
    input_schema: {
      type: "object",
      properties: { session_id: { type: "string", description: "ID de la program_session à supprimer" } },
      required: ["session_id"],
    },
  },
  {
    name: "update_program_week",
    description: "Avance ou modifie la semaine courante du programme (ex: passer à la semaine 2).",
    input_schema: {
      type: "object",
      properties: {
        program_id: { type: "string", description: "ID du programme" },
        current_week: { type: "number", description: "Nouveau numéro de semaine" },
      },
      required: ["program_id", "current_week"],
    },
  },
];

// ─── TOOL EXECUTOR ───────────────────────────────────────────────────────────
async function executeToolCall(
  supabase: any, userId: string, toolName: string, toolInput: any
): Promise<{ success: boolean; message: string; data?: unknown }> {
  const schema = toolSchemas[toolName];
  if (schema) {
    const result = schema.safeParse(toolInput);
    if (!result.success) {
      return { success: false, message: `Données invalides: ${result.error.errors.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ")}` };
    }
    toolInput = result.data;
  }

  const today = getLocalDate();

  try {
    switch (toolName) {
      case "log_water": {
        const targetDate = getLocalDate(toolInput.date);
        const { data: current } = await supabase.from("daily_metrics").select("water_ml").eq("user_id", userId).eq("date", targetDate).maybeSingle();
        const newTotal = (current?.water_ml || 0) + toolInput.amount_ml;
        const { error } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: targetDate, water_ml: newTotal }, { onConflict: "user_id,date" });
        if (error) throw error;
        return { success: true, message: `💧 ${toolInput.amount_ml}ml ajoutés (total: ${newTotal}ml)`, data: { total: newTotal, date: targetDate } };
      }

      case "remove_water": {
        const targetDate = getLocalDate(toolInput.date);
        const { data: current } = await supabase.from("daily_metrics").select("water_ml").eq("user_id", userId).eq("date", targetDate).maybeSingle();
        const newTotal = Math.max(0, (current?.water_ml || 0) - toolInput.amount_ml);
        const { error } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: targetDate, water_ml: newTotal }, { onConflict: "user_id,date" });
        if (error) throw error;
        return { success: true, message: `💧 ${toolInput.amount_ml}ml retirés (nouveau total: ${newTotal}ml)`, data: { total: newTotal } };
      }

      case "log_meal": {
        let normalizedMealType = toolInput.meal_type;
        if (normalizedMealType === "snack") {
          const hour = parseInt((normalizeTimeToHHMM(toolInput.estimated_time) || "12:00").split(":")[0]);
          normalizedMealType = hour >= 14 ? "afternoon_snack" : "morning_snack";
        }
        const timeToUse = normalizeTimeToHHMM(toolInput.estimated_time) || MEAL_DEFAULT_TIMES[normalizedMealType] || "12:00";
        const dateToUse = getLocalDate(toolInput.date);
        const { error } = await supabase.from("nutrition_logs").insert({
          user_id: userId, meal_type: normalizedMealType, food_name: toolInput.food_name,
          calories: toolInput.calories || 0, protein: toolInput.protein || 0,
          carbs: toolInput.carbs || 0, fat: toolInput.fat || 0,
          logged_at: `${dateToUse}T${timeToUse}:00`,
        });
        if (error) throw error;
        const { data: currentMetrics } = await supabase.from("daily_metrics").select("calories_in").eq("user_id", userId).eq("date", dateToUse).maybeSingle();
        const { error: metricsErr } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: dateToUse, calories_in: (currentMetrics?.calories_in || 0) + (toolInput.calories || 0) }, { onConflict: "user_id,date" });
        if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        return { success: true, message: `🍽️ ${toolInput.food_name} enregistré (${MEAL_TYPE_LABELS[normalizedMealType]}, ${toolInput.calories} kcal)`, data: toolInput };
      }

      case "get_recent_meals": {
        const { data: meals, error } = await supabase.from("nutrition_logs").select("id, food_name, meal_type, calories, protein, carbs, fat, logged_at").eq("user_id", userId).order("logged_at", { ascending: false }).limit(toolInput.limit || 10);
        if (error) throw error;
        return { success: true, message: `${meals?.length || 0} repas trouvés`, data: (meals || []).map((m: any) => ({ ...m, time_ago: getTimeAgo(m.logged_at) })) };
      }

      case "update_meal": {
        const { data: currentMeal } = await supabase.from("nutrition_logs").select("calories, food_name, logged_at, meal_type").eq("id", toolInput.meal_id).eq("user_id", userId).maybeSingle();
        if (!currentMeal) return { success: false, message: "Repas non trouvé" };
        const updates: any = {};
        if (toolInput.meal_type !== undefined) updates.meal_type = toolInput.meal_type;
        if (toolInput.food_name !== undefined) updates.food_name = toolInput.food_name;
        if (toolInput.calories !== undefined) updates.calories = toolInput.calories;
        if (toolInput.protein !== undefined) updates.protein = toolInput.protein;
        if (toolInput.carbs !== undefined) updates.carbs = toolInput.carbs;
        if (toolInput.fat !== undefined) updates.fat = toolInput.fat;
        const mealDate = (currentMeal.logged_at || `${today}T12:00:00`).split("T")[0];
        let timeToUse = normalizeTimeToHHMM(toolInput.estimated_time);
        if (!timeToUse && toolInput.meal_type && toolInput.meal_type !== currentMeal.meal_type) timeToUse = MEAL_DEFAULT_TIMES[toolInput.meal_type] || null;
        if (timeToUse) updates.logged_at = `${mealDate}T${timeToUse}:00`;
        const { error } = await supabase.from("nutrition_logs").update(updates).eq("id", toolInput.meal_id).eq("user_id", userId);
        if (error) throw error;
        if (toolInput.calories !== undefined && toolInput.calories !== currentMeal.calories) {
          const diff = toolInput.calories - (currentMeal.calories || 0);
          const { data: metrics } = await supabase.from("daily_metrics").select("calories_in").eq("user_id", userId).eq("date", mealDate).maybeSingle();
          const { error: metricsErr } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: mealDate, calories_in: Math.max(0, (metrics?.calories_in || 0) + diff) }, { onConflict: "user_id,date" });
          if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        }
        return { success: true, message: `✏️ "${currentMeal.food_name}" mis à jour`, data: updates };
      }

      case "delete_meal": {
        const { data: meal } = await supabase.from("nutrition_logs").select("calories, food_name, logged_at").eq("id", toolInput.meal_id).eq("user_id", userId).maybeSingle();
        if (!meal) return { success: false, message: "Repas non trouvé" };
        const { error } = await supabase.from("nutrition_logs").delete().eq("id", toolInput.meal_id).eq("user_id", userId);
        if (error) throw error;
        if (meal.calories) {
          const mealDate = (meal.logged_at || `${today}T12:00:00`).split("T")[0];
          const { data: metrics } = await supabase.from("daily_metrics").select("calories_in").eq("user_id", userId).eq("date", mealDate).maybeSingle();
          const { error: metricsErr } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: mealDate, calories_in: Math.max(0, (metrics?.calories_in || 0) - meal.calories) }, { onConflict: "user_id,date" });
          if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        }
        return { success: true, message: `🗑️ "${meal.food_name}" supprimé` };
      }

      case "get_recent_activities": {
        const { data: sessions, error } = await supabase.from("workout_sessions").select("id, workout_name, started_at, completed_at, status, total_duration_seconds, calories_burned, target_muscles, notes").eq("user_id", userId).order("started_at", { ascending: false }).limit(toolInput.limit || 5);
        if (error) throw error;
        return { success: true, message: `${sessions?.length || 0} activités trouvées`, data: (sessions || []).map((s: any) => ({ id: s.id, activity_type: s.workout_name, duration_min: s.total_duration_seconds ? Math.round(s.total_duration_seconds / 60) : null, calories_burned: s.calories_burned, notes: s.notes, performed_at: s.started_at, status: s.status, target_muscles: s.target_muscles, time_ago: getTimeAgo(s.started_at) })) };
      }

      case "update_activity": {
        const { data: current } = await supabase.from("workout_sessions").select("workout_name, calories_burned").eq("id", toolInput.activity_id).eq("user_id", userId).maybeSingle();
        if (!current) return { success: false, message: "Activité non trouvée" };
        const updates: any = {};
        if (toolInput.activity_type !== undefined) updates.workout_name = toolInput.activity_type;
        if (toolInput.duration_min !== undefined) updates.total_duration_seconds = toolInput.duration_min * 60;
        if (toolInput.calories_burned !== undefined) updates.calories_burned = toolInput.calories_burned;
        if (toolInput.distance_km !== undefined) updates.distance_km = toolInput.distance_km;
        if (toolInput.notes !== undefined) updates.notes = toolInput.notes;
        const { error } = await supabase.from("workout_sessions").update(updates).eq("id", toolInput.activity_id).eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `✏️ "${current.workout_name}" mis à jour`, data: updates };
      }

      case "delete_activity": {
        const { data: session } = await supabase.from("workout_sessions").select("workout_name, calories_burned").eq("id", toolInput.activity_id).eq("user_id", userId).maybeSingle();
        if (!session) return { success: false, message: "Activité non trouvée" };
        const { error: logsErr } = await supabase.from("workout_exercise_logs").delete().eq("session_id", toolInput.activity_id).eq("user_id", userId);
        if (logsErr) console.error("exercise logs cleanup failed:", logsErr.message);
        const { error } = await supabase.from("workout_sessions").delete().eq("id", toolInput.activity_id).eq("user_id", userId);
        if (error) throw error;
        if (session.calories_burned) {
          const { data: metrics } = await supabase.from("daily_metrics").select("calories_burned").eq("user_id", userId).eq("date", today).maybeSingle();
          const { error: metricsErr } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: today, calories_burned: Math.max(0, (metrics?.calories_burned || 0) - session.calories_burned) }, { onConflict: "user_id,date" });
          if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        }
        return { success: true, message: `🗑️ "${session.workout_name}" supprimé` };
      }

      case "get_daily_summary": {
        const queryDate = getLocalDate(toolInput.date);
        const [metricsRes, mealsRes, activitiesRes, profileRes, latestBFRes] = await Promise.all([
          supabase.from("daily_metrics").select("*").eq("user_id", userId).eq("date", queryDate).maybeSingle(),
          supabase.from("nutrition_logs").select("*").eq("user_id", userId).gte("logged_at", `${queryDate}T00:00:00`).lte("logged_at", `${queryDate}T23:59:59`).order("logged_at", { ascending: true }),
          supabase.from("workout_sessions").select("*").eq("user_id", userId).gte("started_at", `${queryDate}T00:00:00`).lte("started_at", `${queryDate}T23:59:59`),
          supabase.from("profiles").select("target_calories, target_water_ml, target_weight_kg, weight_kg, goal, current_body_fat_pct, target_body_fat_pct").eq("user_id", userId).maybeSingle(),
          supabase.from("daily_metrics").select("body_fat_pct, date").eq("user_id", userId).not("body_fat_pct", "is", null).order("date", { ascending: false }).limit(1).maybeSingle(),
        ]);
        const meals = mealsRes.data || [];
        const activities = activitiesRes.data || [];
        const profile = profileRes.data;
        const totalCalories = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
        const totalProtein = meals.reduce((s: number, m: any) => s + (m.protein || 0), 0);
        const totalCarbs = meals.reduce((s: number, m: any) => s + (m.carbs || 0), 0);
        const totalFat = meals.reduce((s: number, m: any) => s + (m.fat || 0), 0);
        return {
          success: true, message: `Résumé du ${queryDate}`,
          data: {
            date: queryDate, is_today: queryDate === today,
            calories_consumed: totalCalories, protein_consumed: totalProtein,
            carbs_consumed: totalCarbs, fat_consumed: totalFat,
            target_calories: profile?.target_calories || 2000,
            protein_goal: Math.round((profile?.weight_kg || 70) * 2),
            water_ml: metricsRes.data?.water_ml || 0,
            target_water_ml: profile?.target_water_ml || 2000,
            calories_burned: activities.reduce((s: number, a: any) => s + (a.calories_burned || 0), 0),
            weight: metricsRes.data?.weight || profile?.weight_kg,
            target_weight: profile?.target_weight_kg, goal: profile?.goal,
            current_body_fat_pct: profile?.current_body_fat_pct,
            target_body_fat_pct: profile?.target_body_fat_pct,
            latest_body_fat: latestBFRes.data?.body_fat_pct,
            meals_count: meals.length,
            meals: meals.map((m: any) => ({ id: m.id, meal_type: m.meal_type, food_name: m.food_name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, logged_at: m.logged_at })),
            activities_count: activities.length,
            activities: activities,
          },
        };
      }

      case "log_weight": {
        const { error } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: today, weight: toolInput.weight_kg }, { onConflict: "user_id,date" });
        if (error) throw error;
        const { error: profileErr } = await supabase.from("profiles").update({ weight_kg: toolInput.weight_kg }).eq("user_id", userId);
        if (profileErr) console.error("profile weight sync failed:", profileErr.message);
        return { success: true, message: `⚖️ Poids enregistré: ${toolInput.weight_kg} kg`, data: { weight: toolInput.weight_kg } };
      }

      case "log_activity": {
        let caloriesBurned = toolInput.calories_burned;
        if (!caloriesBurned) {
          const { data: profile } = await supabase.from("profiles").select("weight_kg").eq("user_id", userId).maybeSingle();
          const weight = profile?.weight_kg || 70;
          const actLower = toolInput.activity_type.toLowerCase();
          let met = 4;
          if (actLower.includes("course") || actLower.includes("running")) met = 8;
          else if (actLower.includes("musculation") || actLower.includes("muscu")) met = 5;
          else if (actLower.includes("hiit") || actLower.includes("crossfit")) met = 10;
          else if (actLower.includes("vélo") || actLower.includes("cycling")) met = 7;
          else if (actLower.includes("natation")) met = 7;
          else if (actLower.includes("yoga") || actLower.includes("pilates")) met = 3;
          else if (actLower.includes("marche") || actLower.includes("walk")) met = 3.5;
          caloriesBurned = Math.round(met * weight * (toolInput.duration_min / 60));
        }
        const actDate = getLocalDate(toolInput.date);
        const performedAt = toolInput.date ? `${actDate}T12:00:00` : new Date().toISOString();
        const { error } = await supabase.from("workout_sessions").insert({
          user_id: userId, workout_name: toolInput.activity_type,
          started_at: performedAt, completed_at: performedAt, status: "completed",
          total_duration_seconds: toolInput.duration_min * 60,
          calories_burned: caloriesBurned, distance_km: toolInput.distance_km || null,
          notes: toolInput.notes || null,
        });
        if (error) throw error;
        // Also write to activities so Progress page / StatsGrid can see it
        const { error: actErr } = await supabase.from("activities").insert({
          user_id: userId, activity_type: toolInput.activity_type,
          duration_min: toolInput.duration_min, calories_burned: caloriesBurned,
          distance_km: toolInput.distance_km || null, notes: toolInput.notes || null,
          performed_at: performedAt,
        });
        if (actErr) console.error("activities sync failed:", actErr.message);
        const { data: currentMetrics } = await supabase.from("daily_metrics").select("calories_burned").eq("user_id", userId).eq("date", actDate).maybeSingle();
        const { error: metricsErr } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: actDate, calories_burned: (currentMetrics?.calories_burned || 0) + caloriesBurned }, { onConflict: "user_id,date" });
        if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        return { success: true, message: `🏋️ ${toolInput.activity_type} enregistré (${toolInput.duration_min} min, ~${caloriesBurned} kcal)`, data: { ...toolInput, calories_burned: caloriesBurned } };
      }

      case "log_body_fat": {
        const { error } = await supabase.from("daily_metrics").upsert({ user_id: userId, date: today, body_fat_pct: toolInput.body_fat_pct }, { onConflict: "user_id,date" });
        if (error) throw error;
        return { success: true, message: `📊 Masse grasse enregistrée: ${toolInput.body_fat_pct}%` };
      }

      case "log_body_composition": {
        const record: any = { user_id: userId, measured_at: new Date().toISOString() };
        const fields = ["weight_kg", "body_fat_pct", "muscle_mass_kg", "lean_mass_kg", "bone_mass_kg", "water_pct", "bmi", "bmr_kcal", "visceral_fat_index", "body_age", "protein_pct", "protein_kg", "subcutaneous_fat_pct", "fat_mass_kg", "skeletal_muscle_pct", "standard_weight_kg"];
        let count = 0;
        for (const f of fields) { if (toolInput[f] != null) { record[f] = toolInput[f]; count++; } }
        if (count === 0) return { success: false, message: "Aucune métrique fournie" };
        const { error } = await supabase.from("body_composition").insert(record);
        if (error) throw error;
        if (toolInput.weight_kg || toolInput.body_fat_pct) {
          const upd: any = { user_id: userId, date: today };
          if (toolInput.weight_kg) upd.weight = toolInput.weight_kg;
          if (toolInput.body_fat_pct) upd.body_fat_pct = toolInput.body_fat_pct;
          const { error: metricsErr } = await supabase.from("daily_metrics").upsert(upd, { onConflict: "user_id,date" });
          if (metricsErr) console.error("daily_metrics sync failed:", metricsErr.message);
        }
        if (toolInput.weight_kg) {
          const { error: profileErr } = await supabase.from("profiles").update({ weight_kg: toolInput.weight_kg }).eq("user_id", userId);
          if (profileErr) console.error("profile weight sync failed:", profileErr.message);
        }
        const recorded: string[] = [];
        if (toolInput.weight_kg) recorded.push(`${toolInput.weight_kg}kg`);
        if (toolInput.body_fat_pct) recorded.push(`${toolInput.body_fat_pct}% gras`);
        if (toolInput.muscle_mass_kg) recorded.push(`${toolInput.muscle_mass_kg}kg muscle`);
        return { success: true, message: `📊 Mesure complète: ${recorded.join(", ")} (${count} métriques)`, data: record };
      }

      case "get_body_composition_history": {
        const { data: measurements, error } = await supabase.from("body_composition").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(toolInput.limit || 5);
        if (error) throw error;
        const { data: profile } = await supabase.from("profiles").select("target_weight_kg, target_body_fat_pct, current_body_fat_pct").eq("user_id", userId).maybeSingle();
        return { success: true, message: `${measurements?.length || 0} mesures trouvées`, data: { measurements: (measurements || []).map((m: any) => ({ date: new Date(m.measured_at).toLocaleDateString("fr-FR"), weight_kg: m.weight_kg, body_fat_pct: m.body_fat_pct, muscle_mass_kg: m.muscle_mass_kg, lean_mass_kg: m.lean_mass_kg, bmi: m.bmi, bmr_kcal: m.bmr_kcal, body_age: m.body_age })), targets: profile } };
      }

      case "save_health_context": {
        const contextKey = `health_${toolInput.category}_${toolInput.key}`;
        const contextValue = JSON.stringify({ category: toolInput.category, description: toolInput.value, severity: toolInput.severity, recorded_at: new Date().toISOString() });
        const { data: existing } = await supabase.from("user_context").select("id").eq("user_id", userId).eq("key", contextKey).maybeSingle();
        if (existing) {
          const { error: upErr } = await supabase.from("user_context").update({ value: contextValue, updated_at: new Date().toISOString() }).eq("id", existing.id);
          if (upErr) throw upErr;
        } else {
          const { error: insErr } = await supabase.from("user_context").insert({ user_id: userId, key: contextKey, value: contextValue });
          if (insErr) throw insErr;
        }
        return { success: true, message: `✅ Sauvegardé: ${toolInput.key} (${toolInput.category})`, data: { key: toolInput.key, category: toolInput.category } };
      }

      case "get_health_context": {
        const { data: contexts, error } = await supabase.from("user_context").select("key, value, updated_at").eq("user_id", userId).like("key", "health_%");
        if (error) throw error;
        const formatted = (contexts || []).map((c: any) => {
          try {
            const parsed = JSON.parse(c.value);
            return { key: c.key.replace(/^health_[^_]+_/, ""), category: parsed.category, description: parsed.description, severity: parsed.severity, recorded_at: parsed.recorded_at };
          } catch { return { key: c.key, description: c.value, category: "other", severity: "medium" }; }
        });
        return { success: true, message: `${formatted.length} info(s) trouvée(s)`, data: formatted };
      }

      case "delete_health_context": {
        const { data: deleted, error } = await supabase.from("user_context").delete().eq("user_id", userId).like("key", `health_%_${toolInput.key}`).select("key");
        if (error) throw error;
        if (!deleted?.length) return { success: false, message: `"${toolInput.key}" non trouvé` };
        return { success: true, message: `🗑️ "${toolInput.key}" supprimé` };
      }

      case "get_prepared_workout": {
        const { data, error } = await supabase.from("user_context").select("value, updated_at").eq("user_id", userId).eq("key", "prepared_workout").maybeSingle();
        if (error) return { success: false, message: `Erreur: ${error.message}` };
        if (!data?.value) return { success: true, message: "Aucune séance préparée actuellement", data: null };
        try {
          const pw = JSON.parse(data.value);
          return { success: true, message: "Séance préparée trouvée", data: { workout_name: pw.workout_name, estimated_duration_min: pw.estimated_duration_min, target_muscles: pw.target_muscles, exercises: pw.exercises?.map((e: any) => ({ name: e.name, sets: e.sets, reps: e.reps, weight_recommendation: e.weight_recommendation, rest_seconds: e.rest_seconds, notes: e.notes })), warmup_notes: pw.warmup_notes, coach_advice: pw.coach_advice, updated_at: data.updated_at } };
        } catch { return { success: false, message: "Erreur de lecture de la séance" }; }
      }

      case "generate_workout": {
        const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
        if (!ANTHROPIC_API_KEY) return { success: false, message: "ANTHROPIC_API_KEY non configurée" };

        const [profileRes, recentSessionsRes, healthCtxRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("workout_sessions").select("id, workout_name, started_at, target_muscles, total_duration_seconds, notes").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
          supabase.from("user_context").select("key, value").eq("user_id", userId),
        ]);

        const profile = profileRes.data;
        const recentSessions = recentSessionsRes.data || [];
        const allContext = healthCtxRes.data || [];

        const sessionIds = recentSessions.map((s: any) => s.id);
        let recentExercises: any[] = [];
        if (sessionIds.length > 0) {
          const { data: exLogs } = await supabase.from("workout_exercise_logs").select("session_id, exercise_name, planned_sets, planned_reps, actual_weight").eq("user_id", userId).in("session_id", sessionIds.slice(0, 3));
          recentExercises = exLogs || [];
        }

        const healthContextItems = allContext.filter((c: any) => c.key.startsWith("health_")).map((c: any) => {
          try { const p = JSON.parse(c.value); return `[${p.category}/${p.severity}] ${p.description}`; } catch { return c.value; }
        });

        const equipmentCtx = allContext.find((c: any) => c.key.includes("equipment"));
        const equipment = equipmentCtx ? (() => { try { return JSON.parse(equipmentCtx.value).description; } catch { return equipmentCtx.value; } })() : "Salle de sport standard";

        const recentSessionSummary = recentSessions.slice(0, 5).map((s: any) => {
          const exercises = recentExercises.filter((e: any) => e.session_id === s.id).map((e: any) => e.exercise_name).join(", ");
          return `- ${new Date(s.started_at).toLocaleDateString("fr-FR")}: ${s.workout_name} [${(s.target_muscles || []).join(", ")}] — ${exercises || "détail non dispo"}`;
        }).join("\n");

        const focusMap: Record<string, string> = { upper_body: "Haut du corps (pecs, dos, épaules, bras)", lower_body: "Bas du corps (quadriceps, ischio-jambiers, fessiers, mollets)", full_body: "Corps entier", push: "Poussée (pecs, épaules, triceps)", pull: "Tirage (dos, biceps)", cardio: "Cardio/endurance", core: "Abdos/gainage" };
        const intensityMap: Record<string, string> = { light: "Légère - récupération, poids légers", moderate: "Modérée - 60-75% du max", intense: "Intense - 80-90% du max, techniques d'intensification" };

        const workoutSystemPrompt = `Tu es un coach fitness expert. Génère un programme d'entraînement en JSON strict.

PROFIL:
- Objectif: ${profile?.goal || "forme générale"}
- Poids: ${profile?.weight_kg || "?"}kg → Cible: ${profile?.target_weight_kg || "?"}kg

CONTRAINTES DE SANTÉ ET PRÉFÉRENCES:
${healthContextItems.length > 0 ? healthContextItems.join("\n") : "Aucune contrainte particulière"}

ÉQUIPEMENT DISPONIBLE: ${equipment}

FOCUS DEMANDÉ: ${focusMap[toolInput.focus] || toolInput.focus}
INTENSITÉ: ${intensityMap[toolInput.intensity] || toolInput.intensity}
${toolInput.duration_min ? `DURÉE: ${toolInput.duration_min} minutes` : ""}
${toolInput.special_request ? `DEMANDE SPÉCIALE: ${toolInput.special_request}` : ""}
${toolInput.exclude_exercises?.length ? `EXERCICES À ÉVITER: ${toolInput.exclude_exercises.join(", ")}` : ""}

HISTORIQUE RÉCENT (NE PAS répéter les mêmes exercices):
${recentSessionSummary || "Aucune séance récente"}

RÈGLES ABSOLUES:
1. Le focus est une LOI. Si upper_body: ZÉRO exercice jambes. Si lower_body: ZÉRO exercice haut du corps.
2. Respecte strictement les contraintes de santé (adapte les exercices, ne change pas le focus).
3. Varie les exercices par rapport aux séances récentes.
4. Adapte les recommandations de charges à l'intensité demandée.

Retourne UNIQUEMENT ce JSON:
{
  "workout_name": "Nom évocateur",
  "target_muscles": ["muscle1", "muscle2"],
  "estimated_duration_min": 45,
  "exercises": [
    {"name": "...", "sets": 4, "reps": "8-10", "weight_recommendation": "...", "rest_seconds": 90, "notes": "..."}
  ],
  "warmup_notes": "...",
  "coach_advice": "Conseil personnalisé pour cette séance"
}`;

        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 2000,
            system: workoutSystemPrompt,
            messages: [{ role: "user", content: "Génère la séance selon les paramètres." }],
          }),
        });

        if (!aiRes.ok) return { success: false, message: "Erreur lors de la génération" };
        const aiData = await aiRes.json();
        const content = aiData.content?.[0]?.text || "";
        let workout;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          workout = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch { return { success: false, message: "Format de réponse invalide" }; }

        await supabase.from("user_context").upsert({ user_id: userId, key: "prepared_workout", value: JSON.stringify(workout), updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
        return { success: true, message: `💪 Séance générée: ${workout.workout_name} (~${workout.estimated_duration_min} min, ${workout.exercises?.length || 0} exercices)`, data: { workout, type: "workout_generated" } };
      }

      case "get_recent_workout_sessions": {
        let query = supabase.from("workout_sessions").select("id, workout_name, started_at, completed_at, status, target_muscles, total_duration_seconds, calories_burned, notes").eq("user_id", userId).eq("status", "completed").order("started_at", { ascending: false }).limit(toolInput.limit || 20);
        if (toolInput.date) { const d = getLocalDate(toolInput.date); query = query.gte("started_at", `${d}T00:00:00`).lt("started_at", `${d}T23:59:59`); }
        if (toolInput.date_from) { const d = getLocalDate(toolInput.date_from); query = query.gte("started_at", `${d}T00:00:00`); }
        if (toolInput.date_to) { const d = getLocalDate(toolInput.date_to); query = query.lte("started_at", `${d}T23:59:59`); }
        const { data: sessions, error } = await query;
        if (error) throw error;
        // No need to merge with activities table — log_activity now writes to both,
        // and the backfill migration ensures older entries exist in both tables too.
        const allSessions = (sessions || []).map((s: any) => ({
          id: s.id, source: "workout_session", workout_name: s.workout_name,
          started_at: s.started_at, target_muscles: s.target_muscles,
          duration_min: s.total_duration_seconds ? Math.round(s.total_duration_seconds / 60) : null,
          calories_burned: s.calories_burned, notes: s.notes, time_ago: getTimeAgo(s.started_at),
        }));
        return { success: true, message: `${allSessions.length} séance(s) trouvée(s)`, data: allSessions };
      }

      case "get_workout_exercises": {
        const { data: exercises, error } = await supabase.from("workout_exercise_logs").select("id, exercise_name, exercise_order, planned_sets, planned_reps, planned_weight, actual_sets, actual_reps, actual_weight, rest_seconds, notes, skipped").eq("session_id", toolInput.session_id).eq("user_id", userId).order("exercise_order", { ascending: true });
        if (error) throw error;
        return { success: true, message: `${exercises?.length || 0} exercice(s)`, data: (exercises || []).map((e: any) => ({ id: e.id, exercise_name: e.exercise_name, order: e.exercise_order, planned: { sets: e.planned_sets, reps: e.planned_reps, weight: e.planned_weight }, actual: { sets: e.actual_sets, reps: e.actual_reps, weight: e.actual_weight }, rest_seconds: e.rest_seconds, notes: e.notes, skipped: e.skipped })) };
      }

      case "update_workout_exercise": {
        const { data: current } = await supabase.from("workout_exercise_logs").select("exercise_name").eq("id", toolInput.exercise_id).eq("user_id", userId).maybeSingle();
        if (!current) return { success: false, message: "Exercice non trouvé" };
        const updates: any = {};
        if (toolInput.actual_sets !== undefined) updates.actual_sets = toolInput.actual_sets;
        if (toolInput.actual_reps !== undefined) updates.actual_reps = toolInput.actual_reps;
        if (toolInput.actual_weight !== undefined) updates.actual_weight = toolInput.actual_weight;
        if (toolInput.notes !== undefined) updates.notes = toolInput.notes;
        if (toolInput.skipped !== undefined) updates.skipped = toolInput.skipped;
        const { error } = await supabase.from("workout_exercise_logs").update(updates).eq("id", toolInput.exercise_id).eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `✏️ "${current.exercise_name}" corrigé`, data: updates };
      }

      case "delete_workout_exercise": {
        const { data: exercise } = await supabase.from("workout_exercise_logs").select("exercise_name").eq("id", toolInput.exercise_id).eq("user_id", userId).maybeSingle();
        if (!exercise) return { success: false, message: "Exercice non trouvé" };
        const { error } = await supabase.from("workout_exercise_logs").delete().eq("id", toolInput.exercise_id).eq("user_id", userId);
        if (error) throw error;
        return { success: true, message: `🗑️ "${exercise.exercise_name}" supprimé` };
      }

      case "get_active_program": {
        const { data: program } = await supabase.from("training_programs").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!program) return { success: true, message: "Aucun programme actif", data: null };

        // Get completion stats
        const { data: sessions } = await supabase.from("program_sessions").select("id, completed_at").eq("program_id", program.id);
        const totalSessions = sessions?.length || 0;
        const completedSessions = sessions?.filter((s: any) => s.completed_at).length || 0;

        return {
          success: true,
          message: `Programme actif: ${program.name} (semaine ${program.current_week}/${program.duration_weeks}, ${completedSessions}/${totalSessions} séances)`,
          data: {
            id: program.id, name: program.name, description: program.description,
            goal: program.goal, difficulty: program.difficulty,
            current_week: program.current_week, duration_weeks: program.duration_weeks,
            sessions_per_week: program.sessions_per_week, status: program.status,
            started_at: program.started_at, total_sessions: totalSessions,
            completed_sessions: completedSessions,
          },
        };
      }

      case "get_program_progress": {
        const { data: program } = await supabase.from("training_programs").select("*").eq("id", toolInput.program_id).eq("user_id", userId).maybeSingle();
        if (!program) return { success: false, message: "Programme non trouvé" };

        const { data: weeks } = await supabase.from("program_weeks").select("*").eq("program_id", program.id).order("week_number", { ascending: true });
        const { data: sessions } = await supabase.from("program_sessions").select("id, week_id, session_order, completed_at, workout_data").eq("program_id", program.id).order("session_order", { ascending: true });

        const weekDetails = (weeks || []).map((w: any) => {
          const weekSessions = (sessions || []).filter((s: any) => s.week_id === w.id);
          return {
            week_number: w.week_number, focus: w.focus, is_deload: w.is_deload,
            sessions: weekSessions.map((s: any) => ({
              id: s.id,
              order: s.session_order,
              workout_name: s.workout_data?.workout_name || "Séance",
              target_muscles: s.workout_data?.target_muscles || [],
              completed: !!s.completed_at,
              completed_at: s.completed_at,
            })),
          };
        });

        return {
          success: true,
          message: `Programme "${program.name}": semaine ${program.current_week}/${program.duration_weeks}`,
          data: { program: { id: program.id, name: program.name, goal: program.goal, current_week: program.current_week, duration_weeks: program.duration_weeks }, weeks: weekDetails },
        };
      }

      case "skip_program_session": {
        const { data: session } = await supabase.from("program_sessions").select("id, workout_data, completed_at").eq("id", toolInput.session_id).eq("user_id", userId).maybeSingle();
        if (!session) return { success: false, message: "Séance non trouvée" };
        if (session.completed_at) return { success: false, message: "Séance déjà complétée" };

        const { error } = await supabase.from("program_sessions").update({
          completed_at: new Date().toISOString(),
          completed_session_id: null, // skipped, no linked workout
        }).eq("id", toolInput.session_id);
        if (error) throw error;

        const workoutName = session.workout_data?.workout_name || "Séance";
        return { success: true, message: `⏭️ "${workoutName}" marquée comme faite/skippée${toolInput.reason ? ` (${toolInput.reason})` : ""}` };
      }

      case "modify_program_session": {
        const { data: session } = await supabase.from("program_sessions").select("id, workout_data").eq("id", toolInput.session_id).eq("user_id", userId).maybeSingle();
        if (!session) return { success: false, message: "Séance non trouvée" };

        const { error } = await supabase.from("program_sessions").update({
          workout_data: toolInput.workout_data,
        }).eq("id", toolInput.session_id);
        if (error) throw error;

        const newName = toolInput.workout_data?.workout_name || "Séance";
        return { success: true, message: `✏️ Séance modifiée: "${newName}"` };
      }

      case "delete_program_session": {
        const { data: session } = await supabase.from("program_sessions").select("id, workout_data").eq("id", toolInput.session_id).eq("user_id", userId).maybeSingle();
        if (!session) return { success: false, message: "Séance non trouvée" };

        const { error } = await supabase.from("program_sessions").delete().eq("id", toolInput.session_id);
        if (error) throw error;

        const workoutName = session.workout_data?.workout_name || "Séance";
        return { success: true, message: `🗑️ Séance "${workoutName}" supprimée du programme` };
      }

      case "update_program_week": {
        const { data: program } = await supabase.from("training_programs").select("id, name, duration_weeks").eq("id", toolInput.program_id).eq("user_id", userId).maybeSingle();
        if (!program) return { success: false, message: "Programme non trouvé" };

        if (toolInput.current_week > program.duration_weeks) {
          // Mark program as completed
          const { error } = await supabase.from("training_programs").update({
            status: "completed", completed_at: new Date().toISOString(),
          }).eq("id", program.id);
          if (error) throw error;
          return { success: true, message: `🎉 Programme "${program.name}" terminé !` };
        }

        const { error } = await supabase.from("training_programs").update({
          current_week: toolInput.current_week,
        }).eq("id", program.id);
        if (error) throw error;
        return { success: true, message: `📅 Programme avancé à la semaine ${toolInput.current_week}/${program.duration_weeks}` };
      }

      default:
        return { success: false, message: `Outil inconnu: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return { success: false, message: `Erreur ${toolName}: ${error instanceof Error ? error.message : "Inconnue"}` };
  }
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
function buildSystemPrompt(ctx: {
  today: string; yesterday: string; currentTime: string; formattedDate: string;
  mondayStr: string; sundayStr: string;
  userContext: string; healthContext: string; preparedWorkoutContext: string; workoutHistoryContext: string;
  todayContext: string;
  isFirstSession: boolean;
}) {
  return `Tu es un coach santé et fitness expert, bienveillant et direct. Tu parles français naturellement.

═══════════════════════════════
CONTEXTE TEMPOREL
═══════════════════════════════
- Aujourd'hui : ${ctx.formattedDate} (${ctx.today})
- Hier : ${ctx.yesterday}
- Heure Paris : ${ctx.currentTime}
- Cette semaine : du ${ctx.mondayStr} (lundi) au ${ctx.sundayStr} (dimanche)
  → Pour filtrer "cette semaine" : date_from="${ctx.mondayStr}", date_to="${ctx.sundayStr}"
  → Une semaine commence TOUJOURS le lundi et finit le dimanche.

${ctx.userContext}
${ctx.healthContext}
${ctx.todayContext}
${ctx.workoutHistoryContext}
${ctx.preparedWorkoutContext}

═══════════════════════════════
${ctx.isFirstSession ? `PREMIÈRE SESSION — ONBOARDING
═══════════════════════════════
C'est la première fois que cet utilisateur utilise l'app. Tu dois :
1. Te présenter en 2-3 phrases : qui tu es, ce que tu peux faire (suivi nutrition, entraînements personnalisés, coaching quotidien).
2. Poser des questions dans cet ordre EXACT, une à la fois, en attendant la réponse avant de passer à la suivante :
   a) Quel est son objectif principal ? (prise de muscle, perte de gras, recomposition, endurance, bien-être)
   b) Quel équipement a-t-il à disposition ? (salle complète, haltères à domicile, pas d'équipement, etc.)
   c) Quelle est sa fréquence et son organisation d'entraînement souhaitée ? (combien de jours/semaine, split haut/bas, full body, PPL, etc.)
   d) A-t-il des blessures, douleurs chroniques ou contraintes physiques à prendre en compte ?
3. Sauvegarder CHAQUE réponse via save_health_context avant de poser la question suivante.
4. Une fois l'onboarding terminé, faire un récap de ce que tu as compris et proposer de générer une première séance.
` : `RÈGLES DE MÉMOIRE PROACTIVE
═══════════════════════════════
Avant de répondre, consulte SYSTÉMATIQUEMENT les données pertinentes selon le sujet :
- Nutrition → appelle get_daily_summary + get_recent_meals
- Sport/séance → appelle get_health_context + get_recent_workout_sessions (pour respecter split, blessures, historique)
- Bilan général → appelle get_daily_summary + get_recent_workout_sessions + get_body_composition_history
- Génération séance → OBLIGATOIRE : get_health_context + get_recent_workout_sessions AVANT generate_workout
- Programme multi-semaines → appelle get_active_program pour vérifier si l'utilisateur suit un programme. Si oui, mentionne sa progression et adapte tes conseils.
- Gestion programme → tu peux modifier (modify_program_session), skipper (skip_program_session), supprimer (delete_program_session) des séances, et avancer la semaine (update_program_week). Si l'utilisateur dit avoir déjà fait une séance du programme, utilise skip_program_session. Si l'utilisateur veut adapter son programme (changer exercices, intensité), utilise modify_program_session avec le workout_data complet modifié. Utilise get_program_progress d'abord pour récupérer les IDs.

Tu peux appeler plusieurs outils en parallèle. Ne réponds JAMAIS sans avoir consulté les données nécessaires.
`}
═══════════════════════════════
COMPORTEMENT DU COACH
═══════════════════════════════
1. CONVICTIONS : Tu as un avis basé sur les données. Si l'utilisateur demande une séance inadaptée (ex: pec alors qu'il en a fait hier, ou full body alors qu'il préfère le split), tu le signales clairement avec ta recommandation alternative. Si l'utilisateur insiste, tu exécutes en précisant ton désaccord.

2. COHÉRENCE : Toutes les recommandations (nutrition, entraînement, récupération) sont alignées avec l'objectif de l'utilisateur. Si l'objectif change, tout change.

3. MÉMOIRE : Tu te souviens de tout ce qui a été sauvegardé (blessures, préférences, équipement, split, objectifs). Tu ne poses jamais deux fois la même question.

4. CHRONOLOGIE : Quand tu présentes un historique de séances ou d'activités, TOUJOURS respecter l'ordre chronologique (de la plus ancienne à la plus récente). Utilise les dates/jours pour structurer clairement la timeline.

5. ENREGISTREMENT DES DONNÉES — RÈGLE ABSOLUE :
   ⚠️ Tu ne peux JAMAIS confirmer un enregistrement en texte sans avoir appelé l'outil correspondant dans CE tour.
   - Si tu dois enregistrer quelque chose → appelle l'outil DANS TA RÉPONSE (tool_use), puis confirme APRÈS le résultat.
   - INTERDIT de répondre "c'est noté/enregistré/sauvegardé" sans un tool_use dans le même message.
   - Si tu n'es pas sûr → demande confirmation SANS prétendre avoir enregistré.
   - Quand l'utilisateur dit "ajoute", "enregistre", "note", "oui", "ok", "vas-y" → appelle l'outil IMMÉDIATEMENT, ne génère JAMAIS juste du texte.
   - Flux normal : Analyse → récap → demande confirmation → L'UTILISATEUR confirme → tool_use → texte de confirmation

6. GESTION BDD :
   - Pour modifier → get_recent_meals ou get_recent_workout_sessions d'abord pour l'ID, puis update
   - Pour supprimer → toujours récupérer l'élément avant de supprimer, confirmer avec l'utilisateur
   - Pour corriger une séance → get_recent_workout_sessions → get_workout_exercises → update_workout_exercise

═══════════════════════════════
PÉRIMÈTRE & GARDE-FOUS
═══════════════════════════════
Tu es EXCLUSIVEMENT un coach nutrition, entraînement sportif, récupération et bien-être physique.

HORS PÉRIMÈTRE — tu refuses poliment et rediriges :
- Diagnostic médical, prescriptions, traitements, pathologies → "Je ne suis pas médecin, consulte un professionnel de santé."
- Questions juridiques, financières, politiques, techniques (code, etc.)
- Tout sujet sans rapport avec la santé physique et la forme

SITUATION DE CRISE — si l'utilisateur exprime des pensées suicidaires, de l'automutilation, ou une détresse psychologique grave :
1. Réponds avec empathie et bienveillance en 1-2 phrases
2. Donne le numéro d'aide : "En France, le 3114 (numéro national de prévention du suicide) est disponible 24h/24. Tu peux aussi contacter le 114 par SMS."
3. NE TENTE PAS de jouer au thérapeute — oriente vers un professionnel
4. Ne pose pas de question de coaching après — termine ta réponse là

LIMITES DE COMPÉTENCE :
- Tu peux donner des conseils généraux de nutrition et d'entraînement
- Tu ne prescris PAS de régimes thérapeutiques (cétogène médical, régime pour diabète, etc.)
- Si un utilisateur mentionne une pathologie (diabète, troubles alimentaires, etc.), tu recommandes un suivi médical EN PLUS de tes conseils généraux

═══════════════════════════════
FORMAT DES RÉPONSES
═══════════════════════════════
- Commence par un emoji + accroche courte
- Paragraphes courts, lignes vides entre sections
- Chiffres importants en **gras**
- Listes à puces pour énumérer
- Maximum 3 sections par réponse
- Termine par une question ou une invitation à l'action

TYPES DE REPAS :
breakfast=petit-déj (~8h), morning_snack=collation matin (~10h30), lunch=déjeuner (~12h30), afternoon_snack=goûter (~16h), dinner=dîner (~19h30), dessert=dessert (~20h30)
"goûter" = afternoon_snack (JAMAIS morning_snack)`;
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { messages, imageUrl } = await req.json() as { messages: any[]; imageUrl?: string };
    if (!messages || !Array.isArray(messages)) throw new Error("messages[] requis");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabase.auth.getClaims(token);
    let userId = claimsData?.claims?.sub as string;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return new Response(JSON.stringify({ error: "Authentification invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      userId = user.id;
    }

    // ── Rate limit: max 50 user messages per day ──
    const DAILY_MESSAGE_LIMIT = 50;
    const todayForLimit = getLocalDate();
    const { count: todayMsgCount } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", `${todayForLimit}T00:00:00`)
      .lte("created_at", `${todayForLimit}T23:59:59`);

    if ((todayMsgCount || 0) >= DAILY_MESSAGE_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Tu as atteint la limite de ${DAILY_MESSAGE_LIMIT} messages par jour. Reviens demain ! 💪` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build context ──
    const today = getLocalDate();
    const yesterdayJs = new Date(); yesterdayJs.setDate(yesterdayJs.getDate() - 1);
    const yesterday = `${yesterdayJs.getFullYear()}-${String(yesterdayJs.getMonth() + 1).padStart(2, "0")}-${String(yesterdayJs.getDate()).padStart(2, "0")}`;
    const currentTime = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const [yearS, monthS, dayS] = today.split("-");
    const displayDate = new Date(parseInt(yearS), parseInt(monthS) - 1, parseInt(dayS));
    const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    const formattedDate = `${dayNames[displayDate.getDay()]} ${displayDate.getDate()} ${monthNames[displayDate.getMonth()]} ${displayDate.getFullYear()}`;
    const dow = displayDate.getDay();
    const diffMon = dow === 0 ? 6 : dow - 1;
    const mondayDate = new Date(displayDate); mondayDate.setDate(displayDate.getDate() - diffMon);
    const sundayDate = new Date(mondayDate); sundayDate.setDate(mondayDate.getDate() + 6);
    const mondayStr = `${mondayDate.getFullYear()}-${String(mondayDate.getMonth() + 1).padStart(2, "0")}-${String(mondayDate.getDate()).padStart(2, "0")}`;
    const sundayStr = `${sundayDate.getFullYear()}-${String(sundayDate.getMonth() + 1).padStart(2, "0")}-${String(sundayDate.getDate()).padStart(2, "0")}`;

    // Fetch user data in parallel — tout en une seule vague pour éviter les allers-retours outils au démarrage
    const [profileRes, healthCtxRes, preparedWkRes, recentSessionsRes, chatCountRes, todayMetricsRes, todayMealsRes] = await Promise.all([
      supabase.from("profiles").select("first_name, goal, weight_kg, target_weight_kg, height_cm, activity_level, current_body_fat_pct, target_body_fat_pct, target_calories, target_water_ml").eq("user_id", userId).maybeSingle(),
      supabase.from("user_context").select("key, value").eq("user_id", userId).like("key", "health_%"),
      supabase.from("user_context").select("value, updated_at").eq("user_id", userId).eq("key", "prepared_workout").maybeSingle(),
      supabase.from("workout_sessions").select("id, workout_name, started_at, target_muscles, total_duration_seconds").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("daily_metrics").select("water_ml, weight, calories_in, calories_burned").eq("user_id", userId).eq("date", today).maybeSingle(),
      supabase.from("nutrition_logs").select("meal_type, food_name, calories, protein, carbs, fat, logged_at").eq("user_id", userId).gte("logged_at", `${today}T00:00:00`).lte("logged_at", `${today}T23:59:59`).order("logged_at", { ascending: true }),
    ]);

    const profile = profileRes.data;
    const healthContexts = healthCtxRes.data || [];
    const recentSessions = recentSessionsRes.data || [];
    const chatCount = chatCountRes.count || 0;
    const isFirstSession = chatCount <= 1;

    // Résumé du jour pré-chargé (évite un aller-retour outil pour chaque message)
    const todayMeals = todayMealsRes.data || [];
    const todayMetrics = todayMetricsRes.data;
    const todayCalories = todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
    const todayProtein = todayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0);
    const todayWater = todayMetrics?.water_ml || 0;
    const targetCalories = profile?.target_calories || 2000;
    const targetWater = profile?.target_water_ml || 2000;
    const hasTodayData = todayMeals.length > 0 || todayWater > 0;

    const todayContext = `═══════════════════════════════
DONNÉES DU JOUR (${today} — pré-chargées)
═══════════════════════════════
${hasTodayData ? `- Calories consommées : ${todayCalories} / ${targetCalories} kcal
- Protéines : ${todayProtein}g (objectif ~${Math.round((profile?.weight_kg || 70) * 2)}g)
- Hydratation : ${todayWater}ml / ${targetWater}ml
- Repas enregistrés : ${todayMeals.length} (${todayMeals.map((m: any) => m.food_name).join(", ") || "aucun"})` : `- Aucune donnée renseignée pour aujourd'hui.
⚠️ RÈGLE IMPORTANTE : si calories=0, eau=0 ou repas=0, NE PAS conclure que l'utilisateur n'a rien mangé/bu. Il n'a simplement pas encore renseigné ses données. Dire plutôt : "N'hésite pas à me renseigner tes repas/ta consommation d'eau pour que je puisse t'accompagner plus précisément !" Même règle pour les séances non renseignées.`}
`;

    // Build userContext string
    let userContext = "";
    if (profile) {
      const goalLabels: Record<string, string> = { weight_loss: "perte de poids", fat_loss: "perte de masse grasse", muscle_gain: "prise de muscle", maintain: "maintien", recomposition: "recomposition corporelle", wellness: "bien-être général" };
      userContext = `═══════════════════════════════
PROFIL UTILISATEUR
═══════════════════════════════
- Prénom : ${profile.first_name || "Non renseigné"}
- Objectif : ${goalLabels[profile.goal || ""] || profile.goal || "Non renseigné"}
- Poids actuel : ${profile.weight_kg || "?"}kg | Poids cible : ${profile.target_weight_kg || "?"}kg
- Taille : ${profile.height_cm || "?"}cm
${profile.current_body_fat_pct ? `- Masse grasse de départ : ${profile.current_body_fat_pct}%` : ""}
${profile.target_body_fat_pct ? `- Masse grasse cible : ${profile.target_body_fat_pct}%` : ""}`;
    }

    // Build healthContext string
    let healthContext = "";
    if (healthContexts.length > 0) {
      const parsed = healthContexts.map((c: any) => {
        try { const p = JSON.parse(c.value); return { key: c.key.replace(/^health_[^_]+_/, ""), category: p.category, description: p.description, severity: p.severity }; }
        catch { return null; }
      }).filter(Boolean);
      if (parsed.length > 0) {
        healthContext = `═══════════════════════════════
CONTEXTE SANTÉ & PRÉFÉRENCES SAUVEGARDÉES
═══════════════════════════════
${parsed.map((c: any) => `- [${c.category}/${c.severity}] ${c.description}`).join("\n")}`;
      }
    }

    // Build workoutHistoryContext
    let workoutHistoryContext = "";
    if (recentSessions.length > 0) {
      const sessionIds = recentSessions.map((s: any) => s.id);
      const { data: exLogs } = await supabase.from("workout_exercise_logs").select("session_id, exercise_name, actual_sets, actual_reps, actual_weight").eq("user_id", userId).in("session_id", sessionIds).order("exercise_order", { ascending: true });
      const bySession: Record<string, any[]> = {};
      (exLogs || []).forEach((e: any) => { if (!bySession[e.session_id]) bySession[e.session_id] = []; bySession[e.session_id].push(e); });
      workoutHistoryContext = `═══════════════════════════════
HISTORIQUE DES 10 DERNIÈRES SÉANCES
═══════════════════════════════
${recentSessions.map((s: any) => {
  const d = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" }).format(new Date(s.started_at));
  const exs = (bySession[s.id] || []).map((e: any) => `${e.exercise_name}(${e.actual_sets || "?"}x${e.actual_reps || "?"}${e.actual_weight ? "@" + e.actual_weight : ""})`).join(", ");
  return `- ${d} | ${s.workout_name} [${(s.target_muscles || []).join(", ")}] | ${exs || "détail non dispo"}`;
}).join("\n")}`;
    }

    // Build preparedWorkoutContext
    let preparedWorkoutContext = "";
    if (preparedWkRes.data?.value) {
      try {
        const pw = JSON.parse(preparedWkRes.data.value);
        preparedWorkoutContext = `═══════════════════════════════
SÉANCE ACTUELLEMENT PRÉPARÉE (visible dans l'aperçu)
═══════════════════════════════
- Nom : ${pw.workout_name} (~${pw.estimated_duration_min} min)
- Muscles : ${(pw.target_muscles || []).join(", ")}
- Exercices : ${(pw.exercises || []).slice(0, 8).map((e: any) => e.name).join(", ")}
${pw.coach_advice ? `- Conseil : ${pw.coach_advice}` : ""}`;
      } catch { /* ignore */ }
    }

    const systemPrompt = buildSystemPrompt({ today, yesterday, currentTime, formattedDate, mondayStr, sundayStr, userContext, healthContext, preparedWorkoutContext, workoutHistoryContext, todayContext, isFirstSession });

    // Prepare messages for Claude (filter system messages, handle images)
    const MAX_MESSAGES = 20;
    const recentMessages = messages.slice(-MAX_MESSAGES).filter((m: any) => m.role === "user" || m.role === "assistant");

    // Build Claude messages, injecting tool_use/tool_result pairs from saved history.
    // For assistant messages with tool_calls, we reconstruct the agentic loop:
    //   assistant: [tool_use blocks]  →  user: [tool_result blocks]  →  assistant: "final text"
    // This gives Claude examples of its own prior tool usage, reinforcing the tool-calling pattern.
    const claudeMessages: Array<{ role: string; content: any }> = [];
    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const isLastUserMsg = imageUrl && i === recentMessages.length - 1 && msg.role === "user";
      const hasToolHistory = msg.role === "assistant" && msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length >= 2;

      if (hasToolHistory) {
        // Inject tool interactions BEFORE the final assistant text.
        // tool_calls = [{ role: "assistant", content: [tool_use...] }, { role: "user", content: [tool_result...] }, ...]
        for (const tc of msg.tool_calls) {
          claudeMessages.push({ role: tc.role, content: tc.content });
        }
        // Then push the final assistant text (what was actually shown to the user)
        claudeMessages.push({ role: "assistant", content: msg.content });
      } else if (isLastUserMsg) {
        claudeMessages.push({ role: "user", content: [{ type: "image", source: { type: "url", url: imageUrl } }, { type: "text", text: msg.content || "Analyse cette image" }] });
      } else {
        claudeMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // ── Streaming SSE response with Claude API ──
    const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" };

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendSSE = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const executedActions: any[] = [];
          const toolHistory: Array<{ role: string; content: any }> = []; // Track tool_use/tool_result pairs for conversation persistence
          let conversationMessages: Array<{ role: string; content: unknown }> = [...claudeMessages];
          const MAX_ITERATIONS = 5;
          let iteration = 0;
          let finalContent = "";

          while (iteration < MAX_ITERATIONS) {
            iteration++;
            const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "anthropic-beta": "prompt-caching-2024-07-31",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                stream: true,
                system: [
                  {
                    type: "text",
                    text: systemPrompt,
                    cache_control: { type: "ephemeral" },
                  },
                ],
                tools,
                messages: conversationMessages,
              }),
            });

            if (!claudeRes.ok) {
              const errText = await claudeRes.text();
              console.error("Claude API error:", claudeRes.status, errText);
              if (claudeRes.status === 429) {
                sendSSE("error", { message: "Trop de requêtes, réessaie dans un moment." });
                sendSSE("done", {});
                controller.close();
                return;
              }
              throw new Error(`Claude API error: ${claudeRes.status}`);
            }

            // Parse Claude's SSE stream
            const reader = claudeRes.body!.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = "";
            let iterationText = "";
            const toolUseBlocks: Array<{ id: string; name: string; input: any }> = [];
            let currentToolUse: { id: string; name: string } | null = null;
            let currentToolJson = "";
            let stopReason = "";

            sendSSE("content_start", {});

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              sseBuffer += decoder.decode(value, { stream: true });
              const chunks = sseBuffer.split("\n\n");
              sseBuffer = chunks.pop() || "";

              for (const chunk of chunks) {
                const dataLine = chunk.split("\n").find((l: string) => l.startsWith("data: "));
                if (!dataLine) continue;
                const jsonStr = dataLine.slice(6).trim();
                if (jsonStr === "[DONE]") continue;

                try {
                  const evt = JSON.parse(jsonStr);

                  if (evt.type === "content_block_start" && evt.content_block?.type === "tool_use") {
                    currentToolUse = { id: evt.content_block.id, name: evt.content_block.name };
                    currentToolJson = "";
                  }

                  if (evt.type === "content_block_delta") {
                    if (evt.delta?.type === "text_delta") {
                      iterationText += evt.delta.text;
                      sendSSE("content_delta", { text: evt.delta.text });
                    } else if (evt.delta?.type === "input_json_delta") {
                      currentToolJson += evt.delta.partial_json;
                    }
                  }

                  if (evt.type === "content_block_stop" && currentToolUse) {
                    let parsedInput = {};
                    try { parsedInput = JSON.parse(currentToolJson); } catch { /* ignore */ }
                    toolUseBlocks.push({ id: currentToolUse.id, name: currentToolUse.name, input: parsedInput });
                    currentToolUse = null;
                    currentToolJson = "";
                  }

                  if (evt.type === "message_delta") {
                    stopReason = evt.delta?.stop_reason || "";
                  }
                } catch { /* skip malformed SSE events */ }
              }
            }

            console.log(`Iteration ${iteration} - stop_reason: ${stopReason}, tools: ${toolUseBlocks.length}, text_len: ${iterationText.length}`);
            if (iterationText) finalContent = iterationText;

            // If done (no more tools), break
            if (stopReason === "end_turn" || toolUseBlocks.length === 0) break;

            // Build assistant content for conversation history
            const assistantContent: any[] = [];
            if (iterationText) assistantContent.push({ type: "text", text: iterationText });
            for (const tu of toolUseBlocks) assistantContent.push({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input });
            conversationMessages.push({ role: "assistant", content: assistantContent });

            // Execute tools
            const toolResults: any[] = [];
            for (const toolUse of toolUseBlocks) {
              console.log(`Executing tool: ${toolUse.name}`);
              const result = await executeToolCall(supabase, userId, toolUse.name, toolUse.input);
              executedActions.push({ name: toolUse.name, result });
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
            }

            conversationMessages.push({ role: "user", content: toolResults });

            // Track tool interactions for conversation persistence
            toolHistory.push(
              { role: "assistant", content: toolUseBlocks.map(tu => ({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input })) },
              { role: "user", content: toolResults },
            );
          }

          // Fallback if no text was generated
          if (!finalContent?.trim()) {
            const fallback = executedActions.length > 0 ? executedActions.map((a) => a.result.message).join("\n\n") : "✅ C'est fait !";
            sendSSE("content_start", {});
            sendSSE("content_delta", { text: fallback });
            finalContent = fallback;
          }

          // Send executed actions
          if (executedActions.length > 0) sendSSE("actions", executedActions);

          // Send tool history for conversation persistence
          if (toolHistory.length > 0) sendSSE("tool_history", toolHistory);

          // Generate suggested replies (runs AFTER main content is already visible to user)
          try {
            const lastExchanges = recentMessages.slice(-4).map((m: any) => `${m.role === "user" ? "Utilisateur" : "Coach"}: ${String(m.content).slice(0, 200)}`).join("\n");
            const suggestRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 200,
                system: `Tu génères des suggestions de réponses courtes pour un chat de coaching fitness en français.
Règles STRICTES :
- Retourne UNIQUEMENT un tableau JSON : ["suggestion1", "suggestion2", "suggestion3"]
- 2 à 4 suggestions, max 35 caractères chacune
- Si le coach pose une question avec des options → les suggestions SONT ces options
- Si le coach demande confirmation → "Oui, go ! ✅" et une alternative
- Si le coach donne un conseil/résumé → propose des relances naturelles et pertinentes
- JAMAIS de "Merci 😊", "Super !", "Noté ✅" si le coach attend une réponse précise
- Les suggestions doivent être des RÉPONSES DIRECTES et UTILES au dernier message du coach`,
                messages: [{ role: "user", content: `Échanges récents:\n${lastExchanges}\n\nDernier message du coach:\n${finalContent.slice(0, 400)}\n\nGénère 2-4 suggestions de réponses.` }],
              }),
            });

            if (suggestRes.ok) {
              const suggestData = await suggestRes.json();
              const raw = suggestData.content?.[0]?.text || "";
              const match = raw.match(/\[[\s\S]*?\]/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                  const replies = parsed.filter((s: any) => typeof s === "string" && s.length > 1 && s.length <= 40).slice(0, 4);
                  sendSSE("suggested_replies", replies);
                }
              }
            }
          } catch (e) { console.error("Suggestions error:", e); }

          sendSSE("done", {});
        } catch (error) {
          console.error("Stream error:", error);
          sendSSE("error", { message: error instanceof Error ? error.message : "Erreur inconnue" });
          sendSSE("done", {});
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: sseHeaders });

  } catch (error) {
    console.error("Coach chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});