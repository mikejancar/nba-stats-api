import { Injectable } from '@nestjs/common';

import { BoxScoresService } from '../box-scores/box-scores.service';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStats } from '../models/advanced-team-stats';
import { BoxScore } from '../models/box-score';
import { BoxScorePredictors } from '../models/box-score-predictors';
import { BoxScoreSummary } from '../models/box-score-summary';
import { MatchupTeam } from '../models/matchup-team';
import { Team } from '../models/team';

@Injectable()
export class StatsService {
  constructor(private boxScoresService: BoxScoresService, private formattingService: FormattingService) {}

  determineWinningCharacteristics(boxScore: BoxScore): void {
    const winningTeam = boxScore.homeTeam.wonGame ? boxScore.homeTeam : boxScore.awayTeam;
    const losingTeam = boxScore.homeTeam.wonGame ? boxScore.awayTeam : boxScore.homeTeam;

    boxScore.winningCharacteristics = {
      wasHomeTeam: boxScore.homeTeam.wonGame,
      moreOffensivelyEfficient: winningTeam.advancedStats.offensiveEfficiency > losingTeam.advancedStats.offensiveEfficiency,
      offensiveEfficiencyGap: this.formattingService.roundToNthDigit(
        winningTeam.advancedStats.offensiveEfficiency - losingTeam.advancedStats.offensiveEfficiency,
        3
      ),
      moreDefensivelyEfficient: winningTeam.advancedStats.defensiveEfficiency < losingTeam.advancedStats.defensiveEfficiency,
      defensiveEfficiencyGap: this.formattingService.roundToNthDigit(
        losingTeam.advancedStats.defensiveEfficiency - winningTeam.advancedStats.defensiveEfficiency,
        3
      ),
      hadHigherWinningPercentage: winningTeam.advancedStats.winningPercentage > losingTeam.advancedStats.winningPercentage,
      winningPercentageGap: this.formattingService.roundToNthDigit(
        winningTeam.advancedStats.winningPercentage - losingTeam.advancedStats.winningPercentage,
        3
      ),
      pointGap: winningTeam.advancedStats.pointsScored - losingTeam.advancedStats.pointsScored
    };
  }

  summarizeWinningCharacteristics(boxScoreSummary: BoxScoreSummary): void {
    const totalBoxScores = boxScoreSummary.boxScores.length;
    boxScoreSummary.winningCharacteristics = {
      wasHomeTeam: this.formattingService.roundToNthDigit(
        boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.wasHomeTeam).length / totalBoxScores,
        3
      ),
      moreOffensivelyEfficient: this.formattingService.roundToNthDigit(
        boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreOffensivelyEfficient).length / totalBoxScores,
        3
      ),
      moreDefensivelyEfficient: this.formattingService.roundToNthDigit(
        boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreDefensivelyEfficient).length / totalBoxScores,
        3
      ),
      hadHigherWinningPercentage: this.formattingService.roundToNthDigit(
        boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.hadHigherWinningPercentage).length / totalBoxScores,
        3
      ),
      averagePointGap: this.formattingService.roundToNthDigit(
        boxScoreSummary.boxScores.map(box => box.winningCharacteristics.pointGap).reduce((accum, next) => accum + next) / totalBoxScores,
        2
      )
    };
  }

  computeStatGaps(homeTeam: MatchupTeam, awayTeam: MatchupTeam): void {
    homeTeam.statGaps = this.createStatGaps(homeTeam, awayTeam);
    awayTeam.statGaps = this.createStatGaps(awayTeam, homeTeam);
  }

  private createStatGaps(team: Team, opponent: Team): AdvancedTeamStats {
    return {
      winningPercentage: this.formattingService.roundToNthDigit(team.advancedStats.winningPercentage - opponent.advancedStats.winningPercentage, 3),
      offensiveEfficiency: this.formattingService.roundToNthDigit(
        team.advancedStats.offensiveEfficiency - opponent.advancedStats.offensiveEfficiency,
        1
      ),
      offensiveRank: opponent.advancedStats.offensiveRank - team.advancedStats.offensiveRank,
      defensiveEfficiency: this.formattingService.roundToNthDigit(
        opponent.advancedStats.defensiveEfficiency - team.advancedStats.defensiveEfficiency,
        1
      ),
      defensiveRank: opponent.advancedStats.defensiveRank - team.advancedStats.defensiveRank
    };
  }

  async computePredictors(homeTeam: MatchupTeam, awayTeam: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<void> {
    homeTeam.predictors = await this.createPredictors(homeTeam, scheduleDate, daysOfHistory);
    awayTeam.predictors = await this.createPredictors(awayTeam, scheduleDate, daysOfHistory);
  }

  private async createPredictors(team: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<BoxScorePredictors> {
    return Promise.resolve({
      winningPercentage: await this.predictByWinningPercentage(team, scheduleDate, daysOfHistory),
      offensiveEfficiency: await this.predictByOffensiveEfficiency(team, scheduleDate, daysOfHistory),
      defensiveEfficiency: await this.predictByDefensiveEfficiency(team, scheduleDate, daysOfHistory)
    });
  }

  private async predictByWinningPercentage(team: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const comparisonRange = 0.05;
    const winningPercentageFilter = (box: BoxScore) =>
      Math.abs(team.statGaps.winningPercentage - box.winningCharacteristics.winningPercentageGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, daysOfHistory, true, winningPercentageFilter, comparisonRange);
  }

  private async predictByOffensiveEfficiency(team: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const comparisonRange = 0.5;
    const offensiveEfficiencyFilter = (box: BoxScore) =>
      Math.abs(team.statGaps.offensiveEfficiency - box.winningCharacteristics.offensiveEfficiencyGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, daysOfHistory, true, offensiveEfficiencyFilter, comparisonRange);
  }

  private async predictByDefensiveEfficiency(team: MatchupTeam, scheduleDate: string, daysOfHistory: number): Promise<BoxScoreSummary> {
    const comparisonRange = 0.5;
    const defensiveEfficiencyFilter = (box: BoxScore) =>
      Math.abs(team.statGaps.defensiveEfficiency - box.winningCharacteristics.defensiveEfficiencyGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, daysOfHistory, true, defensiveEfficiencyFilter, comparisonRange);
  }
}
