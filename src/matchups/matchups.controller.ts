import { Controller, Get, Param } from '@nestjs/common';

import { Matchup } from '../models/matchup';
import { MatchupsService } from './matchups.service';

@Controller('matchups')
export class MatchupsController {
  constructor(private matchupsService: MatchupsService) { }

  @Get(':scheduleDate')
  async getMatchups(@Param('scheduleDate') scheduleDate: string): Promise<Matchup[]> {
    return await this.matchupsService.getMatchups(scheduleDate);
  }

  @Get(':scheduleDate/:gameId')
  async getMatchup(@Param('scheduleDate') scheduleDate: string, @Param('gameId') gameId: string): Promise<Matchup> {
    const matchups: Matchup[] = await this.matchupsService.getMatchups(scheduleDate);
    return Promise.resolve(matchups.find(match => match.gameId === gameId));
  }
}
