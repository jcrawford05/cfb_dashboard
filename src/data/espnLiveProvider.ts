// Phase 4 integration point. No live network calls or polling in Phases 0–1.
export const espnLiveProvider = { async getScoreboard() { return { status: 'unavailable' as const, reason: 'Live scores arrive in Phase 4.', games: [] }; } };
