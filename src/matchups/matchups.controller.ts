import { Controller, Get, Param, Query } from '@nestjs/common';

import { Matchup } from '../models/matchup';
import { MatchupsService } from './matchups.service';

@Controller('matchups')
export class MatchupsController {
  constructor(private matchupsService: MatchupsService) {}

  @Get(':scheduleDate')
  async getMatchups(@Param('scheduleDate') scheduleDate: string): Promise<Matchup[]> {
    return await this.matchupsService.getMatchups(scheduleDate);
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
