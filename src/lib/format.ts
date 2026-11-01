import type { Game } from '../data/types';
export const dateTime = (iso: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const gameTime = (g: Game) => !g.startDate ? 'Date to be announced' : g.startTimeTBD ? `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(g.startDate))} · Time TBD` : dateTime(g.startDate);
export const recordText = (r?: { wins: number; losses: number; ties: number }) => r ? `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ''}` : '—';
