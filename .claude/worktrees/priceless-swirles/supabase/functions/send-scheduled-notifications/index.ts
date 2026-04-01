import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Scheduled notifications — meant to be triggered by a Supabase cron job.
 *
 * Checks each user with notifications_enabled=true and sends relevant
 * reminders based on their notification_preferences and the current time (Paris TZ).
 *
 * Call without auth — uses SUPABASE_SERVICE_ROLE_KEY internally.
 * Recommended cron: every hour between 7:00–22:00 Paris time.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current hour in Paris timezone
    const parisHour = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date())
    );
    const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const dayOfWeek = new Date().toLocaleDateString("en-US", { timeZone: "Europe/Paris", weekday: "long" }).toLowerCase();

    console.log(`[Scheduler] Hour: ${parisHour}, Date: ${parisDate}, Day: ${dayOfWeek}`);

    // Get users with notifications enabled who have push subscriptions
    const { data: subscribers } = await supabase
      .from("profiles")
      .select("user_id, first_name, notifications_enabled, notification_preferences, goal")
      .eq("notifications_enabled", true);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which users have actual push subscriptions
    const userIds = subscribers.map(s => s.user_id);
    const { data: pushSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", userIds);

    const usersWithPush = new Set((pushSubs || []).map(s => s.user_id));

    let totalSent = 0;

    for (const subscriber of subscribers) {
      if (!usersWithPush.has(subscriber.user_id)) continue;

      const prefs = (subscriber.notification_preferences as Record<string, boolean>) || {};
      const name = subscriber.first_name || "Coach";
      const notifications: Array<{ title: string; body: string; tag: string }> = [];

      // Meal reminders at specific hours
      if (prefs.meals !== false) {
        if (parisHour === 8) {
          notifications.push({
            title: "Petit-déjeuner",
            body: `${name}, n'oublie pas de logger ton petit-déj !`,
            tag: "meal-breakfast",
          });
        } else if (parisHour === 12) {
          notifications.push({
            title: "Déjeuner",
            body: "C'est l'heure de manger ! Log ton repas pour rester sur la bonne voie.",
            tag: "meal-lunch",
          });
        } else if (parisHour === 19) {
          notifications.push({
            title: "Dîner",
            body: "Bon appétit ! Pense à logger ton repas du soir.",
            tag: "meal-dinner",
          });
        }
      }

      // Workout reminder — check if they have a session today (program or standalone)
      if (prefs.workout !== false && parisHour === 10) {
        // Check for active program session today
        const { data: activeProgram } = await supabase
          .from("training_programs")
          .select("id, name, current_week")
          .eq("user_id", subscriber.user_id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (activeProgram) {
          const currentDayNum = new Date().getDay() || 7; // 1=Mon, 7=Sun
          const { data: todaySession } = await supabase
            .from("program_sessions")
            .select("id, workout_data")
            .eq("program_id", activeProgram.id)
            .eq("day_of_week", currentDayNum)
            .is("completed_at", null)
            .limit(1)
            .maybeSingle();

          if (todaySession) {
            const workoutName = (todaySession.workout_data as Record<string, unknown>)?.workout_name || "Séance";
            notifications.push({
              title: `Séance prévue : ${workoutName}`,
              body: `${name}, ta séance du programme "${activeProgram.name}" t'attend !`,
              tag: "workout-program",
            });
          }
        } else {
          // No active program — generic workout encouragement on certain days
          if (["monday", "wednesday", "friday"].includes(dayOfWeek)) {
            notifications.push({
              title: "C'est jour d'entraînement !",
              body: `${name}, une séance t'attend. Lance-la depuis l'app !`,
              tag: "workout-reminder",
            });
          }
        }
      }

      // Water reminder
      if (prefs.water !== false && [10, 14, 16].includes(parisHour)) {
        notifications.push({
          title: "Hydratation",
          body: "N'oublie pas de boire ! Objectif : 2L+ par jour.",
          tag: "water-reminder",
        });
      }

      // Weekly progress summary — Sunday evening
      if (prefs.progress !== false && dayOfWeek === "sunday" && parisHour === 19) {
        notifications.push({
          title: "Résumé de la semaine",
          body: `${name}, ton bilan hebdomadaire est prêt ! Regarde ta progression.`,
          tag: "weekly-summary",
        });
      }

      // Send all notifications for this user
      for (const notif of notifications) {
        try {
          const res = await supabase.functions.invoke("send-push", {
            body: {
              user_id: subscriber.user_id,
              title: notif.title,
              body: notif.body,
            },
          });
          if (!res.error) totalSent++;
        } catch (err) {
          console.error(`Error sending push to ${subscriber.user_id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent, subscribers: subscribers.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
