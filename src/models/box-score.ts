import { BoxScoreTeam } from './box-score-team';

export interface BoxScore {
  homeTeam: BoxScoreTeam;
  awayTeam: BoxScoreTeam;
  datePlayed: string;
}