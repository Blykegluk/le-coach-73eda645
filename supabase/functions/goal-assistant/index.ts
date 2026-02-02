import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserContext {
  weight?: number;
  height?: number;
  activity_level?: string;
}

// Mapping of goal codes to labels
const GOAL_MAPPINGS: Record<string, string> = {
  weight_loss: "Perdre du poids",
  fat_loss: "Perdre en masse graisseuse",
  muscle_gain: "Prendre du muscle",
  maintain: "Maintenir mon poids",
  recomposition: "Recomposition corporelle",
  wellness: "Bien-être général",
};

interface ValidatedGoal {
  validated: boolean;
  goal_code: string;
  goal_label: string;
  target_weight: number | null;
  current_body_fat_pct: number | null;
  target_body_fat_pct: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = (await req.json()) as {
      messages: Message[];
      userContext?: UserContext;
    };

    console.log("Goal assistant called with", messages.length, "messages");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about user
    let contextInfo = "";
    if (userContext) {
      const parts: string[] = [];
      if (userContext.weight) parts.push(`poids actuel: ${userContext.weight} kg`);
      if (userContext.height) parts.push(`taille: ${userContext.height} cm`);
      if (userContext.activity_level) parts.push(`niveau d'activité: ${userContext.activity_level}`);
      if (parts.length > 0) {
        contextInfo = `\n\nContexte utilisateur:\n${parts.join("\n")}`;
      }
    }

    const systemPrompt = `Tu es un assistant de définition d'objectifs de santé et fitness. Tu aides les utilisateurs à définir leurs objectifs de manière SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporellement défini).

Tu dois analyser ce que l'utilisateur te dit et déterminer quel objectif correspond le mieux parmi les suivants:
- weight_loss: Perdre du poids (objectif principal = réduire le poids sur la balance)
- fat_loss: Perdre en masse graisseuse (focus sur la réduction du % de graisse corporelle)
- muscle_gain: Prendre du muscle (hypertrophie, prise de masse musculaire)
- maintain: Maintenir mon poids (stabilité pondérale)
- recomposition: Recomposition corporelle (perdre du gras ET gagner du muscle simultanément)
- wellness: Bien-être général (santé globale, pas d'objectif de poids spécifique)
- custom: Objectif personnalisé (si aucun des précédents ne correspond bien)

${contextInfo}

RÈGLES IMPORTANTES:
1. Si l'utilisateur mentionne à la fois perdre du gras ET maintenir ou gagner du muscle, c'est "recomposition"
2. Si l'utilisateur veut maintenir son poids mais réduire son % de graisse, c'est "recomposition" (car cela implique de remplacer le gras par du muscle)
3. Demande des précisions si nécessaire (poids cible, % de masse grasse visé, etc.)
4. Sois encourageant et bienveillant
5. IMPORTANT: Extrais TOUTES les données chiffrées mentionnées par l'utilisateur :
   - Poids cible (target_weight)
   - % de masse grasse actuel (current_body_fat_pct)
   - % de masse grasse cible (target_body_fat_pct)
6. Dès que tu as assez d'infos pour valider un objectif, inclus dans ta réponse un bloc JSON avec le format suivant:
   VALIDATED_GOAL: {"goal_code": "xxx", "goal_label": "Description claire", "target_weight": null, "current_body_fat_pct": null, "target_body_fat_pct": null}

Exemples de validation:
- "Je veux perdre 5kg" → VALIDATED_GOAL: {"goal_code": "weight_loss", "goal_label": "Perdre 5 kg", "target_weight": 75, "current_body_fat_pct": null, "target_body_fat_pct": null}
- "Je veux maintenir 76kg et passer de 18% à 13% de gras" → VALIDATED_GOAL: {"goal_code": "recomposition", "goal_label": "Recomposition: 76 kg, de 18% à 13% de masse grasse", "target_weight": 76, "current_body_fat_pct": 18, "target_body_fat_pct": 13}
- "Je veux prendre de la masse musculaire" → VALIDATED_GOAL: {"goal_code": "muscle_gain", "goal_label": "Prise de masse musculaire", "target_weight": null, "current_body_fat_pct": null, "target_body_fat_pct": null}
- "Je suis à 22% de gras et je veux descendre à 15%" → VALIDATED_GOAL: {"goal_code": "fat_loss", "goal_label": "Passer de 22% à 15% de masse grasse", "target_weight": null, "current_body_fat_pct": 22, "target_body_fat_pct": 15}

Réponds toujours en français, de manière concise et encourageante.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    console.log("Calling AI gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantContent = data.choices[0].message.content;

    console.log("AI response received:", assistantContent.substring(0, 100));

    // Parse the response to check for validated goal
    let validatedGoal: ValidatedGoal | null = null;
    // Match JSON that may span multiple lines and contain nested values
    const goalMatch = assistantContent.match(/VALIDATED_GOAL:\s*(\{[\s\S]*?\}(?=\s*(?:[^{]|$)))/);
    
    if (goalMatch) {
      try {
        const parsed = JSON.parse(goalMatch[1]);
        validatedGoal = {
          validated: true,
          goal_code: parsed.goal_code,
          goal_label: parsed.goal_label,
          target_weight: parsed.target_weight ?? null,
          current_body_fat_pct: parsed.current_body_fat_pct ?? null,
          target_body_fat_pct: parsed.target_body_fat_pct ?? null,
        };
        console.log("Goal validated:", validatedGoal);
      } catch (e) {
        console.error("Failed to parse validated goal:", e);
      }
    }

    // Clean the message by removing the VALIDATED_GOAL block
    const cleanMessage = assistantContent
      .replace(/VALIDATED_GOAL:\s*\{[^}]+\}/g, "")
      .trim();

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        validatedGoal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Goal assistant error:", errorMessage);
    return new Response(
      JSON.stringify({
        message: "Désolé, j'ai rencontré un problème technique. Réessaie dans un instant !",
        validatedGoal: null,
        error: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
