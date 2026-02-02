import React from 'react';

interface IconProps {
  className?: string;
}

// Bench Press - person lying on bench pushing bar up
export const ChestIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bench */}
    <rect x="14" y="42" width="36" height="4" rx="1" className="fill-muted-foreground/40" />
    <rect x="12" y="46" width="4" height="10" rx="1" className="fill-muted-foreground/40" />
    <rect x="48" y="46" width="4" height="10" rx="1" className="fill-muted-foreground/40" />
    {/* Person lying down */}
    <circle cx="20" cy="36" r="4" className="fill-primary" /> {/* Head */}
    <path d="M24 36 L44 36" className="stroke-primary" strokeWidth="3" strokeLinecap="round" /> {/* Body */}
    <path d="M44 36 L50 46" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" /> {/* Leg down */}
    {/* Arms pushing up */}
    <path d="M28 36 L28 22" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" /> {/* Left arm */}
    <path d="M38 36 L38 22" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" /> {/* Right arm */}
    {/* Barbell */}
    <rect x="22" y="18" width="20" height="4" rx="1" className="fill-primary" />
    <rect x="16" y="17" width="6" height="6" rx="1" className="fill-primary/60" />
    <rect x="42" y="17" width="6" height="6" rx="1" className="fill-primary/60" />
  </svg>
);

// Squat - person in squat position with bar on shoulders
export const LegsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="32" cy="12" r="5" className="fill-primary" />
    {/* Barbell on shoulders */}
    <rect x="18" y="18" width="28" height="3" rx="1" className="fill-primary/60" />
    <rect x="12" y="16" width="6" height="7" rx="1" className="fill-primary/40" />
    <rect x="46" y="16" width="6" height="7" rx="1" className="fill-primary/40" />
    {/* Torso - bent forward slightly */}
    <path d="M32 17 L32 32" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms holding bar */}
    <path d="M32 20 L22 19" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 20 L42 19" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Legs in squat position */}
    <path d="M32 32 L24 44 L20 54" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 32 L40 44 L44 54" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Feet */}
    <path d="M16 54 L24 54" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M40 54 L48 54" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Rowing - person pulling cable/bar towards chest
export const BackIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Machine/cable origin */}
    <rect x="4" y="24" width="6" height="20" rx="1" className="fill-muted-foreground/40" />
    {/* Cable */}
    <path d="M10 34 L24 34" className="stroke-muted-foreground" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Head */}
    <circle cx="36" cy="18" r="5" className="fill-primary" />
    {/* Torso - seated, slightly forward */}
    <path d="M36 23 L36 40" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms pulling */}
    <path d="M36 28 L24 34" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 32 L24 34" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Handle */}
    <rect x="20" y="30" width="6" height="8" rx="1" className="fill-primary/60" />
    {/* Seat */}
    <rect x="30" y="42" width="14" height="4" rx="1" className="fill-muted-foreground/40" />
    {/* Legs extended */}
    <path d="M36 42 L18 50" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M36 42 L20 54" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Foot plate */}
    <rect x="10" y="48" width="4" height="10" rx="1" className="fill-muted-foreground/40" />
  </svg>
);

// Shoulder Press - person pressing dumbbells overhead
export const ShouldersIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="32" cy="24" r="5" className="fill-primary" />
    {/* Torso */}
    <path d="M32 29 L32 46" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms raised - pressing up */}
    <path d="M32 32 L22 28 L18 12" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 32 L42 28 L46 12" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Dumbbells */}
    <rect x="14" y="6" width="8" height="10" rx="2" className="fill-primary/60" />
    <rect x="42" y="6" width="8" height="10" rx="2" className="fill-primary/60" />
    {/* Seat indication */}
    <rect x="24" y="48" width="16" height="4" rx="1" className="fill-muted-foreground/40" />
    {/* Legs */}
    <path d="M28 48 L24 58" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M36 48 L40 58" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Bicep Curl - person curling dumbbell
export const ArmsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="32" cy="12" r="5" className="fill-primary" />
    {/* Torso */}
    <path d="M32 17 L32 40" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Left arm - curled up with dumbbell */}
    <path d="M32 22 L24 26 L22 18" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Dumbbell in left hand */}
    <rect x="18" y="12" width="8" height="10" rx="2" className="fill-primary/60" />
    {/* Right arm - extended down */}
    <path d="M32 22 L40 26 L42 38" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Dumbbell in right hand */}
    <rect x="38" y="36" width="8" height="10" rx="2" className="fill-primary/60" />
    {/* Legs */}
    <path d="M32 40 L26 56" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 40 L38 56" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Feet */}
    <path d="M22 56 L28 56" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M36 56 L42 56" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Bicep muscle bulge indicator */}
    <ellipse cx="22" cy="22" rx="3" ry="4" className="fill-primary/30" />
  </svg>
);

