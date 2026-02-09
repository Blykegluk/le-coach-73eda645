// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── Zod validation schemas for tool call arguments ───
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const timeSchema = z.string().max(10).optional();

const toolSchemas: Record<string, z.ZodSchema> = {
  log_water: z.object({
    amount_ml: z.number().positive().max(10000),
    date: dateSchema,
  }),
  remove_water: z.object({
    amount_ml: z.number().positive().max(10000),
    date: dateSchema,
  }),
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
  get_recent_meals: z.object({
    limit: z.number().int().positive().max(50).optional(),
  }),
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
  delete_meal: z.object({
    meal_id: z.string().uuid(),
  }),
  get_recent_activities: z.object({
    limit: z.number().int().positive().max(50).optional(),
  }),
  update_activity: z.object({
    activity_id: z.string().uuid(),
    activity_type: z.string().min(1).max(100).optional(),
    duration_min: z.number().positive().max(600).optional(),
    calories_burned: z.number().nonnegative().max(10000).optional(),
    distance_km: z.number().nonnegative().max(500).optional(),
    notes: z.string().max(1000).optional(),
  }),
  delete_activity: z.object({
    activity_id: z.string().uuid(),
  }),
  get_daily_summary: z.object({
    date: dateSchema,
  }),
  log_weight: z.object({
    weight_kg: z.number().positive().min(20).max(300),
  }),
  log_activity: z.object({
    activity_type: z.string().min(1).max(100),
    duration_min: z.number().positive().max(600),
    calories_burned: z.number().nonnegative().max(10000).optional(),
    distance_km: z.number().nonnegative().max(500).optional(),
    notes: z.string().max(1000).optional(),
    date: dateSchema,
  }),
  log_body_fat: z.object({
    body_fat_pct: z.number().positive().max(80),
  }),
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
  get_body_composition_history: z.object({
    limit: z.number().int().positive().max(50).optional(),
  }),
  save_health_context: z.object({
    category: z.string().min(1).max(100),
    key: z.string().min(1).max(200),
    value: z.string().min(1).max(2000),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  }),
  get_health_context: z.object({}),
  generate_workout: z.object({
    target_muscles: z.array(z.string().max(50)).optional(),
    duration_min: z.number().positive().max(180).optional(),
    difficulty: z.string().max(20).optional(),
    equipment: z.array(z.string().max(50)).optional(),
  }),
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MEAL_DEFAULT_TIMES: Record<string, string> = {
  breakfast: "08:00",
  morning_snack: "10:30",
  lunch: "12:30",
  afternoon_snack: "16:00",
  dinner: "19:30",
  dessert: "20:30",
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "petit-déjeuner",
  morning_snack: "collation",
  lunch: "déjeuner",
  afternoon_snack: "goûter",
  dinner: "dîner",
  dessert: "dessert",
};

function normalizeTimeToHHMM(input?: string): string | null {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;

  // Supported examples: "17:30", "17h30", "17 h 30", "17h"
  const full = raw.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})$/);
  const hourOnly = raw.match(/^(\d{1,2})\s*h$/);

  const toHHMM = (h: number, m: number) => {
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  if (full) return toHHMM(parseInt(full[1], 10), parseInt(full[2], 10));
  if (hourOnly) return toHHMM(parseInt(hourOnly[1], 10), 0);

  // Fallback: already HH:MM?
  const hhmm = raw.match(/^(\d{2}):(\d{2})$/);
  if (hhmm) return toHHMM(parseInt(hhmm[1], 10), parseInt(hhmm[2], 10));

  return null;
}

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
// Helper to get date in Europe/Paris timezone
function getLocalDate(dateStr?: string): string {
  if (dateStr) {
    // Validate format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
  }
  // Get current date in Paris timezone
  const now = new Date();
  const parisTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parisTime; // Returns YYYY-MM-DD format
}

