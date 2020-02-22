import { Controller, Get, Param } from '@nestjs/common';

import { BoxScore } from '../models/box-score';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) { }

  @Get('/:datePlayed')
  getEnhancedBoxScores(@Param('datePlayed') datePlayed: string): BoxScore[] {
    return this.statsService.getEnhancedBoxScores(datePlayed);
  }
}
