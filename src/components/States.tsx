import { Component, type ReactNode } from 'react';
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><h3>{title}</h3><p>{children}</p></div>; }
export function LoadingState() { return <div role="status" aria-live="polite"><p className="muted">Loading the saved season snapshot.</p><div className="skeleton"/><div className="skeleton"/><span className="sr-only">Loading</span></div>; }
export function ErrorState({ retry, message }: { retry: () => void; message: string }) { return <div role="alert" className="empty"><h2>The scores didn’t load</h2><p>{message}</p><button onClick={retry}>Try again</button></div>; }
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="fatal"><h1>Something went wrong</h1><p>Your saved data has not been changed.</p><button onClick={() => location.reload()}>Reload Field Notes</button></main> : this.props.children; }
}
