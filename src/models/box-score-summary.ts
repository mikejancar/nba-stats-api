import { BoxScore } from './box-score';
import { WinningCharacteristicSummary } from './winning-characteristic-summary';

export interface BoxScoreSummary {
  fromDate: Date;
  toDate: Date;
  boxScores: BoxScore[];
  winningCharacteristics?: WinningCharacteristicSummary;
}