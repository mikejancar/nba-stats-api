import { Controller, Get, Param, Query } from '@nestjs/common';

import { BoxScoreSummary } from '../models/box-score-summary';
import { BoxScoresService } from './box-scores.service';

@Controller('boxScores')
export class BoxScoresController {
  constructor(private boxScoresService: BoxScoresService) { }

  @Get('/:datePlayed')
  async getBoxScoresOn(@Param('datePlayed') datePlayed: string, @Query('fromDate') fromDate?) {
    if (fromDate) {
      return await this.boxScoresService.getRangeOfBoxScores(fromDate, datePlayed);
    }
    return this.boxScoresService.getBoxScoresOn(datePlayed);
  }

  @Get('/enhanced/:datePlayed')
  getEnhancedBoxScores(@Param('datePlayed') datePlayed: string, @Query('daysOfHistory') daysOfHistory = 0): BoxScoreSummary {
    return this.boxScoresService.buildBoxScoreSummary(datePlayed, daysOfHistory);
  }
}
