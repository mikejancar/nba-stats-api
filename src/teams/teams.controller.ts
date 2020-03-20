import { Controller, Get, Param, Query } from '@nestjs/common';
import { Team } from 'src/models/team';

import { DataService } from '../data/data.service';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private dataService: DataService, private teamsService: TeamsService) { }

  @Get()
  getTeams(@Query('asOf') asOf?: string): Team[] {
    return this.dataService.getAdvancedTeamStats(asOf);
  }

  @Get(':teamId')
  getTeam(@Param('teamId') teamId: string, @Query('asOf') asOf?: string): Team {
    const teamStats: Team[] = this.dataService.getAdvancedTeamStats(asOf);
    return teamStats.find(team => team.teamId === parseInt(teamId));
  }

  @Get('advancedStats/:upToDate')
  async getTeamSplits(@Param('upToDate') upToDate, @Query('fromDate') fromDate?): Promise<any> {
    if (fromDate) {
      return await this.teamsService.getRangeOfAdvancedTeamStats(fromDate, upToDate);
    }
    return this.teamsService.getAdvancedTeamStats(upToDate);
  }
}