// Crunch/Abs - person doing crunch on bench
export const CoreIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bench/Mat */}
    <rect x="8" y="44" width="48" height="3" rx="1" className="fill-muted-foreground/40" />
    {/* Head - raised up in crunch */}
    <circle cx="22" cy="28" r="4" className="fill-primary" />
    {/* Upper body - curled up */}
    <path d="M24 32 L34 38 L44 42" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* Arms behind head */}
    <path d="M22 32 L18 28 L22 24" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Legs - bent knees */}
    <path d="M44 42 L52 34 L54 44" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44 42 L50 38 L56 44" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Abs indication - curved lines on torso */}
    <path d="M30 36 L32 34" className="stroke-primary/50" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M34 38 L36 36" className="stroke-primary/50" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Cardio - person running on treadmill
export const CardioIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Treadmill base */}
    <rect x="8" y="50" width="48" height="4" rx="1" className="fill-muted-foreground/40" />
    <rect x="6" y="54" width="4" height="6" rx="1" className="fill-muted-foreground/40" />
    <rect x="54" y="54" width="4" height="6" rx="1" className="fill-muted-foreground/40" />
    {/* Treadmill belt indication */}
    <path d="M12 52 L52 52" className="stroke-muted-foreground/60" strokeWidth="1" strokeDasharray="4 2" />
    {/* Head */}
    <circle cx="30" cy="16" r="5" className="fill-primary" />
    {/* Torso - leaning forward */}
    <path d="M30 21 L34 40" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms - running motion */}
    <path d="M31 26 L22 22" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 30 L42 34" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Legs - running stride */}
    <path d="M34 40 L24 50" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M34 40 L46 44 L50 50" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Motion lines */}
    <path d="M14 28 L10 28" className="stroke-primary/40" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 32 L8 32" className="stroke-primary/40" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 36 L10 36" className="stroke-primary/40" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Full Body - person doing burpee/jump
export const FullBodyIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="32" cy="10" r="5" className="fill-primary" />
    {/* Torso */}
    <path d="M32 15 L32 32" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms raised up */}
    <path d="M32 20 L20 12" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 20 L44 12" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Hands */}
    <circle cx="18" cy="10" r="2" className="fill-primary/60" />
    <circle cx="46" cy="10" r="2" className="fill-primary/60" />
    {/* Legs - jumping position */}
    <path d="M32 32 L22 48" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 32 L42 48" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Feet */}
    <path d="M18 48 L26 48" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M38 48 L46 48" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Ground */}
    <path d="M14 56 L50 56" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
    {/* Jump motion lines */}
    <path d="M24 52 L24 56" className="stroke-primary/30" strokeWidth="1" strokeLinecap="round" />
    <path d="M32 52 L32 56" className="stroke-primary/30" strokeWidth="1" strokeLinecap="round" />
    <path d="M40 52 L40 56" className="stroke-primary/30" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Pull-up - person hanging and pulling up on bar
export const PullUpIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Pull-up bar */}
    <rect x="8" y="6" width="48" height="4" rx="2" className="fill-muted-foreground/60" />
    {/* Bar supports */}
    <rect x="6" y="6" width="4" height="12" rx="1" className="fill-muted-foreground/40" />
    <rect x="54" y="6" width="4" height="12" rx="1" className="fill-muted-foreground/40" />
    {/* Arms gripping bar */}
    <path d="M24 10 L24 18" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M40 10 L40 18" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Head */}
    <circle cx="32" cy="22" r="5" className="fill-primary" />
    {/* Torso */}
    <path d="M32 27 L32 44" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms connecting to bar */}
    <path d="M32 27 L24 18" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 27 L40 18" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Legs hanging */}
    <path d="M32 44 L26 58" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 44 L38 58" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Back muscles indication */}
    <path d="M28 30 L28 36" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
    <path d="M36 30 L36 36" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Deadlift - person lifting barbell from ground
export const DeadliftIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Barbell on ground */}
    <rect x="14" y="48" width="36" height="3" rx="1" className="fill-primary/60" />
    {/* Weight plates */}
    <ellipse cx="12" cy="49" rx="4" ry="7" className="fill-primary" />
    <ellipse cx="52" cy="49" rx="4" ry="7" className="fill-primary" />
    {/* Head */}
    <circle cx="32" cy="18" r="5" className="fill-primary" />
    {/* Torso - bent forward */}
    <path d="M32 23 L32 36" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Torso angle line */}
    <path d="M32 36 L36 28" className="stroke-primary/0" strokeWidth="1" />
    {/* Arms reaching down to bar */}
    <path d="M32 28 L24 44 L24 48" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 28 L40 44 L40 48" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Legs - slightly bent */}
    <path d="M32 36 L26 50 L24 58" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 36 L38 50 L40 58" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Feet */}
    <path d="M20 58 L26 58" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M38 58 L44 58" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Lunges - person in lunge position
