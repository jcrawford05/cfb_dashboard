// This module is never imported by src/. Keep credentials in memory only.
const ORIGIN = 'https://api.collegefootballdata.com';
const ENDPOINTS = new Set(['/teams/fbs', '/conferences', '/games', '/records', '/rankings', '/stats/season', '/stats/player/season']);
export class CfbdClient {
  requestCount = 0;
  constructor(private readonly key: string, private readonly transport: typeof fetch = fetch, private readonly pause = (ms: number) => new Promise(r => setTimeout(r, ms))) {
    if (!key.trim()) throw new Error('CFBD_API_KEY is missing.');
  }
  async get(path: string, params: Record<string, string>): Promise<unknown> {
    if (!ENDPOINTS.has(path)) throw new Error('Endpoint is not allowed.');
    const url = new URL(path, ORIGIN);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 2; attempt++) {
      if (this.requestCount >= 14) throw new Error('Refresh request budget exhausted.');
      this.requestCount++;
      let response: Response;
      try {
        response = await this.transport(url, { headers: { Authorization: `Bearer ${this.key}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(25_000) });
      } catch {
        if (attempt === 0) { await this.pause(1000); continue; }
        throw new Error('CFBD connection failed; snapshot preserved.');
      }
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await response.body?.cancel(); await this.pause(2000); continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`CFBD request failed (HTTP ${response.status}); snapshot preserved.`); }
      try { return await response.json(); } catch { throw new Error('CFBD returned invalid JSON; snapshot preserved.'); }
    }
    throw new Error('CFBD retry limit reached.');
  }
}
