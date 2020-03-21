import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { Matchup } from '../models/matchup';
import { MatchupColumns } from '../models/matchup-columns.enum';
import { MatchupResponse } from '../models/matchup-response';
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
      matchups.push({
        gameId: matchupData[MatchupColumns.GAME_ID],
        homeTeam: this.teamsService.getTeam(matchupData[MatchupColumns.HOME_TEAM_ID]),
        awayTeam: this.teamsService.getTeam(matchupData[MatchupColumns.VISITOR_TEAM_ID])
      });
    }
    return matchups;
  }
}
