import { Injectable } from '@nestjs/common';

import { DataService } from '../data/data.service';
import { DateFormats, FormattingService } from '../formatting/formatting.service';
import { BoxScorePredictors, BoxScoreSummary, DataSources, Matchup, MatchupTeam } from '../models';
import { DefaultComparisonRanges, StatsService } from '../stats/stats.service';

@Injectable()
export class BoxScoresService {
  constructor(private dataService: DataService, private formattingService: FormattingService, private statsService: StatsService) {}

  async buildBoxScoreSummary(boxScoreSummary: BoxScoreSummary, excludeBoxScores = true, comparisonRange?: number): Promise<BoxScoreSummary> {
    boxScoreSummary.winningCharacteristics = this.statsService.summarizeWinningCharacteristics(boxScoreSummary);

    if (excludeBoxScores) {
      boxScoreSummary.boxScores = [];
    }
    if (comparisonRange) {
      boxScoreSummary.comparisonRange = comparisonRange;
    }
    return boxScoreSummary;
  }

  async getRangeOfEnhancedBoxScores(endDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const latestAvailableDate = await this.dataService.determineLatestValidDate(DataSources.BoxScores, endDate);
    const lastDate = this.formattingService.parseDate(latestAvailableDate);
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

    const winPctSummary = {
      ...boxScoreSummary,
      boxScores: boxScoreSummary.boxScores.filter(this.statsService.predictByWinningPercentage(team, DefaultComparisonRanges.WinningPercentage))
    };
    const offEffSummary = {
      ...boxScoreSummary,
      boxScores: boxScoreSummary.boxScores.filter(this.statsService.predictByOffensiveEfficiency(team, DefaultComparisonRanges.OffensiveEfficiency))
    };
    const defEffSummary = {
      ...boxScoreSummary,
      boxScores: boxScoreSummary.boxScores.filter(this.statsService.predictByDefensiveEfficiency(team, DefaultComparisonRanges.DefensiveEfficiency))
    };

    return Promise.resolve({
      winningPercentage: await this.buildBoxScoreSummary(winPctSummary, true),
      offensiveEfficiency: await this.buildBoxScoreSummary(offEffSummary, true),
      defensiveEfficiency: await this.buildBoxScoreSummary(defEffSummary, true)
    });
  }
}