export const LungesIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <circle cx="28" cy="12" r="5" className="fill-primary" />
    {/* Torso - upright */}
    <path d="M28 17 L28 34" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Arms at sides for balance */}
    <path d="M28 22 L20 28" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M28 22 L36 28" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Front leg - bent at 90 degrees */}
    <path d="M28 34 L20 46 L16 54" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Back leg - extended behind */}
    <path d="M28 34 L42 44 L52 52" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Front foot */}
    <path d="M12 54 L20 54" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Back foot - on toes */}
    <path d="M52 52 L52 56" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    {/* Ground line */}
    <path d="M8 58 L56 58" className="stroke-muted-foreground/40" strokeWidth="1.5" strokeLinecap="round" />
    {/* Knee angle indicator */}
    <path d="M20 42 L22 46 L18 48" className="stroke-primary/40" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

// Dips - person on parallel bars
export const DipsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Parallel bars */}
    <rect x="10" y="24" width="4" height="32" rx="1" className="fill-muted-foreground/40" />
    <rect x="50" y="24" width="4" height="32" rx="1" className="fill-muted-foreground/40" />
    {/* Top of bars (gripping surface) */}
    <rect x="8" y="22" width="8" height="4" rx="1" className="fill-muted-foreground/60" />
    <rect x="48" y="22" width="8" height="4" rx="1" className="fill-muted-foreground/60" />
    {/* Head */}
    <circle cx="32" cy="16" r="5" className="fill-primary" />
    {/* Arms - supporting on bars */}
    <path d="M32 21 L18 24" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 21 L46 24" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Hands on bars */}
    <circle cx="16" cy="24" r="2" className="fill-primary/60" />
    <circle cx="48" cy="24" r="2" className="fill-primary/60" />
    {/* Torso */}
    <path d="M32 21 L32 40" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    {/* Legs - crossed or together */}
    <path d="M32 40 L28 56" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 40 L36 56" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
    {/* Tricep indication */}
    <path d="M22 22 L26 26" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
    <path d="M42 22 L38 26" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Get icon by exercise name
export const getExerciseIcon = (exerciseName: string): React.FC<IconProps> => {
  const name = exerciseName.toLowerCase();
  
  // Chest exercises
  if (name.includes("développé") || name.includes("bench") || name.includes("pec") || name.includes("pompes") || name.includes("push") || name.includes("poitrine") || name.includes("écarté")) {
    return ChestIcon;
  }
  // Pull-ups
  if (name.includes("traction") || name.includes("pull-up") || name.includes("chin")) {
    return PullUpIcon;
  }
  // Back exercises
  if (name.includes("tirage") || name.includes("rowing") || name.includes("dos") || name.includes("lat")) {
    return BackIcon;
  }
  // Deadlift
  if (name.includes("soulevé") || name.includes("deadlift") || name.includes("terre")) {
    return DeadliftIcon;
  }
  // Lunges
  if (name.includes("fente") || name.includes("lunge")) {
    return LungesIcon;
  }
  // Leg exercises
  if (name.includes("squat") || name.includes("jambes") || name.includes("leg") || name.includes("presse") || name.includes("extension") || name.includes("curl jambes") || name.includes("mollet") || name.includes("cuisse")) {
    return LegsIcon;
  }
  // Shoulder exercises
  if (name.includes("épaule") || name.includes("shoulder") || name.includes("élévation") || name.includes("military") || name.includes("deltoïde") || name.includes("oiseau")) {
    return ShouldersIcon;
  }
  // Dips
  if (name.includes("dips")) {
    return DipsIcon;
  }
  // Arms
  if (name.includes("curl") || name.includes("biceps") || name.includes("triceps") || name.includes("bras") || name.includes("marteau")) {
    return ArmsIcon;
  }
  // Core
  if (name.includes("abdo") || name.includes("planche") || name.includes("crunch") || name.includes("gainage") || name.includes("core") || name.includes("relevé") || name.includes("oblique")) {
    return CoreIcon;
  }
  // Cardio
  if (name.includes("cardio") || name.includes("rameur") || name.includes("vélo") || name.includes("tapis") || name.includes("course") || name.includes("burpee") || name.includes("corde") || name.includes("jumping")) {
    return CardioIcon;
  }
  
  // Default
  return FullBodyIcon;
};

export default getExerciseIcon;
