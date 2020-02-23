import { BoxScoreTeam } from './box-score-team';
import { WinningCharacteristics } from './winning-characteristics';

export interface BoxScore {
  homeTeam: BoxScoreTeam;
  awayTeam: BoxScoreTeam;
  datePlayed: string;
  winningCharacteristics?: WinningCharacteristics;
}