export interface LapTime {
  lapNumber: number;
  time: number; // milliseconds
}

export interface Session {
  id: string;
  trackName: string;
  date: string; // ISO date string
  kartNumber: string;
  notes: string;
  laps: LapTime[];
  createdAt: string;
}

export interface TrackStats {
  trackName: string;
  sessionCount: number;
  bestLapTime: number;
  averageBestLap: number;
  totalLaps: number;
}

export type SortField = 'date' | 'trackName' | 'bestLap' | 'lapCount';
export type SortDirection = 'asc' | 'desc';
