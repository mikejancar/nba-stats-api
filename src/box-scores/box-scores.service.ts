import { Injectable } from '@nestjs/common';
import { addDays, format, parseISO } from 'date-fns';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { DataService } from '../data/data.service';
import { FormattingService } from '../formatting/formatting.service';
import { BoxScore } from '../models/box-score';
import { BoxScoreResponse } from '../models/box-score-response';
import { BoxScoreSummary } from '../models/box-score-summary';

@Injectable()
export class BoxScoresService {
  constructor(private dataService: DataService, private formattingService: FormattingService) { }

  getBoxScoresOn(datePlayed: string): any {
    const dateFormatted = this.formattingService.formatDateForStatsCall(datePlayed);
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=1000&DateFrom=${dateFormatted}&DateTo=${dateFormatted}&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=2019-20&SeasonType=Regular+Season&Sorter=DATE`;

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: BoxScoreResponse) => {
        fs.writeFileSync(`${Constants.dataDirectory}\\box-scores-${this.formattingService.formatDateForFileName(datePlayed)}.json`, JSON.stringify(response));
        console.log(`Successfully retrieved box scores from ${response.parameters.DateFrom}`);
        return response;
      })
      .catch(error => console.log(error));
  }

  async getRangeOfBoxScores(fromDate: string, upToDate: string): Promise<any> {
    try {
      let fromNumber = parseInt(fromDate);
      const toNumber = parseInt(upToDate);

      for (fromNumber; fromNumber <= toNumber; fromNumber++) {
        this.getBoxScoresOn(fromNumber.toString());
        await new Promise(r => setTimeout(r, 1000))
      }
      return `Successfully retrieved box scores from ${fromDate} to ${upToDate}`;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async buildBoxScoreSummary(endDate: string, daysOfHistory: number, excludeBoxScores = true, filter?: (box: BoxScore) => boolean, comparisonRange?: number): Promise<BoxScoreSummary> {
    const boxScoreSummary = await this.getRangeOfEnhancedBoxScores(endDate, daysOfHistory);

    const filterBy = filter || (() => true);
    boxScoreSummary.boxScores = boxScoreSummary.boxScores.filter(filterBy);

    this.summarizeWinningCharacteristics(boxScoreSummary);

    if (excludeBoxScores) {
      boxScoreSummary.boxScores = [];
    }
    if (comparisonRange) {
      boxScoreSummary.comparisonRange = comparisonRange;
    }
    return boxScoreSummary;
  }

  async getRangeOfEnhancedBoxScores(endDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const lastDate = parseISO(endDate);
    let firstDate = addDays(lastDate, -daysOfHistory);

    const boxScoreSummary: BoxScoreSummary = {
      fromDate: firstDate,
      toDate: lastDate,
      boxScores: []
    };

    while (firstDate <= lastDate) {
      const dateFormatted = format(firstDate, 'yyyyMMdd');
      boxScoreSummary.boxScores.push(...await this.dataService.getEnhancedBoxScores(dateFormatted));
      firstDate = addDays(firstDate, 1);
    }

    return boxScoreSummary;
  }

  summarizeWinningCharacteristics(boxScoreSummary: BoxScoreSummary): void {
    const totalBoxScores = boxScoreSummary.boxScores.length;
    boxScoreSummary.winningCharacteristics = {
      wasHomeTeam: this.formattingService.roundToNthDigit(boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.wasHomeTeam).length / totalBoxScores, 3),
      moreOffensivelyEfficient: this.formattingService.roundToNthDigit(boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreOffensivelyEfficient).length / totalBoxScores, 3),
      moreDefensivelyEfficient: this.formattingService.roundToNthDigit(boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreDefensivelyEfficient).length / totalBoxScores, 3),
      hadHigherWinningPercentage: this.formattingService.roundToNthDigit(boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.hadHigherWinningPercentage).length / totalBoxScores, 3),
      averagePointGap: this.formattingService.roundToNthDigit(boxScoreSummary.boxScores.map(box => box.winningCharacteristics.pointGap).reduce((accum, next) => accum + next) / totalBoxScores, 2)
    };
  }
}
