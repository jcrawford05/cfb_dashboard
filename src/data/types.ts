export type { Team, Game, PollSnapshot, RankingEntry, DataMetadata, DerivedTeamForm, DerivedScheduleStrength, DerivedUpset, DerivedRankingResults, DerivedWeeklyRecap, DerivedPlayoffTeam } from './schemas';
import type { Game, Team } from './schemas';
// Future-phase contracts. They do not imply implemented metrics or live data.
export interface LiveGame { game: Game; providerEventId: string; clock: string | null; period: number | null; possessionTeamId: string | null; yardsToGoal: number | null }
export interface TeamForm { teamId: string; sampleSize: number; results: ('W' | 'L' | 'T')[]; averageMargin: number | null; pointsFor: number | null; pointsAgainst: number | null }
export interface ScheduleStrength { teamId: string; completed: number | null; remaining: number | null; completedSample: number; remainingSample: number; formulaVersion: string }
export interface UpsetRecord { gameId: string; winnerId: string; loserId: string; winnerPregameRank: number | null; loserPregameRank: number; rankGap: number | null; week: number }
export interface WeeklyRecap { week: number; cards: { category: string; gameId: string | null; teamId: string | null; description: string }[] }
export interface TeamComparison { away: Team; home: Team; scheduledGame: Game | null }
