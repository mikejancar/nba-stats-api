import { AdvancedTeamStatsParameters } from './advanced-team-stats-parameters';
import { ResultSet } from './result-set';

export interface AdvancedTeamsStatsResponse {
  resource: string;
  parameters: AdvancedTeamStatsParameters;
  resultSets: ResultSet[];
  errorMessage?: string;
}
