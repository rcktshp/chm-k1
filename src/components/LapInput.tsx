import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { LapTime } from '../types';
import { parseTimeToMs, formatMs } from '../utils/time';

interface Props {
  laps: LapTime[];
  onChange: (laps: LapTime[]) => void;
}

export default function LapInput({ laps, onChange }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [laps.length]);

  function addLap() {
    const ms = parseTimeToMs(input);
    if (ms === null || ms <= 0) {
      setError('Enter a valid time (e.g. 1:23.456 or 45.200)');
      return;
    }
    setError('');
    const newLap: LapTime = { lapNumber: laps.length + 1, time: ms };
    onChange([...laps, newLap]);
    setInput('');
  }

  function removeLap(index: number) {
    const updated = laps
      .filter((_, i) => i !== index)
      .map((lap, i) => ({ ...lap, lapNumber: i + 1 }));
    onChange(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLap();
    }
  }

  const bestTime = laps.length > 0 ? Math.min(...laps.map((l) => l.time)) : null;

  return (
    <div className="lap-input-section">
      <label className="form-label">Lap Times</label>
      <div className="lap-input-row">
        <input
          ref={inputRef}
          type="text"
          className="form-input lap-time-input"
          placeholder="1:23.456 or 45.200"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="btn btn-accent" onClick={addLap}>
          <Plus size={18} />
          Add Lap
        </button>
      </div>
      {error && <p className="input-error">{error}</p>}

      {laps.length > 0 && (
        <div className="lap-list">
          {laps.map((lap, i) => (
            <div
              key={i}
              className={`lap-chip ${lap.time === bestTime ? 'lap-best' : ''}`}
            >
              <span className="lap-number">L{lap.lapNumber}</span>
              <span className="lap-time">{formatMs(lap.time)}</span>
              <button
                type="button"
                className="lap-remove"
                onClick={() => removeLap(i)}
                aria-label={`Remove lap ${lap.lapNumber}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
