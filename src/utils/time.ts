/**
 * Parse a time string like "1:23.456" or "83.456" into milliseconds.
 * Supports formats: M:SS.mmm, SS.mmm, M:SS
 */
export function parseTimeToMs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (colonMatch) {
    const minutes = parseInt(colonMatch[1], 10);
    const seconds = parseInt(colonMatch[2], 10);
    const ms = colonMatch[3]
      ? parseInt(colonMatch[3].padEnd(3, '0'), 10)
      : 0;
    return minutes * 60000 + seconds * 1000 + ms;
  }

  const secMatch = trimmed.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (secMatch) {
    const seconds = parseInt(secMatch[1], 10);
    const ms = secMatch[2]
      ? parseInt(secMatch[2].padEnd(3, '0'), 10)
      : 0;
    return seconds * 1000 + ms;
  }

  return null;
}

/** Format milliseconds to "M:SS.mmm" */
export function formatMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis
      .toString()
      .padStart(3, '0')}`;
  }
  return `${seconds}.${millis.toString().padStart(3, '0')}`;
}

/** Compute delta string relative to a reference time */
export function formatDelta(ms: number, reference: number): string {
  const delta = ms - reference;
  if (delta === 0) return '';
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${formatMs(Math.abs(delta))}`;
}

export function getBestLap(laps: { time: number }[]): number | null {
  if (laps.length === 0) return null;
  return Math.min(...laps.map((l) => l.time));
}

export function getAverageLap(laps: { time: number }[]): number | null {
  if (laps.length === 0) return null;
  const sum = laps.reduce((acc, l) => acc + l.time, 0);
  return Math.round(sum / laps.length);
}
