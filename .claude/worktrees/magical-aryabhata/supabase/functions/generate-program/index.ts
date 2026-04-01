import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      goal = "general_fitness",
      difficulty = "intermediate",
      duration_weeks = 4,
      sessions_per_week = 3,
      focus_areas,
      equipment,
    } = body;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get health context (injuries, equipment, preferences)
    const { data: healthContext } = await supabase
      .from("user_context")
      .select("*")
      .eq("user_id", user.id);

    const injuries = healthContext?.filter(c =>
      c.key.includes("injury") || c.key.includes("limitation") || c.key.includes("blessure")
    ) || [];

    const equipmentContext = equipment || healthContext?.find(c => c.key === "gym_equipment")?.value || "Standard gym equipment";

    // Get recent workout sessions for personalization
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const { data: recentSessions } = await supabase
      .from("workout_sessions")
      .select("workout_name, duration_min, calories_burned, completed_at")
      .eq("user_id", user.id)
      .gte("completed_at", twoWeeksAgo.toISOString())
      .order("completed_at", { ascending: false })
      .limit(10);

    // Get personal records for weight calibration
    const { data: personalRecords } = await supabase
      .from("personal_records")
      .select("exercise_name, record_type, value")
      .eq("user_id", user.id)
      .eq("record_type", "max_weight");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const goalLabels: Record<string, string> = {
      lose_fat: "Perte de gras",
      build_muscle: "Prise de muscle",
      maintain: "Maintien de la forme",
      recomposition: "Recomposition corporelle",
      general_fitness: "Forme générale",
    };

    const systemPrompt = `Tu es un coach sportif expert en programmation d'entraînement. Tu dois créer un programme complet de ${duration_weeks} semaines avec ${sessions_per_week} séances par semaine.

PROFIL UTILISATEUR:
- Objectif: ${goalLabels[goal] || goal}
- Niveau: ${difficulty === "beginner" ? "Débutant" : difficulty === "intermediate" ? "Intermédiaire" : "Avancé"}
- Poids: ${profile?.weight_kg || "Non renseigné"} kg
- Poids cible: ${profile?.target_weight_kg || "Non renseigné"} kg
${focus_areas ? `- Zones prioritaires: ${focus_areas}` : ""}

CONTRAINTES DE SANTÉ:
${injuries.length > 0 ? injuries.map((i: { value: string }) => `- ${i.value}`).join("\n") : "Aucune contrainte"}

ÉQUIPEMENT:
${equipmentContext}

RECORDS PERSONNELS:
${personalRecords?.length ? personalRecords.map((pr: { exercise_name: string; value: number }) => `- ${pr.exercise_name}: ${pr.value}kg`).join("\n") : "Aucun PR enregistré"}

SÉANCES RÉCENTES:
${recentSessions?.length ? recentSessions.map((s: { workout_name: string; duration_min: number }) => `- ${s.workout_name} (${s.duration_min}min)`).join("\n") : "Aucune séance récente"}

RÈGLES DE PROGRAMMATION:
1. Progression linéaire: augmenter les charges de 2-5% chaque semaine (sauf deload)
2. Deload: prévoir une semaine allégée toutes les 3-4 semaines (volume -40%, intensité -20%)
3. Équilibrer push/pull/legs sur la semaine
4. 4-6 exercices par séance, durée 40-60 min
5. Adapter les poids aux PRs connus, sinon recommander en kg
6. Varier les exercices d'une semaine à l'autre tout en gardant les mouvements composés de base
7. Chaque séance doit avoir un nom descriptif et des muscles cibles clairs

IMPORTANT: Retourne un JSON valide avec cette structure exacte:
{
  "program_name": "Nom du programme",
  "description": "Description courte du programme",
  "progression_rules": {
    "weight_increment_pct": 3,
    "deload_every_n_weeks": 4,
    "deload_volume_reduction_pct": 40
  },
  "weeks": [
    {
      "week_number": 1,
      "focus": "hypertrophy",
      "is_deload": false,
      "notes": "Semaine d'adaptation",
      "sessions": [
        {
          "session_order": 1,
          "day_of_week": 1,
          "workout": {
            "workout_name": "Push - Pectoraux & Épaules",
            "target_muscles": ["pectoraux", "épaules", "triceps"],
            "estimated_duration_min": 50,
            "exercises": [
              {
                "name": "Développé couché",
                "sets": 4,
                "reps": "8-10",
                "weight_recommendation": "60kg",
                "rest_seconds": 90,
                "notes": "Contrôle la descente"
              }
            ],
            "warmup_notes": "5 min rameur + mobilité épaules",
            "coach_advice": "Conseil pour la séance"
          }
        }
      ]
    }
  ]
}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère un programme de ${duration_weeks} semaines, ${sessions_per_week} séances/semaine, objectif ${goalLabels[goal] || goal}, niveau ${difficulty}.` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content from AI");

    let program;
    try {
      program = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        program = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse program JSON");
      }
    }

    // ─── Persist to database ────────────────────────────────────────────
    // 1. Create the program
    const { data: programRow, error: programError } = await supabase
      .from("training_programs")
      .insert({
        user_id: user.id,
        name: program.program_name || `Programme ${duration_weeks} semaines`,
        description: program.description || null,
        goal,
        difficulty,
        duration_weeks,
        sessions_per_week,
        progression_rules: program.progression_rules || {},
      })
      .select()
      .single();

    if (programError || !programRow) {
      console.error("Error creating program:", programError);
      throw new Error("Failed to create program");
    }

    // 2. Create weeks and sessions
    for (const week of program.weeks || []) {
      const { data: weekRow, error: weekError } = await supabase
        .from("program_weeks")
        .insert({
          program_id: programRow.id,
          user_id: user.id,
          week_number: week.week_number,
          focus: week.focus || null,
          notes: week.notes || null,
          is_deload: week.is_deload || false,
        })
        .select()
        .single();

      if (weekError || !weekRow) {
        console.error("Error creating week:", weekError);
        continue;
      }

      for (const session of week.sessions || []) {
        const { error: sessionError } = await supabase
          .from("program_sessions")
          .insert({
            program_id: programRow.id,
            week_id: weekRow.id,
            user_id: user.id,
            session_order: session.session_order,
            day_of_week: session.day_of_week || null,
            workout_data: session.workout || {},
          });

        if (sessionError) {
          console.error("Error creating session:", sessionError);
        }
      }
    }

    // 3. Auto-match: check if today's completed workouts match the first session(s)
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todaySessions } = await supabase
        .from("workout_sessions")
        .select("id, workout_name, completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", todayStart.toISOString())
        .order("completed_at", { ascending: true });

      if (todaySessions && todaySessions.length > 0) {
        // Get first week's sessions (uncompleted)
        const { data: firstWeek } = await supabase
          .from("program_weeks")
          .select("id")
          .eq("program_id", programRow.id)
          .eq("week_number", 1)
          .single();

        if (firstWeek) {
          const { data: firstSessions } = await supabase
            .from("program_sessions")
            .select("id, session_order, workout_data")
            .eq("week_id", firstWeek.id)
            .is("completed_at", null)
            .order("session_order", { ascending: true })
            .limit(todaySessions.length);

          // Mark first N sessions as completed if user already trained today
          for (let i = 0; i < Math.min(todaySessions.length, (firstSessions || []).length); i++) {
            await supabase.from("program_sessions").update({
              completed_session_id: todaySessions[i].id,
              completed_at: todaySessions[i].completed_at,
            }).eq("id", firstSessions![i].id);
          }
        }
      }
    } catch (matchError) {
      // Non-fatal: program is still created, just without auto-matching
      console.error("Auto-match error (non-fatal):", matchError);
    }

    return new Response(JSON.stringify({
      program_id: programRow.id,
      program,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating program:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
