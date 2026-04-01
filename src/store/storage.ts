import type { Session } from '../types';

const STORAGE_KEY = 'go-kart-sessions';

export function loadSessions(): Session[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function addSession(session: Session): Session[] {
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  return sessions;
}

export function updateSession(updated: Session): Session[] {
  const sessions = loadSessions().map((s) =>
    s.id === updated.id ? updated : s
  );
  saveSessions(sessions);
  return sessions;
}

export function deleteSession(id: string): Session[] {
  const sessions = loadSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
  return sessions;
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}
