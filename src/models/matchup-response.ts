import { MatchupParameters } from './matchup-parameters';
import { ResultSet } from './result-set';

export interface MatchupResponse {
  resource: string;
  parameters: MatchupParameters;
  resultSets: ResultSet[];
  errorMessage?: string;
}
