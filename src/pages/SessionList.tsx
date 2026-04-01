import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, SortAsc, SortDesc, Flag } from 'lucide-react';
import type { Session, SortField, SortDirection } from '../types';
import { getBestLap } from '../utils/time';
import SessionCard from '../components/SessionCard';

interface Props {
  sessions: Session[];
}

export default function SessionList({ sessions }: Props) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const filtered = useMemo(() => {
    let result = sessions;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.trackName.toLowerCase().includes(q) ||
          s.kartNumber.toLowerCase().includes(q) ||
          s.notes.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'trackName':
          cmp = a.trackName.localeCompare(b.trackName);
          break;
        case 'bestLap': {
          const aB = getBestLap(a.laps) ?? Infinity;
          const bB = getBestLap(b.laps) ?? Infinity;
          cmp = aB - bB;
          break;
        }
        case 'lapCount':
          cmp = a.laps.length - b.laps.length;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [sessions, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Flag size={64} />
        </div>
        <h2>No sessions yet</h2>
        <p>Log your first go kart session to start tracking your progress!</p>
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
        <h1>Sessions</h1>
        <Link to="/new" className="btn btn-primary">
          <Plus size={18} />
          New Session
        </Link>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search tracks, karts, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="sort-buttons">
          {(
            [
              ['date', 'Date'],
              ['trackName', 'Track'],
              ['bestLap', 'Best Lap'],
              ['lapCount', 'Laps'],
            ] as [SortField, string][]
          ).map(([field, label]) => (
            <button
              key={field}
              className={`btn btn-sort ${sortField === field ? 'active' : ''}`}
              onClick={() => toggleSort(field)}
            >
              {label}
              {sortField === field && <SortIcon size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className="session-grid">
        {filtered.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>

      {filtered.length === 0 && search && (
        <div className="empty-state small">
          <p>No sessions match "{search}"</p>
        </div>
      )}
    </div>
  );
}
