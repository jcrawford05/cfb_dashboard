import { useEffect, useState } from 'react';
import { sportsData } from '../data/sportsDataFacade';
import type { Snapshot } from '../data/cfbdStaticRepository';
export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    sportsData.getDashboardSnapshot(controller.signal).then(data => { if (!controller.signal.aborted) setSnapshot(data); }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [attempt]);
  return { snapshot, error, retry: () => setAttempt(a => a + 1) };
}
