import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Timer,
  MapPin,
  Hash,
  TrendingUp,
  Flag,
  Plus,
  BarChart3,
} from 'lucide-react';
import type { Session, TrackStats } from '../types';
import { formatMs, getBestLap, getAverageLap } from '../utils/time';

interface Props {
  sessions: Session[];
}

export default function Stats({ sessions }: Props) {
  const stats = useMemo(() => {
    if (sessions.length === 0) return null;

    const allLaps = sessions.flatMap((s) => s.laps);
    const bestOverall = allLaps.length > 0 ? Math.min(...allLaps.map((l) => l.time)) : null;
    const bestSession = bestOverall
      ? sessions.find((s) => s.laps.some((l) => l.time === bestOverall))
      : null;

    const trackMap = new Map<string, TrackStats>();
    for (const session of sessions) {
      const existing = trackMap.get(session.trackName);
      const best = getBestLap(session.laps);
      if (existing) {
        existing.sessionCount++;
        existing.totalLaps += session.laps.length;
        if (best !== null && best < existing.bestLapTime) {
          existing.bestLapTime = best;
        }
        const avg = getAverageLap(session.laps);
        if (avg !== null) {
          existing.averageBestLap = Math.round(
            (existing.averageBestLap * (existing.sessionCount - 1) + avg) /
              existing.sessionCount
          );
        }
      } else {
        trackMap.set(session.trackName, {
          trackName: session.trackName,
          sessionCount: 1,
          bestLapTime: best ?? Infinity,
          averageBestLap: getAverageLap(session.laps) ?? 0,
          totalLaps: session.laps.length,
        });
      }
    }

    const tracks = Array.from(trackMap.values()).sort(
      (a, b) => b.sessionCount - a.sessionCount
    );

    const recentSessions = [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const bestLapsOverTime = recentSessions
      .reverse()
      .map((s) => ({
        date: s.date,
        track: s.trackName,
        best: getBestLap(s.laps),
      }))
      .filter((x) => x.best !== null);

    return {
      totalSessions: sessions.length,
      totalLaps: allLaps.length,
      uniqueTracks: trackMap.size,
      bestOverall,
      bestSession,
      tracks,
      bestLapsOverTime,
    };
  }, [sessions]);

  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <BarChart3 size={64} />
        </div>
        <h2>No data yet</h2>
        <p>Log some sessions to see your statistics!</p>
        <Link to="/new" className="btn btn-primary btn-lg">
          <Plus size={20} />
          Log First Session
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Statistics</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-best">
          <div className="stat-icon">
            <Trophy size={24} />
          </div>
          <div className="stat-value">
            {stats.bestOverall !== null ? formatMs(stats.bestOverall) : '-'}
          </div>
          <div className="stat-label">
            All-Time Best
            {stats.bestSession && (
              <span className="stat-sub">@ {stats.bestSession.trackName}</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Flag size={24} />
          </div>
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Timer size={24} />
          </div>
          <div className="stat-value">{stats.totalLaps}</div>
          <div className="stat-label">Total Laps</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <MapPin size={24} />
          </div>
          <div className="stat-value">{stats.uniqueTracks}</div>
          <div className="stat-label">Tracks Visited</div>
        </div>
      </div>

      <div className="section">
        <h2>
          <MapPin size={20} />
          Track Records
        </h2>
        <div className="track-records">
          {stats.tracks.map((track) => (
            <div key={track.trackName} className="track-record-card">
              <div className="track-record-name">{track.trackName}</div>
              <div className="track-record-stats">
                <div className="track-stat">
                  <Trophy size={14} />
                  <span>
                    {track.bestLapTime < Infinity
                      ? formatMs(track.bestLapTime)
                      : '-'}
                  </span>
                </div>
                <div className="track-stat">
                  <Timer size={14} />
                  <span>
                    {track.averageBestLap > 0
                      ? formatMs(track.averageBestLap)
                      : '-'}{' '}
                    avg
                  </span>
                </div>
                <div className="track-stat">
                  <Hash size={14} />
                  <span>{track.sessionCount} sessions</span>
                </div>
                <div className="track-stat">
                  <TrendingUp size={14} />
                  <span>{track.totalLaps} laps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {stats.bestLapsOverTime.length > 1 && (
        <div className="section">
          <h2>
            <TrendingUp size={20} />
            Recent Progress
          </h2>
          <div className="progress-timeline">
            {stats.bestLapsOverTime.map((entry, i) => (
              <div key={i} className="progress-entry">
                <div className="progress-date">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="progress-track">{entry.track}</div>
                <div className="progress-time">
                  {entry.best !== null ? formatMs(entry.best) : '-'}
                </div>
                {i > 0 && entry.best !== null && stats.bestLapsOverTime[i - 1].best !== null && (
                  <div
                    className={`progress-delta ${
                      entry.best < stats.bestLapsOverTime[i - 1].best!
                        ? 'delta-positive'
                        : entry.best > stats.bestLapsOverTime[i - 1].best!
                          ? 'delta-negative'
                          : ''
                    }`}
                  >
                    {entry.best < stats.bestLapsOverTime[i - 1].best! ? 'Faster' : 
                     entry.best > stats.bestLapsOverTime[i - 1].best! ? 'Slower' : 'Same'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
