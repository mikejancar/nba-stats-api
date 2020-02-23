import { Controller, Get, Param, Query } from '@nestjs/common';

import { BoxScoreSummary } from '../models/box-score-summary';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) { }

  @Get('/:datePlayed')
  getEnhancedBoxScores(@Param('datePlayed') datePlayed: string, @Query('daysOfHistory') daysOfHistory = 0): BoxScoreSummary {
    return this.statsService.buildBoxScoreSummary(datePlayed, daysOfHistory);
  }
}
