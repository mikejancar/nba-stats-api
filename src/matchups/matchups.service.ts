import { Injectable } from '@nestjs/common';

import { BoxScoresService } from '../box-scores/box-scores.service';
import { FormattingService } from '../formatting/formatting.service';
import { Matchup } from '../models/matchup';
import { MatchupColumns } from '../models/matchup-columns.enum';
import { MatchupResponse } from '../models/matchup-response';
import { MatchupTeam } from '../models/matchup-team';
import { NetworkService } from '../network/network.service';
import { StatsService } from '../stats/stats.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class MatchupsService {
  private matchupsData: Map<string, Matchup[]> = new Map();

  constructor(
    private teamsService: TeamsService,
    private formattingService: FormattingService,
    private networkService: NetworkService,
    private statsService: StatsService,
    private boxScoresService: BoxScoresService
  ) {}

  async getMatchups(scheduleDate: string): Promise<Matchup[]> {
    if (this.matchupsData.has(scheduleDate)) {
      return Promise.resolve(this.matchupsData.get(scheduleDate));
    }
    const dateFormatted = this.formattingService.formatDateForStatsCall(scheduleDate);
    const url = `https://stats.nba.com/stats/scoreboardV2?DayOffset=0&LeagueID=00&gameDate=${dateFormatted}`;

    try {
      const response: MatchupResponse = await this.networkService.get(url);
      console.log(`Successfully retrieved matchups from ${dateFormatted}`);

      const matchups = await this.createMatchups(response);
      this.matchupsData.set(scheduleDate, matchups);

      return matchups;
    } catch (error) {
      console.error(`Failed to retrieve matchups from ${dateFormatted}`, error);
      throw error;
    }
  }

  private async createMatchups(response: MatchupResponse): Promise<Matchup[]> {
    const matchups: Matchup[] = [];
    for (let i = 0; i < response.resultSets[0].rowSet.length; i++) {
      const matchupData = response.resultSets[0].rowSet[i];
      const matchup: Matchup = this.createMatchup(matchupData);
      matchups.push(matchup);
    }
    return matchups;
  }

  private createMatchup(matchupData: any[]): Matchup {
    const homeTeam: MatchupTeam = this.teamsService.getTeam(matchupData[MatchupColumns.HOME_TEAM_ID]);
    const awayTeam: MatchupTeam = this.teamsService.getTeam(matchupData[MatchupColumns.VISITOR_TEAM_ID]);

    return {
      gameId: matchupData[MatchupColumns.GAME_ID],
      homeTeam,
      awayTeam
    };
  }

  async getAdvancedMatchup(scheduleDate: string, gameId: string, statRangeInDays = 30): Promise<Matchup> {
    if (!this.matchupsData.has(scheduleDate)) {
      await this.getMatchups(scheduleDate);
    }
    const matchup: Matchup = this.matchupsData.get(scheduleDate).find(matchup => matchup.gameId === gameId);
    const homeTeam: MatchupTeam = await this.teamsService.getAdvancedTeam(matchup.homeTeam.teamId, scheduleDate);
    const awayTeam: MatchupTeam = await this.teamsService.getAdvancedTeam(matchup.awayTeam.teamId, scheduleDate);

    this.statsService.computeStatGaps(homeTeam, awayTeam);
    await this.boxScoresService.getBoxScorePredictors(matchup, scheduleDate, statRangeInDays);

    return Promise.resolve({ gameId, homeTeam, awayTeam });
  }
}
