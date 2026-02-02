import React from 'react';

interface IconProps {
  className?: string;
}

// Bench press / chest
export const ChestIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="28" width="48" height="4" rx="2" className="fill-primary/30" />
    <rect x="4" y="26" width="8" height="8" rx="2" className="fill-primary" />
    <rect x="52" y="26" width="8" height="8" rx="2" className="fill-primary" />
    <circle cx="32" cy="44" r="8" className="stroke-primary" strokeWidth="2" fill="none" />
    <path d="M26 44 L38 44 M32 38 L32 50" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 30 L24 22 M40 30 L40 22" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Squat / legs
export const LegsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="12" r="6" className="fill-primary/30" />
    <path d="M32 18 L32 28" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 28 L24 42 L24 56" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 28 L40 42 L40 56" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 56 L28 56 M36 56 L44 56" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 22 L18 18 M38 22 L46 18" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Back / rowing
export const BackIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="20" rx="12" ry="8" className="fill-primary/20" />
    <path d="M20 20 L20 44 M44 20 L44 44" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 32 L44 32" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
    <path d="M16 44 L24 44 M40 44 L48 44" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 48 L26 56 L38 56 L38 48" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Shoulders / press
export const ShouldersIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="16" r="6" className="fill-primary/30" />
    <path d="M32 22 L32 36" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M20 28 L32 28 L44 28" className="stroke-primary" strokeWidth="2" />
    <path d="M20 28 L16 16 M44 28 L48 16" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="12" r="4" className="fill-primary" />
    <circle cx="48" cy="12" r="4" className="fill-primary" />
    <path d="M32 36 L26 52 M32 36 L38 52" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Arms / biceps
export const ArmsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 48 L20 28 L28 16" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="28" cy="12" r="4" className="fill-primary" />
    <ellipse cx="20" cy="36" rx="4" ry="8" className="fill-primary/30" />
    <path d="M44 48 L44 28 L36 16" className="stroke-muted-foreground" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="36" cy="12" r="4" className="fill-muted-foreground" />
  </svg>
);

// Core / abs
export const CoreIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="22" y="16" width="20" height="32" rx="4" className="fill-primary/20" />
    <path d="M22 24 L42 24 M22 32 L42 32 M22 40 L42 40" className="stroke-primary" strokeWidth="2" />
    <path d="M32 16 L32 48" className="stroke-primary" strokeWidth="2" strokeDasharray="2 2" />
    <circle cx="32" cy="10" r="4" className="fill-muted-foreground" />
    <path d="M26 52 L26 58 M38 52 L38 58" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Cardio
export const CardioIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 48 C18 48 12 36 12 28 C12 20 18 14 26 14 C30 14 32 18 32 18 C32 18 34 14 38 14 C46 14 52 20 52 28 C52 36 46 48 32 48Z" className="fill-primary/20 stroke-primary" strokeWidth="2" />
    <path d="M20 30 L28 30 L32 22 L36 38 L40 30 L48 30" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Full body / compound
export const FullBodyIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="10" r="6" className="fill-primary/30" />
    <path d="M32 16 L32 32" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 24 L18 32 M32 24 L46 32" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 32 L24 52 M32 32 L40 52" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <circle cx="18" cy="34" r="3" className="fill-primary" />
    <circle cx="46" cy="34" r="3" className="fill-primary" />
    <path d="M20 52 L28 52 M36 52 L44 52" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Pull-up / traction
export const PullUpIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="48" height="4" rx="2" className="fill-primary" />
    <path d="M20 12 L20 20 L32 24 L44 20 L44 12" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="28" r="5" className="fill-primary/30" />
    <path d="M32 33 L32 44" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 44 L26 56 M32 44 L38 56" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Deadlift / soulevé de terre
export const DeadliftIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="44" width="40" height="4" rx="2" className="fill-primary/30" />
    <circle cx="12" cy="46" r="6" className="fill-primary" />
    <circle cx="52" cy="46" r="6" className="fill-primary" />
    <circle cx="32" cy="14" r="5" className="fill-primary/30" />
    <path d="M32 19 L32 30" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 30 L24 44 M32 30 L40 44" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M24 36 L24 44 L40 44 L40 36" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Lunges / fentes
export const LungesIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="10" r="5" className="fill-primary/30" />
    <path d="M32 15 L32 28" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 28 L20 50" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 28 L44 40 L44 50" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 50 L24 50 M40 50 L48 50" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 40 L20 50" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Dips
export const DipsIcon: React.FC<IconProps> = ({ className = "w-12 h-12" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="4" height="32" rx="2" className="fill-muted-foreground" />
    <rect x="52" y="20" width="4" height="32" rx="2" className="fill-muted-foreground" />
    <circle cx="32" cy="24" r="5" className="fill-primary/30" />
    <path d="M32 29 L32 44" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 34 L12 26 M32 34 L52 26" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 44 L26 56 M32 44 L38 56" className="stroke-muted-foreground" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Get icon by exercise name
export const getExerciseIcon = (exerciseName: string): React.FC<IconProps> => {
  const name = exerciseName.toLowerCase();
  
  // Chest exercises
  if (name.includes("développé") || name.includes("bench") || name.includes("pec") || name.includes("pompes") || name.includes("push")) {
    return ChestIcon;
  }
  // Back exercises
  if (name.includes("tirage") || name.includes("rowing") || name.includes("pull") || name.includes("dos")) {
    return BackIcon;
  }
  // Pull-ups
  if (name.includes("traction") || name.includes("pull-up") || name.includes("chin")) {
    return PullUpIcon;
  }
  // Deadlift
  if (name.includes("soulevé") || name.includes("deadlift") || name.includes("terre")) {
    return DeadliftIcon;
  }
  // Leg exercises
  if (name.includes("squat") || name.includes("jambes") || name.includes("leg") || name.includes("presse") || name.includes("extension")) {
    return LegsIcon;
  }
  // Lunges
  if (name.includes("fente") || name.includes("lunge")) {
    return LungesIcon;
  }
  // Shoulder exercises
  if (name.includes("épaule") || name.includes("shoulder") || name.includes("élévation") || name.includes("military") || name.includes("deltoïde")) {
    return ShouldersIcon;
  }
  // Arms
  if (name.includes("curl") || name.includes("biceps") || name.includes("triceps") || name.includes("bras")) {
    return ArmsIcon;
  }
  // Dips
  if (name.includes("dips")) {
    return DipsIcon;
  }
  // Core
  if (name.includes("abdo") || name.includes("planche") || name.includes("crunch") || name.includes("gainage") || name.includes("core")) {
    return CoreIcon;
  }
  // Cardio
  if (name.includes("cardio") || name.includes("rameur") || name.includes("vélo") || name.includes("tapis") || name.includes("course") || name.includes("burpee")) {
    return CardioIcon;
  }
  
  // Default
  return FullBodyIcon;
};

export default getExerciseIcon;
