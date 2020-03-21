import { AdvancedTeamStats } from './advanced-team-stats';
import { Team } from './team';

export interface Matchup {
  gameId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeVsAway: AdvancedTeamStats;
}