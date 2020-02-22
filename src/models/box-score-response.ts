import { ResultSet } from './result-set';
import { BoxScoreParameters } from './box-score-parameters';

export interface BoxScoreResponse {
  resource: string;
  parameters: BoxScoreParameters;
  resultSets: ResultSet[];
}