import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Save } from 'lucide-react';
import type { Session, LapTime } from '../types';
import LapInput from '../components/LapInput';

interface Props {
  onSave: (session: Session) => void;
}

export default function NewSession({ onSave }: Props) {
  const navigate = useNavigate();
  const [trackName, setTrackName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kartNumber, setKartNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [laps, setLaps] = useState<LapTime[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    const session: Session = {
      id: uuidv4(),
      trackName: trackName.trim(),
      date,
      kartNumber: kartNumber.trim(),
      notes: notes.trim(),
      laps,
      createdAt: new Date().toISOString(),
    };

    onSave(session);
    navigate(`/session/${session.id}`);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Log New Session</h1>
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
            placeholder="e.g. SpeedZone Indoor Karting"
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
              placeholder="e.g. 7"
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
            placeholder="Track conditions, weather, tire compound..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Save size={18} />
            Save Session
          </button>
        </div>
      </form>
    </div>
  );
}
