import { Controller, Get, Param, Query } from '@nestjs/common';
import { Team } from 'src/models/team.interface';

import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) { }

  @Get()
  getTeams(): Team[] {
    return this.teamsService.getTeams();
  }

  @Get('advancedStats/:upToDate')
  getTeamSplits(@Param('upToDate') upToDate, @Query('fromDate') fromDate?): any {
    if (fromDate) {
      return this.teamsService.getRangeOfAdvancedTeamStats(fromDate, upToDate);
    }
    return this.teamsService.getAdvancedTeamStats(upToDate);
  }
}
