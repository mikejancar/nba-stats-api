import { Controller, Get, Param } from '@nestjs/common';
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
  getTeamSplits(@Param('upToDate') upToDate): any {
    return this.teamsService.getAdvancedTeamStats(upToDate);
  }
}
