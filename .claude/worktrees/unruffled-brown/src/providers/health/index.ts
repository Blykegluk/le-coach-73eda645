export type { HealthProvider, HealthMetrics, HealthDataPoint, HealthProviderType } from './HealthProvider';
export { SupabaseHealthProvider, supabaseHealthProvider } from './SupabaseHealthProvider';

// Re-export the current active provider
// In the future, this will switch based on platform detection
import { supabaseHealthProvider } from './SupabaseHealthProvider';

export const healthProvider = supabaseHealthProvider;
