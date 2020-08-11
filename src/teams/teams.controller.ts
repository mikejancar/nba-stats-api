import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';

import { LoggingInterceptor } from '../logging/logging.interceptor';
import { Team } from '../models';
import { TeamsService } from './teams.service';

@UseInterceptors(LoggingInterceptor)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) { }

  @Get()
  async getTeams(@Query('asOf') asOf?: string): Promise<Team[]> {
    return await this.teamsService.getAdvancedTeams(asOf);
  }

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string, @Query('asOf') asOf?: string): Promise<Team> {
    return await this.teamsService.getAdvancedTeam(parseInt(teamId), asOf);
  }
}
