import type { Team } from '../data/types';
import type { CSSProperties } from 'react';
function channel(value: string) { const n = Number.parseInt(value, 16) / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }
function luminance(color: string) { return 0.2126 * channel(color.slice(1,3)) + 0.7152 * channel(color.slice(3,5)) + 0.0722 * channel(color.slice(5,7)); }
export function readableTeamText(color: string) { return luminance(color) > 0.38 ? '#111715' : '#f7f8f4'; }
export function teamTheme(team: Team) { return { '--team-primary': team.color, '--team-secondary': team.alternateColor, '--team-on-primary': readableTeamText(team.color) } as CSSProperties; }
