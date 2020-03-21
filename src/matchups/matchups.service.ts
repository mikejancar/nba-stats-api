import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStats } from '../models/advanced-team-stats';
import { Matchup } from '../models/matchup';
import { MatchupColumns } from '../models/matchup-columns.enum';
import { MatchupResponse } from '../models/matchup-response';
import { Team } from '../models/team';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class MatchupsService {
  private matchupsData: Map<string, Matchup[]> = new Map();

  constructor(private teamsService: TeamsService, private formattingService: FormattingService) { }

  getMatchups(scheduleDate: string): Promise<Matchup[]> {
    if (this.matchupsData.has(scheduleDate)) {
      return Promise.resolve(this.matchupsData.get(scheduleDate));
    }
    const dateFormatted = this.formattingService.formatDateForStatsCall(scheduleDate);
    const url = `https://stats.nba.com/stats/scoreboardV2?DayOffset=0&LeagueID=00&gameDate=${dateFormatted}`;

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: MatchupResponse) => {
        console.log(`Successfully retrieved matchups from ${dateFormatted}`);
        const matchups = this.createMatchups(response);
        this.matchupsData.set(scheduleDate, matchups);
        return matchups;
      });
  }

  private createMatchups(response: MatchupResponse): Matchup[] {
    const matchups: Matchup[] = [];
    for (let i = 0; i < response.resultSets[0].rowSet.length; i++) {
      const matchupData = response.resultSets[0].rowSet[i];
      const homeTeam = this.teamsService.getTeam(matchupData[MatchupColumns.HOME_TEAM_ID]);
      const awayTeam = this.teamsService.getTeam(matchupData[MatchupColumns.VISITOR_TEAM_ID]);

      matchups.push({
        gameId: matchupData[MatchupColumns.GAME_ID],
        homeTeam,
        awayTeam,
        homeVsAway: this.computeStatGaps(homeTeam, awayTeam)
      });
    }
    return matchups;
  }

  private computeStatGaps(homeTeam: Team, awayTeam: Team): AdvancedTeamStats {
    return {
      winningPercentage: this.roundToNthDigit(homeTeam.advancedStats.winningPercentage - awayTeam.advancedStats.winningPercentage, 3),
      offensiveEfficiency: this.roundToNthDigit(homeTeam.advancedStats.offensiveEfficiency - awayTeam.advancedStats.offensiveEfficiency, 1),
      offensiveRank: awayTeam.advancedStats.offensiveRank - homeTeam.advancedStats.offensiveRank,
      defensiveEfficiency: this.roundToNthDigit(homeTeam.advancedStats.defensiveEfficiency - awayTeam.advancedStats.defensiveEfficiency, 1),
      defensiveRank: awayTeam.advancedStats.defensiveRank - homeTeam.advancedStats.defensiveRank
    };
  }

  private roundToNthDigit(num: number, numOfDigits: number): number {
    return Math.round(num * Math.pow(10, numOfDigits)) / Math.pow(10, numOfDigits);
  }
}
