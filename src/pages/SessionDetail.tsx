import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Edit,
  Calendar,
  MapPin,
  Hash,
  Trophy,
  Timer,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { Session } from '../types';
import { formatMs, formatDelta, getBestLap, getAverageLap } from '../utils/time';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props {
  sessions: Session[];
  onDelete: (id: string) => void;
}

export default function SessionDetail({ sessions, onDelete }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <div className="empty-state">
        <h2>Session not found</h2>
        <Link to="/" className="btn btn-primary">
          Back to Sessions
        </Link>
      </div>
    );
  }

  const bestLap = getBestLap(session.laps);
  const avgLap = getAverageLap(session.laps);
  const worstLap =
    session.laps.length > 0 ? Math.max(...session.laps.map((l) => l.time)) : null;
  const consistency =
    bestLap !== null && worstLap !== null ? worstLap - bestLap : null;

  function handleDelete() {
    onDelete(session!.id);
    navigate('/');
  }

  return (
    <div className="page-content">
      <div className="detail-nav">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="detail-actions">
          <Link to={`/edit/${session.id}`} className="btn btn-ghost">
            <Edit size={18} />
            Edit
          </Link>
          <button
            className="btn btn-danger-outline"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      <div className="detail-header">
        <h1>
          <MapPin size={24} />
          {session.trackName}
        </h1>
        <div className="detail-meta">
          <span>
            <Calendar size={16} />
            {new Date(session.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {session.kartNumber && (
            <span>
              <Hash size={16} />
              Kart #{session.kartNumber}
            </span>
          )}
        </div>
      </div>

      <div className="stats-grid">
        {bestLap !== null && (
          <div className="stat-card stat-card-best">
            <div className="stat-icon">
              <Trophy size={24} />
            </div>
            <div className="stat-value">{formatMs(bestLap)}</div>
            <div className="stat-label">Best Lap</div>
          </div>
        )}
        {avgLap !== null && (
          <div className="stat-card">
            <div className="stat-icon">
              <Timer size={24} />
            </div>
            <div className="stat-value">{formatMs(avgLap)}</div>
            <div className="stat-label">Average Lap</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-value">{session.laps.length}</div>
          <div className="stat-label">Total Laps</div>
        </div>
        {consistency !== null && (
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingDown size={24} />
            </div>
            <div className="stat-value">{formatMs(consistency)}</div>
            <div className="stat-label">Spread</div>
          </div>
        )}
      </div>

      <div className="lap-table-container">
        <h2>Lap Breakdown</h2>
        <table className="lap-table">
          <thead>
            <tr>
              <th>Lap</th>
              <th>Time</th>
              <th>Delta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {session.laps.map((lap) => {
              const isBest = lap.time === bestLap;
              const isWorst = lap.time === worstLap && session.laps.length > 1;
              return (
                <tr
                  key={lap.lapNumber}
                  className={isBest ? 'row-best' : isWorst ? 'row-worst' : ''}
                >
                  <td className="lap-num-cell">{lap.lapNumber}</td>
                  <td className="lap-time-cell">{formatMs(lap.time)}</td>
                  <td className="lap-delta-cell">
                    {bestLap !== null ? formatDelta(lap.time, bestLap) : ''}
                  </td>
                  <td className="lap-badge-cell">
                    {isBest && <span className="badge badge-best">BEST</span>}
                    {isWorst && <span className="badge badge-worst">SLOWEST</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {session.notes && (
        <div className="notes-section">
          <h2>Notes</h2>
          <p>{session.notes}</p>
        </div>
      )}

      {showDelete && (
        <ConfirmDialog
          message="Are you sure you want to delete this session? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
