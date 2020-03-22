import { BoxScoreSummary } from './box-score-summary';

export interface BoxScorePredictors {
  winningPercentage: BoxScoreSummary;
  offensiveEfficiency: BoxScoreSummary;
  defensiveEfficiency: BoxScoreSummary;
}