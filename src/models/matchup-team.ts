import { AdvancedTeamStats } from './advanced-team-stats';
import { BoxScorePredictors } from './box-score-predictors';
import { Team } from './team';

export interface MatchupTeam extends Team {
  statGaps?: AdvancedTeamStats;
  predictors?: BoxScorePredictors;
}