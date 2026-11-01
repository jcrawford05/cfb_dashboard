import { loadSnapshot } from './cfbdStaticRepository';
import { espnLiveProvider } from './espnLiveProvider';
export const sportsData = { getDashboardSnapshot: loadSnapshot, getLiveScoreboard: espnLiveProvider.getScoreboard };