const tools = [
  {
    type: "function",
    function: {
      name: "log_water",
      description: "Enregistre une consommation d'eau pour l'utilisateur. Par défaut, enregistre sur la date du jour (heure de Paris). Peut aussi enregistrer sur une date passée si spécifié.",
      parameters: {
        type: "object",
        properties: {
          amount_ml: {
            type: "number",
            description: "Quantité d'eau en millilitres (250 = 1 verre)",
          },
          date: {
            type: "string",
            description: "Date d'enregistrement au format YYYY-MM-DD. Si non spécifié, utilise aujourd'hui (heure de Paris). Utiliser pour enregistrer rétroactivement (ex: 'hier' → date d'hier).",
          },
        },
        required: ["amount_ml"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_water",
      description: "Retire/corrige une consommation d'eau pour une date donnée. Utiliser quand l'utilisateur a fait une erreur de saisie et veut retirer de l'eau.",
      parameters: {
        type: "object",
        properties: {
          amount_ml: {
            type: "number",
            description: "Quantité d'eau à retirer en millilitres (nombre positif)",
          },
          date: {
            type: "string",
            description: "Date au format YYYY-MM-DD. Si non spécifié, utilise aujourd'hui (heure de Paris).",
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
            enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert"],
            description: "Type de repas SELON LE CONTEXTE FRANÇAIS: breakfast (petit-déjeuner ~8h), morning_snack (collation du matin ~10h30), lunch (déjeuner ~12h30), afternoon_snack (goûter ~16h, entre déjeuner et dîner), dinner (dîner ~19h30), dessert (~20h30)",
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
          estimated_time: {
            type: "string",
            description: "Heure estimée du repas au format HH:MM (ex: '16:00' pour un goûter, '08:00' pour petit-déjeuner). Utilise l'heure typique du type de repas si non précisé.",
          },
          date: {
            type: "string",
            description: "Date du repas au format YYYY-MM-DD. Utiliser si l'utilisateur mentionne une date passée (ex: 'hier', 'vendredi dernier'). Par défaut: aujourd'hui.",
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
          meal_type: {
            type: "string",
            enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "dessert"],
            description: "Nouveau type de repas (optionnel). Exemple: 'afternoon_snack' quand l'utilisateur dit 'goûter'.",
          },
          food_name: {
            type: "string",
            description: "Nouveau nom/description du repas (optionnel)",
          },
          estimated_time: {
            type: "string",
            description: "Heure estimée du repas au format HH:MM (ex: '17:30'). Si précisée, met à jour logged_at.",
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
      description: "Récupère le résumé de la journée en cours (AUJOURD'HUI) de l'utilisateur (calories, protéines, eau, poids, repas, activités). Utilise cet outil quand l'utilisateur demande son bilan, ses stats du jour, où il en est, combien de protéines/calories il a consommé aujourd'hui.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date au format YYYY-MM-DD. Par défaut: aujourd'hui. Utiliser uniquement si l'utilisateur demande explicitement une autre date (ex: 'hier', 'lundi dernier').",
          },
        },
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
          date: {
            type: "string",
            description: "Date de la séance au format YYYY-MM-DD. Utiliser si l'utilisateur mentionne une date passée (ex: 'hier', 'vendredi dernier'). Par défaut: aujourd'hui.",
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
      description: "Enregistre le pourcentage de masse grasse simple (utiliser log_body_composition pour des mesures complètes d'impédancemètre)",
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
  {
    type: "function",
    function: {
      name: "log_body_composition",
      description: "Enregistre une mesure complète d'impédancemètre/balance connectée avec toutes les métriques corporelles. Utiliser quand l'utilisateur donne plusieurs valeurs (poids, masse grasse, masse musculaire, etc.)",
      parameters: {
        type: "object",
        properties: {
          weight_kg: {
            type: "number",
            description: "Poids en kg",
          },
          body_fat_pct: {
            type: "number",
            description: "Pourcentage de masse grasse (%)",
          },
          muscle_mass_kg: {
            type: "number",
            description: "Masse musculaire en kg",
          },
          lean_mass_kg: {
            type: "number",
            description: "Masse maigre (sans graisse) en kg",
          },
          bone_mass_kg: {
            type: "number",
            description: "Masse osseuse en kg",
          },
          water_pct: {
            type: "number",
            description: "Pourcentage d'eau corporelle (%)",
          },
          bmi: {
            type: "number",
            description: "Indice de masse corporelle (IMC)",
          },
          bmr_kcal: {
            type: "number",
            description: "Métabolisme de base en kcal",
          },
          visceral_fat_index: {
            type: "number",
            description: "Indice de graisse viscérale (1-59)",
          },
          body_age: {
            type: "number",
            description: "Âge métabolique/corporel",
          },
          protein_pct: {
            type: "number",
            description: "Taux de protéines (%)",
          },
          protein_kg: {
            type: "number",
            description: "Masse de protéines en kg",
          },
          subcutaneous_fat_pct: {
            type: "number",
            description: "Graisse sous-cutanée (%)",
          },
          fat_mass_kg: {
            type: "number",
            description: "Masse grasse en kg",
          },
          skeletal_muscle_pct: {
            type: "number",
            description: "Taux de muscle squelettique (%)",
          },
          standard_weight_kg: {
            type: "number",
            description: "Poids idéal/standard selon la balance",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_body_composition_history",
      description: "Récupère l'historique des mesures d'impédancemètre pour voir l'évolution",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de mesures à récupérer (défaut: 5)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_health_context",
      description: "Enregistre une information de santé importante sur l'utilisateur (blessures, allergies, conditions médicales, préférences, contraintes physiques, etc.). Ces informations seront retenues pour personnaliser les conseils futurs.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["injury", "allergy", "medical_condition", "physical_limitation", "preference", "lifestyle", "other"],
            description: "Catégorie de l'information: injury (blessure), allergy (allergie alimentaire), medical_condition (condition médicale), physical_limitation (limitation physique), preference (préférence), lifestyle (mode de vie), other (autre)",
          },
          key: {
            type: "string",
            description: "Identifiant court et clair pour cette information (ex: 'hernies_discales', 'allergie_gluten', 'vegetarien')",
          },
          value: {
            type: "string",
            description: "Description détaillée de l'information avec contexte (ex: '2 hernies discales L4-L5 il y a 3 ans, fragilité persistante lors d'exercices intenses type CrossFit/Hyrox')",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Niveau d'importance: low (à noter), medium (adapter les conseils), high (précautions importantes), critical (contre-indication stricte)",
          },
        },
        required: ["category", "key", "value", "severity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_health_context",
      description: "Récupère toutes les informations de santé enregistrées sur l'utilisateur",
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
      name: "delete_health_context",
      description: "Supprime une information de santé qui n'est plus d'actualité",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "L'identifiant de l'information à supprimer",
          },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_workout",
      description: "Génère un programme d'entraînement personnalisé pour la prochaine séance. Utiliser quand l'utilisateur demande une séance, veut changer de focus (haut du corps, bas du corps, cardio, etc.), ou demande des adaptations.",
      parameters: {
        type: "object",
        properties: {
          focus: {
            type: "string",
            description: "Focus de la séance: 'upper_body' (haut du corps), 'lower_body' (bas du corps), 'full_body' (corps entier), 'push' (poussée), 'pull' (tirage), 'cardio', 'core' (abdos), ou un groupe musculaire spécifique",
          },
          intensity: {
            type: "string",
            enum: ["light", "moderate", "intense"],
            description: "Intensité souhaitée: light (récupération), moderate (normal), intense (dépassement)",
          },
          duration_min: {
            type: "number",
            description: "Durée souhaitée en minutes (optionnel, défaut: 45-60)",
          },
          exclude_exercises: {
            type: "array",
            items: { type: "string" },
            description: "Exercices à éviter (optionnel)",
          },
          special_request: {
            type: "string",
            description: "Demande spéciale de l'utilisateur (ex: 'plus de cardio', 'exercices sans machine', 'focus biceps')",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_workout_sessions",
      description: "Récupère les séances d'entraînement récentes de l'utilisateur avec leurs détails",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Nombre de séances à récupérer (défaut: 5)",
          },
          date: {
            type: "string",
            description: "Date spécifique au format YYYY-MM-DD pour filtrer (optionnel). Utiliser pour 'hier', 'lundi dernier', etc.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workout_exercises",
      description: "Récupère les exercices détaillés d'une séance spécifique",
      parameters: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description: "ID de la séance (obtenu via get_recent_workout_sessions)",
          },
        },
        required: ["session_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_workout_exercise",
      description: "Modifie un exercice d'une séance d'entraînement. Utiliser get_workout_exercises d'abord pour obtenir l'ID.",
      parameters: {
        type: "object",
        properties: {
          exercise_id: {
            type: "string",
            description: "ID de l'exercice à modifier (obtenu via get_workout_exercises)",
          },
          actual_sets: {
            type: "number",
            description: "Nombre de séries réellement effectuées",
          },
          actual_reps: {
            type: "string",
            description: "Répétitions réellement effectuées (ex: '10-10-8' ou '12')",
          },
          actual_weight: {
            type: "string",
            description: "Poids réellement utilisé (ex: '80kg' ou '70-75-80')",
          },
          notes: {
            type: "string",
            description: "Notes ou commentaires sur l'exercice",
          },
          skipped: {
            type: "boolean",
            description: "Marquer l'exercice comme sauté",
          },
        },
        required: ["exercise_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_workout_exercise",
      description: "Supprime un exercice d'une séance",
      parameters: {
        type: "object",
        properties: {
          exercise_id: {
            type: "string",
            description: "ID de l'exercice à supprimer",
          },
        },
        required: ["exercise_id"],
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
  const today = getLocalDate(); // Use Paris timezone

  console.log(`Executing tool: ${name}`, args);

  try {
    switch (name) {
      case "log_water": {
        // Use specified date or default to today (Paris timezone)
        const targetDate = getLocalDate(args.date);
        
        // Get current water and add to it
        const { data: current } = await supabase
          .from("daily_metrics")
          .select("water_ml")
          .eq("user_id", userId)
          .eq("date", targetDate)
          .maybeSingle();

        const currentWater = current?.water_ml || 0;
        const newTotal = currentWater + args.amount_ml;

        const { error } = await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: targetDate,
            water_ml: newTotal,
          },
          { onConflict: "user_id,date" }
        );

        if (error) throw error;
        
        const isToday = targetDate === today;
        const dateLabel = isToday ? "" : ` (${targetDate})`;
        
        return {
          success: true,
          message: `💧 ${args.amount_ml}ml d'eau ajoutés${dateLabel} (total: ${newTotal}ml)`,
          data: { total: newTotal, date: targetDate },
        };
      }

      case "remove_water": {
        // Use specified date or default to today (Paris timezone)
        const targetDate = getLocalDate(args.date);
        
        // Get current water
        const { data: current } = await supabase
          .from("daily_metrics")
          .select("water_ml")
          .eq("user_id", userId)
          .eq("date", targetDate)
          .maybeSingle();

        const currentWater = current?.water_ml || 0;
        const newTotal = Math.max(0, currentWater - args.amount_ml);

        const { error } = await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: targetDate,
            water_ml: newTotal,
          },
          { onConflict: "user_id,date" }
        );

        if (error) throw error;
        
        const isToday = targetDate === today;
        const dateLabel = isToday ? "" : ` (${targetDate})`;
        
        return {
          success: true,
          message: `💧 ${args.amount_ml}ml d'eau retirés${dateLabel} (nouveau total: ${newTotal}ml)`,
          data: { total: newTotal, date: targetDate, removed: args.amount_ml },
        };
      }

      case "log_meal": {
        // Calculate logged_at based on meal type and estimated time
        // Use estimated_time if provided, otherwise use default for meal type
        const timeToUse =
          normalizeTimeToHHMM(args.estimated_time) ||
          MEAL_DEFAULT_TIMES[args.meal_type] ||
          "12:00";

        // Backward compatibility in case a model still outputs "snack"
        let normalizedMealType = args.meal_type;
        if (normalizedMealType === "snack") {
          const hour = parseInt(String(timeToUse).split(":")[0] || "12", 10);
          normalizedMealType = hour >= 14 ? "afternoon_snack" : "morning_snack";
        }

        const dateToUse = args.date || today;
        const loggedAt = `${dateToUse}T${timeToUse}:00`;
        
        const { error } = await supabase.from("nutrition_logs").insert({
          user_id: userId,
          meal_type: normalizedMealType,
          food_name: args.food_name,
          calories: args.calories || 0,
          protein: args.protein || 0,
          carbs: args.carbs || 0,
          fat: args.fat || 0,
          logged_at: loggedAt,
        });

        if (error) throw error;

        // Also update daily calories
        const { data: currentMetrics } = await supabase
          .from("daily_metrics")
          .select("calories_in")
          .eq("user_id", userId)
          .eq("date", dateToUse)
          .maybeSingle();

        const currentCals = currentMetrics?.calories_in || 0;
        const newCalories = currentCals + (args.calories || 0);

        await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: dateToUse,
            calories_in: newCalories,
          },
          { onConflict: "user_id,date" }
        );

        return {
          success: true,
          message: `🍽️ ${args.food_name} enregistré en ${MEAL_TYPE_LABELS[normalizedMealType] || normalizedMealType} (${args.calories} kcal)`,
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
          .select("calories, food_name, logged_at, meal_type")
          .eq("id", args.meal_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!currentMeal) {
          return { success: false, message: "Repas non trouvé" };
        }

        const updates: any = {};
        if (args.meal_type !== undefined) updates.meal_type = args.meal_type;
        if (args.food_name !== undefined) updates.food_name = args.food_name;
        if (args.calories !== undefined) updates.calories = args.calories;
        if (args.protein !== undefined) updates.protein = args.protein;
        if (args.carbs !== undefined) updates.carbs = args.carbs;
        if (args.fat !== undefined) updates.fat = args.fat;

        // If the user specifies an hour (or changes meal type), update logged_at accordingly
        const currentLoggedAtStr = String(currentMeal.logged_at || `${today}T12:00:00`);
        const mealDate = currentLoggedAtStr.includes("T")
          ? currentLoggedAtStr.split("T")[0]
          : today;

        let timeToUse: string | null = normalizeTimeToHHMM(args.estimated_time);

        // If meal type changed but no explicit time, snap to typical time to place it in the right slot.
        if (
          !timeToUse &&
          args.meal_type !== undefined &&
          args.meal_type !== currentMeal.meal_type
        ) {
          timeToUse = MEAL_DEFAULT_TIMES[args.meal_type] || null;
        }

        if (timeToUse) {
          updates.logged_at = `${mealDate}T${timeToUse}:00`;
        }

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
            .eq("date", mealDate)
            .maybeSingle();

          const newCalories = (metrics?.calories_in || 0) + calorieDiff;
          await supabase.from("daily_metrics").upsert(
            { user_id: userId, date: mealDate, calories_in: Math.max(0, newCalories) },
            { onConflict: "user_id,date" }
          );
        }

        const nextMealType = updates.meal_type || currentMeal.meal_type;
        const nextTime = updates.logged_at
          ? String(updates.logged_at).split("T")[1]?.slice(0, 5)
          : null;
        const movedSuffix =
          args.meal_type !== undefined || args.estimated_time !== undefined
            ? ` → ${MEAL_TYPE_LABELS[nextMealType] || nextMealType}${nextTime ? ` (${nextTime})` : ""}`
            : "";

        return {
          success: true,
          message: `✏️ "${currentMeal.food_name}" mis à jour${movedSuffix}${args.protein ? ` (${args.protein}g protéines)` : ""}`,
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
        // Support custom date or default to today
        const queryDate = args.date || today;
        
        const { data: metrics } = await supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", userId)
          .eq("date", queryDate)
          .maybeSingle();

        const { data: meals } = await supabase
          .from("nutrition_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", `${queryDate}T00:00:00`)
          .lte("logged_at", `${queryDate}T23:59:59`)
          .order("logged_at", { ascending: true });

        const { data: activities } = await supabase
          .from("activities")
          .select("*")
          .eq("user_id", userId)
          .gte("performed_at", `${queryDate}T00:00:00`)
          .lte("performed_at", `${queryDate}T23:59:59`);

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

        // Calculate totals directly from nutrition_logs (more accurate than daily_metrics.calories_in)
        const totalCalories = (meals || []).reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
        const totalProtein = (meals || []).reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
        const totalCarbs = (meals || []).reduce((sum: number, m: any) => sum + (m.carbs || 0), 0);
        const totalFat = (meals || []).reduce((sum: number, m: any) => sum + (m.fat || 0), 0);
        const totalCaloriesBurned = (activities || []).reduce((sum: number, a: any) => sum + (a.calories_burned || 0), 0);

        // Compute protein goal (2g per kg body weight)
        const weight = profile?.weight_kg || 70;
        const proteinGoal = Math.round(weight * 2);

        const isToday = queryDate === today;
        const dateLabel = isToday ? "aujourd'hui" : queryDate;

        return {
          success: true,
          message: `Résumé du ${dateLabel} récupéré`,
          data: {
            date: queryDate,
            is_today: isToday,
            // Nutrition from actual logs
            calories_consumed: totalCalories,
            protein_consumed: totalProtein,
            carbs_consumed: totalCarbs,
            fat_consumed: totalFat,
            target_calories: profile?.target_calories || 2000,
            protein_goal: proteinGoal,
            // Activity
            calories_burned: totalCaloriesBurned,
            // Hydration
            water_ml: metrics?.water_ml || 0,
            target_water_ml: profile?.target_water_ml || 2000,
            // Weight & body composition
            weight: metrics?.weight || profile?.weight_kg,
            target_weight: profile?.target_weight_kg,
            goal: profile?.goal,
            current_body_fat_pct: profile?.current_body_fat_pct,
            target_body_fat_pct: profile?.target_body_fat_pct,
            latest_body_fat: latestBodyFat?.body_fat_pct,
            latest_body_fat_date: latestBodyFat?.date,
            // Details
            meals_count: meals?.length || 0,
            meals: (meals || []).map((m: any) => ({
              id: m.id,
              meal_type: m.meal_type,
              food_name: m.food_name,
              calories: m.calories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              logged_at: m.logged_at,
            })),
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
        // Estimate calories if not provided based on activity type and duration
        let caloriesBurned = args.calories_burned;
        if (!caloriesBurned) {
          // Get user weight for better estimation
          const { data: profile } = await supabase
            .from("profiles")
            .select("weight_kg")
            .eq("user_id", userId)
            .maybeSingle();
          
          const weight = profile?.weight_kg || 70; // default 70kg
          const duration = args.duration_min;
          const activityLower = args.activity_type.toLowerCase();
          
          // MET values for different activities (calories = MET * weight * hours)
          let met = 4; // default moderate activity
          if (activityLower.includes("course") || activityLower.includes("running") || activityLower.includes("jogging")) {
            met = 8;
          } else if (activityLower.includes("musculation") || activityLower.includes("muscu") || activityLower.includes("poids") || activityLower.includes("weight")) {
            met = 5;
          } else if (activityLower.includes("hiit") || activityLower.includes("crossfit") || activityLower.includes("hyrox")) {
            met = 10;
          } else if (activityLower.includes("vélo") || activityLower.includes("cycling") || activityLower.includes("bike")) {
            met = 7;
          } else if (activityLower.includes("natation") || activityLower.includes("swimming") || activityLower.includes("nage")) {
            met = 7;
          } else if (activityLower.includes("yoga") || activityLower.includes("stretching") || activityLower.includes("pilates")) {
            met = 3;
          } else if (activityLower.includes("marche") || activityLower.includes("walk")) {
            met = 3.5;
          } else if (activityLower.includes("rameur") || activityLower.includes("rowing")) {
            met = 7;
          } else if (activityLower.includes("boxe") || activityLower.includes("boxing") || activityLower.includes("combat")) {
            met = 9;
          } else if (activityLower.includes("escalade") || activityLower.includes("climbing")) {
            met = 8;
          } else if (activityLower.includes("elliptique") || activityLower.includes("elliptical")) {
            met = 5;
          }
          
          caloriesBurned = Math.round(met * weight * (duration / 60));
        }

        const { error } = await supabase.from("activities").insert({
          user_id: userId,
          activity_type: args.activity_type,
          duration_min: args.duration_min,
          calories_burned: caloriesBurned,
          distance_km: args.distance_km || null,
          notes: args.notes || null,
          performed_at: args.date ? `${args.date}T12:00:00` : new Date().toISOString(),
        });

        if (error) throw error;

        // Also update daily calories burned
        const activityDate = args.date || today;
        const { data: currentMetrics } = await supabase
          .from("daily_metrics")
          .select("calories_burned")
          .eq("user_id", userId)
          .eq("date", activityDate)
          .maybeSingle();

        const currentBurned = currentMetrics?.calories_burned || 0;
        const newBurned = currentBurned + caloriesBurned;

        await supabase.from("daily_metrics").upsert(
          {
            user_id: userId,
            date: activityDate,
            calories_burned: newBurned,
          },
          { onConflict: "user_id,date" }
        );

        return {
          success: true,
          message: `🏋️ ${args.activity_type} enregistré (${args.duration_min} min, ~${caloriesBurned} kcal brûlées)`,
          data: { ...args, calories_burned: caloriesBurned },
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

      case "log_body_composition": {
        // Build the record with all provided values
        const record: Record<string, unknown> = {
          user_id: userId,
          measured_at: new Date().toISOString(),
        };
        
        // Map all possible fields
        const fieldMappings: Record<string, string> = {
          weight_kg: "weight_kg",
          body_fat_pct: "body_fat_pct",
          muscle_mass_kg: "muscle_mass_kg",
          lean_mass_kg: "lean_mass_kg",
          bone_mass_kg: "bone_mass_kg",
          water_pct: "water_pct",
          bmi: "bmi",
          bmr_kcal: "bmr_kcal",
          visceral_fat_index: "visceral_fat_index",
          body_age: "body_age",
          protein_pct: "protein_pct",
          protein_kg: "protein_kg",
          subcutaneous_fat_pct: "subcutaneous_fat_pct",
          fat_mass_kg: "fat_mass_kg",
          skeletal_muscle_pct: "skeletal_muscle_pct",
          standard_weight_kg: "standard_weight_kg",
        };
        
        let metricsCount = 0;
        for (const [argKey, dbKey] of Object.entries(fieldMappings)) {
          if (args[argKey] !== undefined && args[argKey] !== null) {
            record[dbKey] = args[argKey];
            metricsCount++;
          }
        }
        
        if (metricsCount === 0) {
          return { success: false, message: "Aucune métrique fournie" };
        }

        const { error } = await supabase.from("body_composition").insert(record);
        if (error) throw error;

        // Also update daily_metrics with weight and body fat if provided
        if (args.weight_kg || args.body_fat_pct) {
          const dailyUpdate: Record<string, unknown> = {
            user_id: userId,
            date: today,
          };
          if (args.weight_kg) dailyUpdate.weight = args.weight_kg;
          if (args.body_fat_pct) dailyUpdate.body_fat_pct = args.body_fat_pct;
          
          await supabase.from("daily_metrics").upsert(dailyUpdate, { onConflict: "user_id,date" });
        }

        // Update profile weight if provided
        if (args.weight_kg) {
          await supabase.from("profiles").update({ weight_kg: args.weight_kg }).eq("user_id", userId);
        }

        // Get last measurement for comparison
        const { data: previous } = await supabase
          .from("body_composition")
          .select("weight_kg, body_fat_pct, muscle_mass_kg, measured_at")
          .eq("user_id", userId)
          .order("measured_at", { ascending: false })
          .range(1, 1)
          .maybeSingle();

        let comparisonMsg = "";
        if (previous) {
          const changes: string[] = [];
          if (args.weight_kg && previous.weight_kg) {
            const diff = args.weight_kg - previous.weight_kg;
            if (Math.abs(diff) >= 0.1) {
              changes.push(`poids ${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`);
            }
          }
          if (args.body_fat_pct && previous.body_fat_pct) {
            const diff = args.body_fat_pct - previous.body_fat_pct;
            if (Math.abs(diff) >= 0.1) {
              changes.push(`masse grasse ${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`);
            }
          }
          if (args.muscle_mass_kg && previous.muscle_mass_kg) {
            const diff = args.muscle_mass_kg - previous.muscle_mass_kg;
            if (Math.abs(diff) >= 0.1) {
              changes.push(`muscle ${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`);
            }
          }
          if (changes.length > 0) {
            comparisonMsg = ` Évolution: ${changes.join(", ")}`;
          }
        }

        // Build summary of what was recorded
        const recorded: string[] = [];
        if (args.weight_kg) recorded.push(`${args.weight_kg}kg`);
        if (args.body_fat_pct) recorded.push(`${args.body_fat_pct}% gras`);
        if (args.muscle_mass_kg) recorded.push(`${args.muscle_mass_kg}kg muscle`);
        if (args.lean_mass_kg) recorded.push(`${args.lean_mass_kg}kg maigre`);
        if (args.bmi) recorded.push(`IMC ${args.bmi}`);
        if (args.bmr_kcal) recorded.push(`BMR ${args.bmr_kcal}kcal`);
        if (args.visceral_fat_index) recorded.push(`graisse viscérale ${args.visceral_fat_index}`);
        if (args.body_age) recorded.push(`âge corporel ${args.body_age}`);

        return {
          success: true,
          message: `📊 Mesure complète enregistrée (${metricsCount} métriques): ${recorded.slice(0, 4).join(", ")}${recorded.length > 4 ? "..." : ""}${comparisonMsg}`,
          data: record,
        };
      }

      case "get_body_composition_history": {
        const limit = args.limit || 5;
        const { data: measurements, error } = await supabase
          .from("body_composition")
          .select("*")
          .eq("user_id", userId)
          .order("measured_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        // Get profile targets for context
        const { data: profile } = await supabase
          .from("profiles")
          .select("target_weight_kg, target_body_fat_pct, target_muscle_mass_kg, current_body_fat_pct")
          .eq("user_id", userId)
          .maybeSingle();

        const formatted = (measurements || []).map((m: Record<string, unknown>) => ({
          date: new Date(m.measured_at as string).toLocaleDateString("fr-FR"),
          weight_kg: m.weight_kg,
          body_fat_pct: m.body_fat_pct,
          muscle_mass_kg: m.muscle_mass_kg,
          lean_mass_kg: m.lean_mass_kg,
          bmi: m.bmi,
          bmr_kcal: m.bmr_kcal,
          visceral_fat_index: m.visceral_fat_index,
          body_age: m.body_age,
        }));

        return {
          success: true,
          message: `${formatted.length} mesure(s) trouvée(s)`,
          data: {
            measurements: formatted,
            targets: profile ? {
              target_weight_kg: profile.target_weight_kg,
              target_body_fat_pct: profile.target_body_fat_pct,
              starting_body_fat_pct: profile.current_body_fat_pct,
              target_muscle_mass_kg: profile.target_muscle_mass_kg,
            } : null,
          },
        };
      }

      case "save_health_context": {
        // Check if this key already exists
        const { data: existing } = await supabase
          .from("user_context")
          .select("id")
          .eq("user_id", userId)
          .eq("key", `health_${args.category}_${args.key}`)
          .maybeSingle();

        const contextValue = JSON.stringify({
          category: args.category,
          description: args.value,
          severity: args.severity,
          recorded_at: new Date().toISOString(),
        });

        if (existing) {
          // Update existing entry
          const { error } = await supabase
            .from("user_context")
            .update({ value: contextValue, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          
          if (error) throw error;
          
          return {
            success: true,
            message: `📋 Information mise à jour: ${args.key}`,
            data: { key: args.key, category: args.category },
          };
        } else {
          // Insert new entry
          const { error } = await supabase.from("user_context").insert({
            user_id: userId,
            key: `health_${args.category}_${args.key}`,
            value: contextValue,
          });

          if (error) throw error;

          const severityEmojis: Record<string, string> = {
            low: "📝",
            medium: "⚠️",
            high: "🔶",
            critical: "🚨",
          };

          return {
            success: true,
            message: `${severityEmojis[args.severity] || "📋"} Information de santé enregistrée: ${args.key} (${args.category})`,
            data: { key: args.key, category: args.category, severity: args.severity },
          };
        }
      }

      case "get_health_context": {
        const { data: contexts, error } = await supabase
          .from("user_context")
          .select("key, value, updated_at")
          .eq("user_id", userId)
          .like("key", "health_%");

        if (error) throw error;

        const formatted = (contexts || []).map((c: { key: string; value: string; updated_at: string }) => {
          try {
            const parsed = JSON.parse(c.value);
            return {
              key: c.key.replace(/^health_[^_]+_/, ""),
              category: parsed.category,
              description: parsed.description,
              severity: parsed.severity,
              recorded_at: parsed.recorded_at,
            };
          } catch {
            return {
              key: c.key,
              description: c.value,
              category: "other",
              severity: "medium",
            };
          }
        });

        return {
          success: true,
          message: `${formatted.length} information(s) de santé trouvée(s)`,
          data: formatted,
        };
      }

      case "delete_health_context": {
        // Find and delete the context entry
        const { data: deleted, error } = await supabase
          .from("user_context")
          .delete()
          .eq("user_id", userId)
          .like("key", `health_%_${args.key}`)
          .select("key");

        if (error) throw error;

        if (!deleted || deleted.length === 0) {
          return {
            success: false,
            message: `Information "${args.key}" non trouvée`,
          };
        }

        return {
          success: true,
          message: `🗑️ Information supprimée: ${args.key}`,
        };
      }

      case "generate_workout": {
        // Get user profile and goals
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        // Get recent activities (last 2 weeks)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        const { data: activities } = await supabase
          .from("activities")
          .select("*")
          .eq("user_id", userId)
          .gte("performed_at", twoWeeksAgo.toISOString())
          .order("performed_at", { ascending: false });

        // Get health context (injuries, limitations)
        const { data: healthContext } = await supabase
          .from("user_context")
          .select("*")
          .eq("user_id", userId);

        // Get user's available equipment
        const equipmentContext = healthContext?.find((c: { key: string }) => c.key === "gym_equipment");
        const availableEquipment = equipmentContext?.value || "Standard gym equipment";

        // Build context
        const goal = profile?.goal || "general_fitness";
        const injuries = healthContext?.filter((c: { key: string }) => 
          c.key.includes("injury") || c.key.includes("limitation") || c.key.includes("blessure")
        ) || [];

        const recentWorkoutTypes = activities?.map((a: { activity_type: string }) => a.activity_type) || [];
        const lastWorkout = activities?.[0];
        const daysSinceLastWorkout = lastWorkout 
          ? Math.floor((Date.now() - new Date(lastWorkout.performed_at).getTime()) / (1000 * 60 * 60 * 24))
          : 7;

        // Count workout types in last 2 weeks for balance
        const workoutCounts: Record<string, number> = {};
        recentWorkoutTypes.forEach((type: string) => {
          const normalized = type.toLowerCase();
          if (normalized.includes("jambes") || normalized.includes("leg") || normalized.includes("squat")) {
            workoutCounts["legs"] = (workoutCounts["legs"] || 0) + 1;
          } else if (normalized.includes("dos") || normalized.includes("back") || normalized.includes("tirage")) {
            workoutCounts["back"] = (workoutCounts["back"] || 0) + 1;
          } else if (normalized.includes("pec") || normalized.includes("chest") || normalized.includes("poitrine")) {
            workoutCounts["chest"] = (workoutCounts["chest"] || 0) + 1;
          } else if (normalized.includes("épaule") || normalized.includes("shoulder")) {
            workoutCounts["shoulders"] = (workoutCounts["shoulders"] || 0) + 1;
          } else if (normalized.includes("bras") || normalized.includes("biceps") || normalized.includes("triceps") || normalized.includes("arm")) {
            workoutCounts["arms"] = (workoutCounts["arms"] || 0) + 1;
          } else if (normalized.includes("cardio") || normalized.includes("course") || normalized.includes("vélo")) {
            workoutCounts["cardio"] = (workoutCounts["cardio"] || 0) + 1;
          } else {
            workoutCounts["full_body"] = (workoutCounts["full_body"] || 0) + 1;
          }
        });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
          return { success: false, message: "GEMINI_API_KEY not configured" };
        }

        // Build focus instruction based on args
        let focusInstruction = "";
        if (args.focus) {
          const focusMap: Record<string, string> = {
            upper_body: "haut du corps (pectoraux, dos, épaules, bras)",
            lower_body: "bas du corps (quadriceps, ischio-jambiers, mollets, fessiers)",
            full_body: "corps entier (exercices polyarticulaires)",
            push: "mouvements de poussée (pectoraux, épaules, triceps)",
            pull: "mouvements de tirage (dos, biceps)",
            cardio: "cardio et endurance",
            core: "abdominaux et gainage",
          };
          focusInstruction = `\nFOCUS DEMANDÉ: ${focusMap[args.focus] || args.focus}`;
        }

        let intensityInstruction = "";
        if (args.intensity) {
          const intensityMap: Record<string, string> = {
            light: "Légère - récupération active, poids légers, repos longs",
            moderate: "Modérée - charge standard, 60-75% du max",
            intense: "Intense - charge lourde, 80-90% du max, techniques d'intensification",
          };
          intensityInstruction = `\nINTENSITÉ: ${intensityMap[args.intensity] || args.intensity}`;
        }

        const systemPrompt = `Tu es un coach fitness expert. Tu dois générer un programme d'entraînement personnalisé.

PROFIL UTILISATEUR:
- Objectif: ${goal === "lose_fat" ? "Perte de gras" : goal === "build_muscle" ? "Prise de muscle" : goal === "maintain" ? "Maintien" : "Forme générale"}
- Poids actuel: ${profile?.weight_kg || "Non renseigné"} kg
- Poids cible: ${profile?.target_weight_kg || "Non renseigné"} kg

CONTRAINTES DE SANTÉ:
${injuries.length > 0 ? injuries.map((i: { value: string }) => `- ${i.value}`).join("\n") : "Aucune contrainte particulière"}

ÉQUIPEMENT DISPONIBLE:
${availableEquipment}

HISTORIQUE RÉCENT (2 semaines):
- Dernière séance: ${lastWorkout ? `${lastWorkout.activity_type} il y a ${daysSinceLastWorkout} jour(s)` : "Aucune séance récente"}
- Répartition: ${Object.entries(workoutCounts).map(([k, v]) => `${k}: ${v}x`).join(", ") || "Aucune donnée"}
${focusInstruction}
${intensityInstruction}
${args.special_request ? `\nDEMANDE SPÉCIALE: ${args.special_request}` : ""}
${args.exclude_exercises?.length ? `\nEXERCICES À ÉVITER: ${args.exclude_exercises.join(", ")}` : ""}
${args.duration_min ? `\nDURÉE SOUHAITÉE: ${args.duration_min} minutes` : ""}

RÈGLES:
1. Propose 4-6 exercices adaptés
2. Pour chaque exercice: nom, séries, répétitions, poids recommandé
3. Équilibre les groupes musculaires selon l'historique et le focus demandé
4. Adapte l'intensité au niveau de récupération
5. Respecte ABSOLUMENT les contraintes de santé

IMPORTANT: Retourne un JSON valide avec cette structure exacte:
{
  "workout_name": "Nom de la séance",
  "target_muscles": ["groupe1", "groupe2"],
  "estimated_duration_min": 45,
  "exercises": [
    {
      "name": "Nom de l'exercice",
      "sets": 3,
      "reps": "10-12",
      "weight_recommendation": "70% du max ou 20kg",
      "rest_seconds": 90,
      "notes": "Conseil technique optionnel"
    }
  ],
  "warmup_notes": "Conseil d'échauffement",
  "coach_advice": "Conseil personnalisé pour cette séance"
}`;

        const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Génère ma prochaine séance d'entraînement selon les paramètres." },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI gateway error:", aiResponse.status);
          return { success: false, message: "Erreur lors de la génération du workout" };
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content;

        if (!content) {
          return { success: false, message: "Pas de réponse de l'IA" };
        }

        // Parse the JSON response
        let workout;
        try {
          workout = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            workout = JSON.parse(jsonMatch[0]);
          } else {
            return { success: false, message: "Format de réponse invalide" };
          }
        }

        return {
          success: true,
          message: `💪 Séance générée: ${workout.workout_name} (~${workout.estimated_duration_min} min, ${workout.exercises?.length || 0} exercices)`,
          data: { workout, type: "workout_generated" },
        };
      }

      case "get_recent_workout_sessions": {
        const limit = args.limit || 5;
        let query = supabase
          .from("workout_sessions")
          .select("id, workout_name, started_at, completed_at, status, target_muscles, total_duration_seconds, notes")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(limit);

        // Filter by specific date if provided
        if (args.date) {
          const targetDate = getLocalDate(args.date);
          query = query
            .gte("started_at", `${targetDate}T00:00:00`)
            .lt("started_at", `${targetDate}T23:59:59`);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        const formattedSessions = (sessions || []).map((s: any) => ({
          id: s.id,
          workout_name: s.workout_name,
          started_at: s.started_at,
          completed_at: s.completed_at,
          status: s.status,
          target_muscles: s.target_muscles,
          duration_min: s.total_duration_seconds ? Math.round(s.total_duration_seconds / 60) : null,
          notes: s.notes,
          time_ago: getTimeAgo(s.started_at),
        }));

        return {
          success: true,
          message: `${formattedSessions.length} séance(s) trouvée(s)`,
          data: formattedSessions,
        };
      }

      case "get_workout_exercises": {
        const { data: exercises, error } = await supabase
          .from("workout_exercise_logs")
          .select("id, exercise_name, exercise_order, planned_sets, planned_reps, planned_weight, actual_sets, actual_reps, actual_weight, rest_seconds, notes, skipped")
          .eq("session_id", args.session_id)
          .eq("user_id", userId)
          .order("exercise_order", { ascending: true });

        if (error) throw error;

        const formattedExercises = (exercises || []).map((e: any) => ({
          id: e.id,
          exercise_name: e.exercise_name,
          order: e.exercise_order,
          planned: {
            sets: e.planned_sets,
            reps: e.planned_reps,
            weight: e.planned_weight,
          },
          actual: {
            sets: e.actual_sets,
            reps: e.actual_reps,
            weight: e.actual_weight,
          },
          rest_seconds: e.rest_seconds,
          notes: e.notes,
          skipped: e.skipped,
        }));

        return {
          success: true,
          message: `${formattedExercises.length} exercice(s) dans cette séance`,
          data: formattedExercises,
        };
      }

      case "update_workout_exercise": {
        // Get current exercise to show what was changed
        const { data: currentExercise } = await supabase
          .from("workout_exercise_logs")
          .select("exercise_name, actual_sets, actual_reps, actual_weight")
          .eq("id", args.exercise_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!currentExercise) {
          return { success: false, message: "Exercice non trouvé" };
        }

        const updates: any = {};
        if (args.actual_sets !== undefined) updates.actual_sets = args.actual_sets;
        if (args.actual_reps !== undefined) updates.actual_reps = args.actual_reps;
        if (args.actual_weight !== undefined) updates.actual_weight = args.actual_weight;
        if (args.notes !== undefined) updates.notes = args.notes;
        if (args.skipped !== undefined) updates.skipped = args.skipped;

        const { error } = await supabase
          .from("workout_exercise_logs")
          .update(updates)
          .eq("id", args.exercise_id)
          .eq("user_id", userId);

        if (error) throw error;

        const changes: string[] = [];
        if (args.actual_sets !== undefined) changes.push(`${args.actual_sets} séries`);
        if (args.actual_reps !== undefined) changes.push(`${args.actual_reps} reps`);
        if (args.actual_weight !== undefined) changes.push(`${args.actual_weight}`);

        return {
          success: true,
          message: `✏️ "${currentExercise.exercise_name}" corrigé: ${changes.join(", ") || "mis à jour"}`,
          data: updates,
        };
      }

      case "delete_workout_exercise": {
        const { data: exercise } = await supabase
          .from("workout_exercise_logs")
          .select("exercise_name")
          .eq("id", args.exercise_id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!exercise) {
          return { success: false, message: "Exercice non trouvé" };
        }

        const { error } = await supabase
          .from("workout_exercise_logs")
          .delete()
          .eq("id", args.exercise_id)
          .eq("user_id", userId);

        if (error) throw error;

        return {
          success: true,
          message: `🗑️ "${exercise.exercise_name}" supprimé de la séance`,
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Parse body first (can only call req.json() once)
    const { messages, imageUrl } = (await req.json()) as {
      messages: ChatMessage[];
      imageUrl?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Authenticate the user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentification invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Get user profile for context
    let userContext = "";
    let healthContext = "";
    
    if (userId) {
      // Fetch profile and health context in parallel
      const [profileResult, healthContextResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, goal, weight_kg, target_weight_kg, height_cm, activity_level, current_body_fat_pct, target_body_fat_pct")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_context")
          .select("key, value")
          .eq("user_id", userId)
          .like("key", "health_%"),
      ]);

      const profile = profileResult.data;
      const healthContexts = healthContextResult.data;

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

      // Parse health context
      if (healthContexts && healthContexts.length > 0) {
        const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const parsedContexts = healthContexts
          .map((c: { key: string; value: string }) => {
            try {
              const parsed = JSON.parse(c.value);
              return {
                key: c.key.replace(/^health_[^_]+_/, ""),
                category: parsed.category,
                description: parsed.description,
                severity: parsed.severity,
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .sort((a: any, b: any) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

        if (parsedContexts.length > 0) {
          const categoryLabels: Record<string, string> = {
            injury: "🩹 Blessure",
            allergy: "🚫 Allergie",
            medical_condition: "🏥 Condition médicale",
            physical_limitation: "⚠️ Limitation physique",
            preference: "✅ Préférence",
            lifestyle: "🏠 Mode de vie",
            other: "📋 Autre",
          };
          
          healthContext = `
INFORMATIONS DE SANTÉ IMPORTANTES (à prendre en compte pour tous les conseils):
${parsedContexts.map((c: any) => `- ${categoryLabels[c.category] || c.category}: ${c.description} [Importance: ${c.severity}]`).join("\n")}
`;
        }
      }
    }

    // Build current date/time context for the AI using Paris timezone
    const today = getLocalDate();
    // Get yesterday's date
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDate(
      `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`
    );
    
    // Get current time in Paris
    const currentTime = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    
    const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    
    // Parse the date for display
    const [yearStr, monthStr, dayStr] = today.split("-");
    const displayDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    const dayName = dayNames[displayDate.getDay()];
    const dayOfMonth = displayDate.getDate();
    const monthName = monthNames[displayDate.getMonth()];
    const year = displayDate.getFullYear();
    const formattedDate = `${dayName} ${dayOfMonth} ${monthName} ${year}`;

    const systemPrompt = `Tu es un coach santé et fitness bienveillant et motivant. Tu parles français de manière naturelle et encourageante.

⏰ **DATE ET HEURE ACTUELLES (fuseau Paris):**
- **Aujourd'hui:** ${formattedDate}
- **Date d'aujourd'hui:** ${today}
- **Date d'hier:** ${yesterday}
- **Heure:** ${currentTime}

GESTION DES DATES (CRITIQUE):
- Quand l'utilisateur parle d'"hier", utilise la date: ${yesterday}
- Quand l'utilisateur parle d'"aujourd'hui", utilise la date: ${today}
- Pour log_water avec une date passée, spécifie le paramètre "date" (ex: {"amount_ml": 500, "date": "${yesterday}"})
- Pour RETIRER de l'eau (erreur de saisie), utilise remove_water avec une quantité négative ou positive selon le contexte
- TOUJOURS vérifier sur quelle date l'utilisateur veut que tu enregistres les données !

IMPORTANT: Quand l'utilisateur te demande des informations sur "aujourd'hui", "ce jour", "maintenant", utilise TOUJOURS la date ci-dessus (${today}). Les données sont stockées avec des timestamps, tu dois TOUJOURS utiliser l'outil get_daily_summary pour récupérer les données du jour en cours.

${userContext}
${healthContext}

STYLE DE RÉPONSE (ABSOLUMENT OBLIGATOIRE):
Tu dois TOUJOURS formater tes réponses de manière aérée et agréable à lire :

📌 **RÈGLES DE FORMATAGE:**
1. **Commence** chaque réponse par un emoji + une phrase d'accroche courte
2. **Laisse une ligne vide** entre chaque paragraphe/section
3. Utilise des **listes à puces** (- élément) pour énumérer
4. Mets en **gras** les chiffres importants et mots-clés
5. Utilise des emojis thématiques : 💪 🏋️ 🥗 🎯 ✅ 💧 ⚡ 🔥 📊 🌟 ❤️ 🚀
6. Maximum **3 sections courtes** par réponse
7. Termine par un message motivant ou une question

📝 **EXEMPLE DE RÉPONSE PARFAITE:**

"🥗 Super choix pour le déjeuner !

**✅ Enregistré:**
- Salade César au poulet grillé
- **~450 kcal** • 35g protéines • 20g glucides

📊 **Ton bilan du jour:**
- Calories : **1 200** / 2 000 kcal
- Protéines : **85g** (objectif 120g)

🔥 Tu avances bien ! Encore un snack protéiné cet après-midi ?"

⚠️ NE JAMAIS écrire de longs blocs de texte sans espaces ni structure !

Ton rôle:
- Aider l'utilisateur à atteindre ses objectifs de santé
- Enregistrer ses repas, son hydratation, son poids ET ses séances de sport via les outils disponibles
- Enregistrer les mesures d'impédancemètre/balance connectée (composition corporelle complète)
- MODIFIER les données existantes quand l'utilisateur te corrige ou te donne plus de précisions
- Donner des conseils personnalisés et motivants

TYPES DE REPAS EN FRANCE (TRÈS IMPORTANT):
- **breakfast** = petit-déjeuner (~8h du matin)
- **morning_snack** = collation du matin (~10h30, AVANT le déjeuner)
- **lunch** = déjeuner (~12h30, repas du midi)
- **afternoon_snack** = goûter (~16h, APRÈS le déjeuner, AVANT le dîner) - utilisé quand l'utilisateur dit "goûter", "en-cas de l'après-midi", "4h"
- **dinner** = dîner (~19h30, repas du soir)
- **dessert** = dessert (~20h30, après le dîner)

⚠️ ATTENTION: "goûter" = afternoon_snack (PAS morning_snack). La collation du matin (morning_snack) est AVANT le déjeuner.

RÈGLES IMPORTANTES - CONFIRMATION AVANT ENREGISTREMENT (CRITIQUE):
Quand l'utilisateur te donne une information pertinente (repas, eau, activité, poids, mesure corporelle), tu dois:
1. **D'abord ANALYSER** l'information (estimer calories, macros, etc.)
2. **Présenter un récapitulatif** de ce que tu vas enregistrer
3. **DEMANDER CONFIRMATION** avec une phrase comme: "Je l'ajoute à tes données ?" ou "Tu veux que je l'enregistre ?"
4. **Attendre la confirmation** de l'utilisateur (oui, ok, vas-y, enregistre, etc.) AVANT d'utiliser les outils d'enregistrement

EXCEPTION - Pas besoin de confirmation quand:
- L'utilisateur dit EXPLICITEMENT "ajoute", "enregistre", "note", "log" dans son message initial
- L'utilisateur corrige une donnée existante (ex: "c'était 3 séries, pas 4")
- L'utilisateur a déjà confirmé dans un message précédent

Exemples:
- "Ce matin j'ai bu un jus de clémentines" → Analyse + "Je l'ajoute à ton petit-déjeuner ?" (ATTENDRE confirmation)
- "Ajoute un jus de clémentines à mon petit-déj" → Enregistrer directement (mot "ajoute" = confirmation implicite)
- Utilisateur: "Oui" après ta question → Enregistrer maintenant

AUTRES RÈGLES:
1. Quand l'utilisateur CORRIGE ou PRÉCISE une entrée précédente → utilise d'abord get_recent_meals ou get_recent_activities pour trouver l'entrée, puis update_meal ou update_activity
2. Si tu as un DOUTE sur si c'est un nouvel élément ou une correction → DEMANDE à l'utilisateur!
3. Quand l'utilisateur veut supprimer quelque chose → utilise delete_meal ou delete_activity

CORRECTIONS DE SÉANCES D'ENTRAÎNEMENT (TRÈS IMPORTANT):
Quand l'utilisateur veut corriger des données d'une séance passée (séries, répétitions, poids utilisé):
1) D'abord, utilise get_recent_workout_sessions avec le paramètre "date" si l'utilisateur mentionne "hier", "lundi", etc.
2) Ensuite, utilise get_workout_exercises avec l'ID de la séance pour voir les exercices
3) Enfin, utilise update_workout_exercise pour corriger les valeurs (actual_sets, actual_reps, actual_weight)

Exemples de corrections de séances:
- "Hier j'ai fait 3 séries au développé couché, pas 4" → get_recent_workout_sessions(date=hier) → get_workout_exercises → update_workout_exercise(actual_sets=3)
- "Sur le squat de ma dernière séance, c'était 100kg, pas 80kg" → get_recent_workout_sessions → get_workout_exercises → update_workout_exercise(actual_weight="100kg")
- "Retire le curl de la séance d'hier, je l'ai pas fait" → ... → delete_workout_exercise OU update_workout_exercise(skipped=true)

CORRECTIONS DE TYPE/HEURE DE REPAS (TRÈS IMPORTANT):
- Si l'utilisateur dit par ex. "c'était mon goûter de 17h30, pas une collation du matin" →
  1) get_recent_meals (pour identifier l'ID)
  2) update_meal avec meal_type = afternoon_snack ET estimated_time = "17:30" (et ajuste aussi food_name si nécessaire)

DÉTECTION ET SAUVEGARDE DES INFORMATIONS DE SANTÉ:
Quand l'utilisateur mentionne une information de santé importante, tu DOIS l'enregistrer avec save_health_context:
- **BLESSURES** (injury): hernies discales, entorses, fractures passées, douleurs chroniques
- **ALLERGIES** (allergy): allergies alimentaires, intolérances (lactose, gluten, etc.)
- **CONDITIONS MÉDICALES** (medical_condition): diabète, hypertension, asthme
- **LIMITATIONS PHYSIQUES** (physical_limitation): fragilité du dos, genoux sensibles
- **PRÉFÉRENCES** (preference): végétarien, sans porc, régime particulier
- **MODE DE VIE** (lifestyle): travail de nuit, beaucoup de déplacements

Évalue la sévérité:
- critical: contre-indication stricte
- high: précautions importantes
- medium: adapter les conseils
- low: à noter

IMPORTANT: Quand tu enregistres une info de santé, confirme à l'utilisateur que c'est noté.

ANALYSE D'IMAGES:
- Pour les **REPAS**: estime les calories et macros, puis utilise log_meal
- Pour les **MESURES D'IMPÉDANCEMÈTRE**: lis TOUTES les valeurs et utilise log_body_composition
- Pour les **PHOTOS DE CORPS**: encourage l'utilisateur, commente la progression

MESURES D'IMPÉDANCEMÈTRE:
- Compare avec les mesures précédentes (get_body_composition_history) pour montrer la progression
- Encourage l'utilisateur en fonction de son objectif

Quand il demande son bilan, utilise get_daily_summary puis commente les résultats de façon structurée.

Après avoir utilisé un outil, confirme l'action de manière naturelle et encourage l'utilisateur ! 🎯`;

    // Limit conversation history to prevent context overflow
    const MAX_MESSAGES = 30;
    const recentMessages = messages.length > MAX_MESSAGES 
      ? messages.slice(-MAX_MESSAGES) 
      : messages;
    
    console.log("Calling AI gateway with", recentMessages.length, "messages (original:", messages.length, ")", imageUrl ? "(with image)" : "");

    // Prepare messages - if there's an image, add it to the last user message
    const preparedMessages = recentMessages.map((msg, index) => {
      // If this is the last message and we have an image URL, make it multimodal
      if (imageUrl && index === recentMessages.length - 1 && msg.role === "user") {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content || "Analyse cette image" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        };
      }
      return msg;
    });

    // First API call - may include tool calls
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...preparedMessages],
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
      const followUpResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
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