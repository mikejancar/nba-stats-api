import { Team } from './team';

export interface Matchup {
  gameId: string;
  homeTeam: Team;
  awayTeam: Team;
}