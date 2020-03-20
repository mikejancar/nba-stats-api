import { AdvancedTeamStats } from './advanced-team-stats';

export interface Team {
  teamId: number;
  teamName: string;
  abbreviation?: string;
  simpleName?: string;
  location?: string;
  advancedStats?: AdvancedTeamStats;
}
