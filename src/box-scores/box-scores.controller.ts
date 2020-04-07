import { Controller, Get, Param, Query } from '@nestjs/common';

import { BoxScoresService } from './box-scores.service';

@Controller('boxScores')
export class BoxScoresController {
  constructor(private boxScoresService: BoxScoresService) {}

  @Get('/:datePlayed')
  async getBoxScoresOn(@Param('datePlayed') datePlayed: string, @Query('fromDate') fromDate?) {
    if (fromDate) {
      return await this.boxScoresService.getRangeOfBoxScores(fromDate, datePlayed);
    }
    return this.boxScoresService.getBoxScoresOn(datePlayed);
  }
}
