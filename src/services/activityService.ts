/**
 * User Activity Service
 * Logs user actions to the `user_activity` table in Supabase.
 *
 * Table DDL (run once in Supabase SQL editor):
 *   create table public.user_activity (
 *     id          serial primary key,
 *     user_id     uuid not null,
 *     action      text not null,
 *     entity_type text,
 *     entity_id   text,
 *     metadata    jsonb,
 *     created_at  timestamptz default now()
 *   );
 *   create index on public.user_activity (user_id, created_at desc);
 */
import { supabase } from '../lib/supabase';

export type ActivityAction =
  | 'simulation_created'
  | 'simulation_completed'
  | 'simulation_viewed'
  | 'simulation_deleted'
  | 'report_viewed'
  | 'report_exported_pdf'
  | 'report_exported_json'
  | 'report_exported_zip'
  | 'report_emailed'
  | 'profile_updated'
  | 'login'
  | 'logout';

export interface ActivityEntry {
  id: number;
  user_id: string;
  action: ActivityAction;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/** Log an activity — fire-and-forget, never throws */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  opts?: {
    entity_type?: string;
    entity_id?: string;
    metadata?: Record<string, any>;
  },
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('user_activity').insert({
      user_id: userId,
      action,
      entity_type: opts?.entity_type ?? null,
      entity_id: opts?.entity_id ? String(opts.entity_id) : null,
      metadata: opts?.metadata ?? null,
    });
  } catch {
    // silently ignore — activity logging must never break the app
  }
}

/** Fetch recent activity for a user (latest N entries).
 *  Always queries by the Supabase auth UUID — all logActivity calls now use auth.getUser().id.
 *  Falls back to the provided userId if auth session is unavailable.
 */
export async function getRecentActivity(
  userId: string,
  limit = 20,
): Promise<ActivityEntry[]> {
  if (!userId) return [];
  try {
    // Prefer the auth UUID (all activity is logged with auth UUID)
    let queryId = userId;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id) queryId = authUser.id;
    } catch { /* use provided userId */ }

    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', queryId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as ActivityEntry[];
  } catch {
    return [];
  }
}

/** Human-readable label for each action */
export function activityLabel(action: ActivityAction): string {
  const map: Record<ActivityAction, string> = {
    simulation_created:    'Created simulation',
    simulation_completed:  'Simulation completed',
    simulation_viewed:     'Viewed simulation',
    simulation_deleted:    'Deleted simulation',
    report_viewed:         'Viewed report',
    report_exported_pdf:   'Exported PDF',
    report_exported_json:  'Exported JSON',
    report_exported_zip:   'Exported ZIP',
    report_emailed:        'Emailed report',
    profile_updated:       'Updated profile',
    login:                 'Logged in',
    logout:                'Logged out',
  };
  return map[action] ?? action;
}

/** Icon name (lucide) for each action */
export function activityIcon(action: ActivityAction): string {
  if (action.startsWith('simulation')) return 'Activity';
  if (action.startsWith('report')) return 'FileText';
  if (action === 'login' || action === 'logout') return 'User';
  return 'Clock';
}
