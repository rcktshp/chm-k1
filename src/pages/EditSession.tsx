import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import type { Session, LapTime } from '../types';
import LapInput from '../components/LapInput';

interface Props {
  sessions: Session[];
  onUpdate: (session: Session) => void;
}

export default function EditSession({ sessions, onUpdate }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = sessions.find((s) => s.id === id);

  const [trackName, setTrackName] = useState(session?.trackName ?? '');
  const [date, setDate] = useState(session?.date ?? '');
  const [kartNumber, setKartNumber] = useState(session?.kartNumber ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [laps, setLaps] = useState<LapTime[]>(session?.laps ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!trackName.trim()) errs.trackName = 'Track name is required';
    if (!date) errs.date = 'Date is required';
    if (laps.length === 0) errs.laps = 'Add at least one lap time';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const updated: Session = {
      ...session!,
      trackName: trackName.trim(),
      date,
      kartNumber: kartNumber.trim(),
      notes: notes.trim(),
      laps,
    };

    onUpdate(updated);
    navigate(`/session/${session!.id}`);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Edit Session</h1>
      </div>

      <form className="session-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="trackName">
            Track Name *
          </label>
          <input
            id="trackName"
            type="text"
            className={`form-input ${errors.trackName ? 'input-error-border' : ''}`}
            value={trackName}
            onChange={(e) => setTrackName(e.target.value)}
          />
          {errors.trackName && (
            <p className="input-error">{errors.trackName}</p>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="date">
              Date *
            </label>
            <input
              id="date"
              type="date"
              className={`form-input ${errors.date ? 'input-error-border' : ''}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && <p className="input-error">{errors.date}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="kartNumber">
              Kart Number
            </label>
            <input
              id="kartNumber"
              type="text"
              className="form-input"
              value={kartNumber}
              onChange={(e) => setKartNumber(e.target.value)}
            />
          </div>
        </div>

        <LapInput laps={laps} onChange={setLaps} />
        {errors.laps && <p className="input-error">{errors.laps}</p>}

        <div className="form-group">
          <label className="form-label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="form-input form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/session/${session!.id}`)}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
