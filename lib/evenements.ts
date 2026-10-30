import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { listEvents, type CalEvent } from "@/lib/google/calendar";
import { getAccessToken, markSynced } from "@/lib/google/tokens";
import { addDays, dayBounds, localDate } from "@/lib/time";

export const JOURS_CHARGES = 14;

// Un seul appel à Google Agenda pour les 14 prochains jours : agenda, alertes et résumé.
export async function chargerEvenements(supabase: SupabaseClient, userId: string, tz: string): Promise<CalEvent[]> {
  const aujourdhui = localDate(new Date(), tz);
  const token = await getAccessToken(supabase, userId);
  const events = await listEvents(
    token,
    dayBounds(aujourdhui, tz).debut,
    dayBounds(addDays(aujourdhui, JOURS_CHARGES - 1), tz).fin
  );
  await markSynced(supabase, userId);
  return events;
}
