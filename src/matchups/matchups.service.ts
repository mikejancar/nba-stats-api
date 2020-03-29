import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { BoxScoresService } from '../box-scores/box-scores.service';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStats } from '../models/advanced-team-stats';
import { BoxScore } from '../models/box-score';
import { BoxScorePredictors } from '../models/box-score-predictors';
import { BoxScoreSummary } from '../models/box-score-summary';
import { Matchup } from '../models/matchup';
import { MatchupColumns } from '../models/matchup-columns.enum';
import { MatchupResponse } from '../models/matchup-response';
import { MatchupTeam } from '../models/matchup-team';
import { Team } from '../models/team';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class MatchupsService {
  private matchupsData: Map<string, Matchup[]> = new Map();

  constructor(private boxScoresService: BoxScoresService, private teamsService: TeamsService, private formattingService: FormattingService) { }

  getMatchups(scheduleDate: string): Promise<Matchup[]> {
    if (this.matchupsData.has(scheduleDate)) {
      return Promise.resolve(this.matchupsData.get(scheduleDate));
    }
    const dateFormatted = this.formattingService.formatDateForStatsCall(scheduleDate);
    const url = `https://stats.nba.com/stats/scoreboardV2?DayOffset=0&LeagueID=00&gameDate=${dateFormatted}`;

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then(async (response: MatchupResponse) => {
        console.log(`Successfully retrieved matchups from ${dateFormatted}`);
        const matchups = await this.createMatchups(response, scheduleDate);
        this.matchupsData.set(scheduleDate, matchups);
        return matchups;
      });
  }

  private async createMatchups(response: MatchupResponse, scheduleDate: string): Promise<Matchup[]> {
    const matchups: Matchup[] = [];
    for (let i = 0; i < response.resultSets[0].rowSet.length; i++) {
      const matchupData = response.resultSets[0].rowSet[i];
      const homeTeam: MatchupTeam = await this.teamsService.getTeam(matchupData[MatchupColumns.HOME_TEAM_ID]);
      const awayTeam: MatchupTeam = await this.teamsService.getTeam(matchupData[MatchupColumns.VISITOR_TEAM_ID]);

      this.computeStatGaps(homeTeam, awayTeam);
      await this.computePredictors(homeTeam, awayTeam, scheduleDate);

      const matchup: Matchup = {
        gameId: matchupData[MatchupColumns.GAME_ID],
        homeTeam,
        awayTeam
      };

      matchups.push(matchup);
    }
    return matchups;
  }

  private computeStatGaps(homeTeam: MatchupTeam, awayTeam: MatchupTeam): void {
    homeTeam.statGaps = this.createStatGaps(homeTeam, awayTeam);
    awayTeam.statGaps = this.createStatGaps(awayTeam, homeTeam);
  }

  private createStatGaps(team: Team, opponent: Team): AdvancedTeamStats {
    return {
      winningPercentage: this.formattingService.roundToNthDigit(team.advancedStats.winningPercentage - opponent.advancedStats.winningPercentage, 3),
      offensiveEfficiency: this.formattingService.roundToNthDigit(team.advancedStats.offensiveEfficiency - opponent.advancedStats.offensiveEfficiency, 1),
      offensiveRank: opponent.advancedStats.offensiveRank - team.advancedStats.offensiveRank,
      defensiveEfficiency: this.formattingService.roundToNthDigit(opponent.advancedStats.defensiveEfficiency - team.advancedStats.defensiveEfficiency, 1),
      defensiveRank: opponent.advancedStats.defensiveRank - team.advancedStats.defensiveRank
    };
  }

  private async computePredictors(homeTeam: MatchupTeam, awayTeam: MatchupTeam, scheduleDate: string): Promise<void> {
    homeTeam.predictors = await this.createPredictors(homeTeam, scheduleDate);
    awayTeam.predictors = await this.createPredictors(awayTeam, scheduleDate);
  }

  private async createPredictors(team: MatchupTeam, scheduleDate: string): Promise<BoxScorePredictors> {
    return Promise.resolve({
      winningPercentage: await this.predictByWinningPercentage(team, scheduleDate),
      offensiveEfficiency: await this.predictByOffensiveEfficiency(team, scheduleDate),
      defensiveEfficiency: await this.predictByDefensiveEfficiency(team, scheduleDate)
    });
  }

  private async predictByWinningPercentage(team: MatchupTeam, scheduleDate: string): Promise<BoxScoreSummary> {
    const comparisonRange = 0.05;
    const winningPercentageFilter = (box: BoxScore) => Math.abs(team.statGaps.winningPercentage - box.winningCharacteristics.winningPercentageGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, 60, true, winningPercentageFilter, comparisonRange);
  }

  private async predictByOffensiveEfficiency(team: MatchupTeam, scheduleDate: string): Promise<BoxScoreSummary> {
    const comparisonRange = 0.5;
    const offensiveEfficiencyFilter = (box: BoxScore) => Math.abs(team.statGaps.offensiveEfficiency - box.winningCharacteristics.offensiveEfficiencyGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, 60, true, offensiveEfficiencyFilter, comparisonRange);
  }

  private async predictByDefensiveEfficiency(team: MatchupTeam, scheduleDate: string): Promise<BoxScoreSummary> {
    const comparisonRange = 0.5;
    const defensiveEfficiencyFilter = (box: BoxScore) => Math.abs(team.statGaps.defensiveEfficiency - box.winningCharacteristics.defensiveEfficiencyGap) <= comparisonRange;
    return await this.boxScoresService.buildBoxScoreSummary(scheduleDate, 60, true, defensiveEfficiencyFilter, comparisonRange);
  }
}
