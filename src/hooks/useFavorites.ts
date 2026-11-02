import { useEffect, useMemo, useState } from 'react';
const KEY = 'ncaa-dashboard:favorites:v1';
function readStored(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];
  } catch { return []; }
}
export function useFavorites(knownIds: string[]) {
  const [stored, setStored] = useState<string[]>(readStored);
  const known = useMemo(() => new Set(knownIds), [knownIds.join('|')]);
  const favoriteIds = useMemo(() => stored.filter((id, index) => known.has(id) && stored.indexOf(id) === index), [stored, known]);
  useEffect(() => {
    if (favoriteIds.length !== stored.length || favoriteIds.some((id, i) => id !== stored[i])) {
      setStored(favoriteIds);
      try { localStorage.setItem(KEY, JSON.stringify(favoriteIds)); } catch { /* The dashboard remains usable when storage is disabled. */ }
    }
  }, [favoriteIds, stored]);
  useEffect(() => {
    const sync = () => setStored(readStored());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggle = (id: string) => {
    if (!known.has(id)) return;
    setStored(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Keep this tab's preference in memory. */ }
      return next;
    });
  };
  return { favoriteIds, isFavorite: (id: string) => favoriteIds.includes(id), toggle };
}
