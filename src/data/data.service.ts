import { Injectable } from '@nestjs/common';
import fs from 'fs';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStatsColumns } from '../models/advanced-team-stats-columns.enum';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { Team } from '../models/team';

@Injectable()
export class DataService {
  private advancedTeamData: Map<string, Team[]> = new Map();

  private advancedTeamStatsPrefix = 'advanced-team-stats';

  constructor(private formattingService: FormattingService) { }

  getAdvancedTeamStats(asOf?: string): Team[] {
    const statDate = asOf || this.getLatestFileDate(this.advancedTeamStatsPrefix);

    if (!this.advancedTeamData || !this.advancedTeamData.has(statDate)) {
      this.loadTeamData(statDate);
    }
    return this.advancedTeamData.get(statDate);
  }

  private getLatestFileDate(prefix: string): string {
    const files = fs.readdirSync(Constants.dataDirectory).filter(file => file.startsWith(prefix)).sort();
    return files[files.length - 1].replace(`${prefix}-`, '').replace('.json', '').replace(/-/g, '');
  }

  private loadTeamData(asOf: string): void {
    const dateFormatted = this.formattingService.formatDateForFileName(asOf);
    const teamStatsFilePath = `${Constants.dataDirectory}\\advanced-team-stats-${dateFormatted}.json`
    const teamStatsData: AdvancedTeamsStatsResponse = JSON.parse(fs.readFileSync(teamStatsFilePath).toString());
    const teamList: any[][] = teamStatsData.resultSets[0].rowSet;

    const teams: Team[] = [];

    for (let index = 0; index < teamList.length; index++) {
      const teamStats: any[] = teamList[index];
      teams.push({
        teamId: teamStats[AdvancedTeamStatsColumns.TEAM_ID],
        teamName: teamStats[AdvancedTeamStatsColumns.TEAM_NAME],
        advancedStats: {
          winningPercentage: teamStats[AdvancedTeamStatsColumns.W_PCT],
          offensiveEfficiency: teamStats[AdvancedTeamStatsColumns.OFF_RATING],
          offensiveRank: teamStats[AdvancedTeamStatsColumns.OFF_RATING_RANK],
          defensiveEfficiency: teamStats[AdvancedTeamStatsColumns.DEF_RATING],
          defensiveRank: teamStats[AdvancedTeamStatsColumns.DEF_RATING_RANK]
        }
      });
    }

    this.advancedTeamData.set(asOf, teams);
  }
}
