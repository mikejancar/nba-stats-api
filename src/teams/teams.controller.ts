import { Controller, Get, Param, Query } from '@nestjs/common';
import { Team } from 'src/models/team';

import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) { }

  @Get()
  getTeams(): Team[] {
    return this.teamsService.getTeams();
  }

  @Get('advancedStats/:upToDate')
  async getTeamSplits(@Param('upToDate') upToDate, @Query('fromDate') fromDate?): Promise<any> {
    if (fromDate) {
      return await this.teamsService.getRangeOfAdvancedTeamStats(fromDate, upToDate);
    }
    return this.teamsService.getAdvancedTeamStats(upToDate);
  }
}
