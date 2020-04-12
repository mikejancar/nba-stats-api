import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import { DataService } from '../data/data.service';
import { Matchup } from '../models';
import { MatchupsService } from './matchups.service';

@Controller('matchups')
export class MatchupsController {
  constructor(private dataService: DataService, private matchupsService: MatchupsService) {}

  @Get(':scheduleDate')
  async getMatchups(@Param('scheduleDate') scheduleDate: string): Promise<Matchup[]> {
    const matchups = await this.dataService.getMatchups(scheduleDate);
    if (matchups.length === 0) {
      throw new NotFoundException(`Matchups for ${scheduleDate} could not be found`);
    }
    return matchups;
  }

  @Get(':scheduleDate/:gameId')
  async getMatchup(
    @Param('scheduleDate') scheduleDate: string,
    @Param('gameId') gameId: string,
    @Query('daysOfHistory') daysOfHistory?: number
  ): Promise<Matchup> {
    return await this.matchupsService.getAdvancedMatchup(scheduleDate, gameId, daysOfHistory);
  }
}
