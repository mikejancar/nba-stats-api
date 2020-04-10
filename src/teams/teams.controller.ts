import { Controller, Get, Param, Query } from '@nestjs/common';

import { Team } from '../models';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  async getTeams(@Query('asOf') asOf?: string): Promise<Team[]> {
    return await this.teamsService.getAdvancedTeams(asOf);
  }

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string, @Query('asOf') asOf?: string): Promise<Team> {
    return await this.teamsService.getAdvancedTeam(parseInt(teamId), asOf);
  }

  @Get('advancedStats/:upToDate')
  async getTeamSplits(@Param('upToDate') upToDate, @Query('fromDate') fromDate?): Promise<any> {
    if (fromDate) {
      return await this.teamsService.getRangeOfAdvancedTeamStats(fromDate, upToDate);
    }
    return this.teamsService.getAdvancedTeamStats(upToDate);
  }
}
