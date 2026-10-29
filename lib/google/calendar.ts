import "server-only";

import { googleGet } from "./tokens";

export type CalEvent = {
  id: string;
  titre: string;
  debut: Date;
  fin: Date;
  journeeEntiere: boolean;
  lienVisio: string | null;
  description: string | null;
  lieu: string | null;
  lienAgenda: string | null;
};

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

const VISIO_REGEX = /https?:\/\/[^\s<>"]*(zoom\.us|teams\.microsoft\.com|meet\.google\.com|webex\.com|whereby\.com)[^\s<>"]*/i;

function trouverLienVisio(e: GoogleEvent): string | null {
  if (e.hangoutLink) return e.hangoutLink;
  const video = e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video" && p.uri);
  if (video?.uri) return video.uri;
  const texte = `${e.location ?? ""} ${e.description ?? ""}`;
  return texte.match(VISIO_REGEX)?.[0] ?? null;
}

function parseDate(d: { dateTime?: string; date?: string }): Date {
  return new Date(d.dateTime ?? `${d.date}T00:00:00Z`);
}

export async function listEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<CalEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = await googleGet<{ items?: GoogleEvent[] }>(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
  );

  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .filter((e) => !e.attendees?.some((a) => a.self && a.responseStatus === "declined"))
    .map((e) => ({
      id: e.id,
      titre: e.summary?.trim() || "(Sans titre)",
      debut: parseDate(e.start),
      fin: parseDate(e.end),
      journeeEntiere: !e.start.dateTime,
      lienVisio: trouverLienVisio(e),
      description: e.description?.trim() || null,
      lieu: e.location?.trim() || null,
      lienAgenda: e.htmlLink ?? null,
    }));
}
