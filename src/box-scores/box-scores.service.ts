import { Injectable } from '@nestjs/common';

import { DataService } from '../data/data.service';
import { DateFormats, FormattingService } from '../formatting/formatting.service';
import { BoxScore } from '../models/box-score';
import { BoxScorePredictors } from '../models/box-score-predictors';
import { BoxScoreResponse } from '../models/box-score-response';
import { BoxScoreSummary } from '../models/box-score-summary';
import { DataSources } from '../models/data-sources.enum';
import { Matchup } from '../models/matchup';
import { MatchupTeam } from '../models/matchup-team';
import { NetworkService } from '../network/network.service';
import { DefaultComparisonRanges, StatsService } from '../stats/stats.service';

@Injectable()
export class BoxScoresService {
  constructor(
    private dataService: DataService,
    private formattingService: FormattingService,
    private networkService: NetworkService,
    private statsService: StatsService
  ) {}

  async getBoxScoresOn(datePlayed: string): Promise<BoxScoreResponse> {
    const dateFormatted = this.formattingService.formatDateForStatsCall(datePlayed);
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=1000&DateFrom=${dateFormatted}&DateTo=${dateFormatted}&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=2019-20&SeasonType=Regular+Season&Sorter=DATE`;

    try {
      const response = await this.networkService.get(url);
      const fileName = this.formattingService.formatDateForFileName(datePlayed);
      await this.networkService.saveObjectToBucket(DataSources.BoxScores, fileName, JSON.stringify(response));

      console.log(`Successfully retrieved box scores from ${response.parameters.DateFrom}`);
      return Promise.resolve(response);
    } catch (error) {
      console.error(`Error getting box scores for ${datePlayed}`, error);
      throw error;
    }
  }

  async getRangeOfBoxScores(fromDate: string, upToDate: string): Promise<any> {
    try {
      let fromNumber = parseInt(fromDate);
      const toNumber = parseInt(upToDate);

      for (fromNumber; fromNumber <= toNumber; fromNumber++) {
        this.getBoxScoresOn(fromNumber.toString());
        await new Promise(r => setTimeout(r, 1000));
      }
      return `Successfully retrieved box scores from ${fromDate} to ${upToDate}`;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async buildBoxScoreSummary(
    boxScoreSummary: BoxScoreSummary,
    excludeBoxScores = true,
    filter?: (box: BoxScore) => boolean,
    comparisonRange?: number
  ): Promise<BoxScoreSummary> {
    const filterBy = filter || (() => true);
    boxScoreSummary.boxScores = boxScoreSummary.boxScores.filter(filterBy);

    this.statsService.summarizeWinningCharacteristics(boxScoreSummary);

    if (excludeBoxScores) {
      boxScoreSummary.boxScores = [];
    }
    if (comparisonRange) {
      boxScoreSummary.comparisonRange = comparisonRange;
    }
    return boxScoreSummary;
  }

  async getRangeOfEnhancedBoxScores(endDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const lastDate = this.formattingService.parseDate(endDate);
    let firstDate = this.formattingService.addDaysToDate(lastDate, -daysOfHistory);

    const boxScoreSummary: BoxScoreSummary = {
      fromDate: firstDate,
      toDate: lastDate,
      boxScores: []
    };

    while (firstDate <= lastDate) {
      const dateFormatted = this.formattingService.formatDate(firstDate, DateFormats.Numeric);
      boxScoreSummary.boxScores.push(...(await this.dataService.getEnhancedBoxScores(dateFormatted)));
      firstDate = this.formattingService.addDaysToDate(firstDate, 1);
    }

    return boxScoreSummary;
  }

  async getBoxScorePredictors(matchup: Matchup, scheduleDate: string, daysOfHistory: number): Promise<void> {
    matchup.homeTeam.predictors = await this.createPredictors(matchup.homeTeam, scheduleDate, daysOfHistory);
    matchup.awayTeam.predictors = await this.createPredictors(matchup.awayTeam, scheduleDate, daysOfHistory);
    return Promise.resolve();
  }

  private async createPredictors(team: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<BoxScorePredictors> {
    const boxScoreSummary = await this.getRangeOfEnhancedBoxScores(scheduleDate, daysOfHistory);
    const winningPctFilter = this.statsService.predictByWinningPercentage(team, DefaultComparisonRanges.WinningPercentage);
    const offensiveEffFilter = this.statsService.predictByOffensiveEfficiency(team, DefaultComparisonRanges.OffensiveEfficiency);
    const defensiveEffFilter = this.statsService.predictByDefensiveEfficiency(team, DefaultComparisonRanges.DefensiveEfficiency);

    return Promise.resolve({
      winningPercentage: await this.buildBoxScoreSummary(boxScoreSummary, true, winningPctFilter),
      offensiveEfficiency: await this.buildBoxScoreSummary(boxScoreSummary, true, offensiveEffFilter),
      defensiveEfficiency: await this.buildBoxScoreSummary(boxScoreSummary, true, defensiveEffFilter)
    });
  }
}
