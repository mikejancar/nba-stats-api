import { BoxScoreParameters } from './box-score-parameters';
import { ResultSet } from './result-set';

export interface BoxScoreResponse {
  resource: string;
  parameters: BoxScoreParameters;
  resultSets: ResultSet[];
  errorMessage?: string;
}
