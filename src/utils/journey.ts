/**
 * Tata Journey & Organic Flame Ecosystem Utilities
 * 
 * Tracks the user's continuous journey days since first using Tata.
 * In Organic Mode:
 * - Days advance continuously since first use (Day 1 -> Day 360+).
 * - Flame status depends strictly on daily task completion:
 *   * If 0 tasks completed today: Flame is PADAM (extinguished into cold ash & billowing smoke 💨).
 *   * If task(s) completed today: Flame is MENYALA (ignited & radiant 🔥, becoming ☀️ at Day 100+ and Paradise at Day 360+).
 */

export const TATA_JOURNEY_START_KEY = 'tata_journey_start_date';

export function getTodayDateString(): string {
  return new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000))
    .toISOString()
    .split('T')[0];
}

export function getStoredJourneyStartDate(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getTodayDateString();
  }

  try {
    const saved = localStorage.getItem(TATA_JOURNEY_START_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }
  } catch (e) {}

  // Determine earliest existing date in Tata storage if user is already an existing user
  let earliest = getTodayDateString();

  try {
    const userStr = localStorage.getItem('tata_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.createdAt && typeof u.createdAt === 'string') {
        const d = u.createdAt.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < earliest) earliest = d;
      }
    }
  } catch (e) {}

  try {
    const notesStr = localStorage.getItem('tata_notes');
    if (notesStr) {
      const notes = JSON.parse(notesStr);
      if (Array.isArray(notes)) {
        for (const n of notes) {
          if (n?.createdAt && typeof n.createdAt === 'string') {
            const d = n.createdAt.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < earliest) earliest = d;
          }
        }
      }
    }
  } catch (e) {}

  try {
    const tasksStr = localStorage.getItem('tata_tasks');
    if (tasksStr) {
      const tasks = JSON.parse(tasksStr);
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          if (t?.createdAt && typeof t.createdAt === 'string') {
            const d = t.createdAt.slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < earliest) earliest = d;
          }
        }
      }
    }
  } catch (e) {}

  try {
    localStorage.setItem(TATA_JOURNEY_START_KEY, earliest);
  } catch (e) {}

  return earliest;
}

export function calculateJourneyDay(startDateStr: string, targetDateStr?: string): number {
  try {
    const target = targetDateStr || getTodayDateString();
    const start = new Date(startDateStr);
    const curr = new Date(target);
    const diffTime = curr.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Day 1 on start date, Day 2 next day, etc.
    return Math.max(1, diffDays + 1);
  } catch (e) {
    return 1;
  }
}
