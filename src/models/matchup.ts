import { MatchupTeam } from './matchup-team';

export interface Matchup {
  gameId: string;
  homeTeam: MatchupTeam;
  awayTeam: MatchupTeam;
}