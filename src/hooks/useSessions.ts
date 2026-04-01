import { useState, useCallback } from 'react';
import type { Session } from '../types';
import * as storage from '../store/storage';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(storage.loadSessions);

  const add = useCallback((session: Session) => {
    setSessions(storage.addSession(session));
  }, []);

  const update = useCallback((session: Session) => {
    setSessions(storage.updateSession(session));
  }, []);

  const remove = useCallback((id: string) => {
    setSessions(storage.deleteSession(id));
  }, []);

  const get = useCallback((id: string) => {
    return sessions.find((s) => s.id === id);
  }, [sessions]);

  return { sessions, add, update, remove, get };
}
