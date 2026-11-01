import { useEffect, useState, type ReactNode } from 'react';
// Hash URLs resolve to index.html on Pages, including repository subpaths.
export function currentRoute() { return location.hash.slice(1).split('?')[0] || '/'; }
export function useRoute() {
  const [path, setPath] = useState(currentRoute);
  useEffect(() => { const change = () => { setPath(currentRoute()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  return path;
}
export function Link({ to, children, className, ...props }: { to: string; children: ReactNode; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) { return <a href={`#${to}`} className={className} {...props}>{children}</a>; }
