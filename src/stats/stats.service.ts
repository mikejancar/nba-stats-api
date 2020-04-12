import { Injectable } from '@nestjs/common';

import { FormattingService } from '../formatting/formatting.service';
import {
  AdvancedTeamStats, BoxScore, BoxScoreSummary, MatchupTeam, Team, WinningCharacteristicSummary
} from '../models';

export enum DefaultComparisonRanges {
  WinningPercentage = 0.05,
  OffensiveEfficiency = 0.5,
  DefensiveEfficiency = 0.5
}

@Injectable()
export class StatsService {
  constructor(private formattingService: FormattingService) {}

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

  summarizeWinningCharacteristics(boxScoreSummary: BoxScoreSummary): WinningCharacteristicSummary {
    const totalBoxScores = boxScoreSummary.boxScores.length;
    if (totalBoxScores === 0) {
      return { wasHomeTeam: 0, moreOffensivelyEfficient: 0, moreDefensivelyEfficient: 0, hadHigherWinningPercentage: 0, averagePointGap: 0 };
    }

    return {
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

  predictByWinningPercentage(team: MatchupTeam, comparisonRange: number): (box: BoxScore) => boolean {
    return (box: BoxScore) => Math.abs(team.statGaps.winningPercentage - box.winningCharacteristics.winningPercentageGap) <= comparisonRange;
  }

  predictByOffensiveEfficiency(team: MatchupTeam, comparisonRange: number): (box: BoxScore) => boolean {
    return (box: BoxScore) => Math.abs(team.statGaps.offensiveEfficiency - box.winningCharacteristics.offensiveEfficiencyGap) <= comparisonRange;
  }

  predictByDefensiveEfficiency(team: MatchupTeam, comparisonRange: number): (box: BoxScore) => boolean {
    return (box: BoxScore) => Math.abs(team.statGaps.defensiveEfficiency - box.winningCharacteristics.defensiveEfficiencyGap) <= comparisonRange;
  }
}
