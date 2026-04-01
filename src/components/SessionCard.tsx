import { Link } from 'react-router-dom';
import { Calendar, MapPin, Hash, Timer, Trophy } from 'lucide-react';
import type { Session } from '../types';
import { formatMs, getBestLap, getAverageLap } from '../utils/time';

interface Props {
  session: Session;
}

export default function SessionCard({ session }: Props) {
  const bestLap = getBestLap(session.laps);
  const avgLap = getAverageLap(session.laps);

  return (
    <Link to={`/session/${session.id}`} className="session-card">
      <div className="session-card-header">
        <div className="session-track">
          <MapPin size={16} />
          <span>{session.trackName}</span>
        </div>
        <div className="session-date">
          <Calendar size={14} />
          <span>{new Date(session.date).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="session-card-stats">
        {bestLap !== null && (
          <div className="stat-pill stat-best">
            <Trophy size={14} />
            <span>{formatMs(bestLap)}</span>
          </div>
        )}
        {avgLap !== null && (
          <div className="stat-pill">
            <Timer size={14} />
            <span>{formatMs(avgLap)}</span>
          </div>
        )}
        <div className="stat-pill">
          <Hash size={14} />
          <span>{session.laps.length} laps</span>
        </div>
      </div>

      {session.kartNumber && (
        <div className="session-kart">Kart #{session.kartNumber}</div>
      )}
    </Link>
  );
}
