/**
 * Static mapping of exercises to alternatives (same muscle group).
 * Keys are lowercase French exercise names.
 */
export const exerciseAlternatives: Record<string, string[]> = {
  // Chest
  'développé couché': ['Développé incliné haltères', 'Pompes', 'Dips pectoraux'],
  'développé incliné': ['Développé couché', 'Développé incliné haltères', 'Écarté poulie haute'],
  'développé incliné haltères': ['Développé incliné', 'Développé couché haltères', 'Écarté haltères'],
  'pompes': ['Développé couché', 'Dips pectoraux', 'Push-up décliné'],
  'écarté haltères': ['Écarté poulie', 'Développé couché haltères', 'Butterfly machine'],
  'dips pectoraux': ['Pompes', 'Développé décliné', 'Développé couché'],

  // Back
  'tractions': ['Tirage vertical', 'Tirage poitrine poulie', 'Rowing haltère'],
  'tirage vertical': ['Tractions', 'Tirage poitrine poulie haute', 'Pullover poulie'],
  'rowing barre': ['Rowing haltère', 'Rowing T-bar', 'Tirage horizontal poulie'],
  'rowing haltère': ['Rowing barre', 'Tirage horizontal poulie', 'Rowing T-bar'],
  'tirage horizontal': ['Rowing barre', 'Rowing haltère', 'Tirage poulie basse'],
  'soulevé de terre': ['Romanian deadlift', 'Good morning', 'Hip thrust'],

  // Legs
  'squat': ['Presse à cuisses', 'Squat goblet', 'Fentes'],
  'squat goblet': ['Squat', 'Presse à cuisses', 'Fentes haltères'],
  'presse à cuisses': ['Squat', 'Hack squat', 'Fentes'],
  'fentes': ['Squat bulgare', 'Presse à cuisses', 'Step-up'],
  'squat bulgare': ['Fentes', 'Fentes marchées', 'Step-up'],
  'leg curl': ['Romanian deadlift', 'Good morning', 'Leg curl assis'],
  'leg extension': ['Squat avant', 'Sissy squat', 'Step-up'],
  'hip thrust': ['Pont fessier', 'Soulevé de terre roumain', 'Fentes arrière'],
  'mollets debout': ['Mollets assis', 'Mollets presse', 'Mollets unilatéral'],

  // Shoulders
  'développé militaire': ['Développé haltères assis', 'Push press', 'Arnold press'],
  'développé haltères assis': ['Développé militaire', 'Arnold press', 'Élévations latérales'],
  'élévations latérales': ['Élévations latérales poulie', 'Oiseau', 'Face pull'],
  'face pull': ['Oiseau', 'Élévations latérales', 'Tirage menton'],
  'oiseau': ['Face pull', 'Élévations latérales poulie', 'Reverse fly machine'],

  // Arms
  'curl biceps barre': ['Curl haltères', 'Curl marteau', 'Curl poulie'],
  'curl haltères': ['Curl barre', 'Curl marteau', 'Curl concentré'],
  'curl marteau': ['Curl haltères', 'Curl barre EZ', 'Curl poulie corde'],
  'triceps poulie': ['Dips triceps', 'Extension triceps haltère', 'Skull crusher'],
  'dips triceps': ['Triceps poulie', 'Extension triceps', 'Kickback haltères'],
  'extension triceps': ['Triceps poulie', 'Skull crusher', 'Dips banc'],

  // Core
  'crunch': ['Planche', 'Relevé de jambes', 'Ab wheel'],
  'planche': ['Crunch', 'Mountain climber', 'Dead bug'],
  'relevé de jambes': ['Crunch', 'Planche', 'Leg raise suspendu'],

  // Cardio
  'course': ['Vélo', 'Rameur', 'Corde à sauter'],
  'vélo': ['Course', 'Rameur', 'Elliptique'],
  'rameur': ['Course', 'Vélo', 'Corde à sauter'],
};

/**
 * Find alternatives for a given exercise name (case-insensitive).
 * Returns empty array if no alternatives found.
 */
export function getAlternatives(exerciseName: string): string[] {
  const key = exerciseName.toLowerCase().trim();

  // Exact match
  if (exerciseAlternatives[key]) return exerciseAlternatives[key];

  // Partial match — find first key that contains or is contained in the name
  for (const [mapKey, alternatives] of Object.entries(exerciseAlternatives)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return alternatives;
    }
  }

  return [];
}
