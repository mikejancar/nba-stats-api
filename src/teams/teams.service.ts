import { Injectable } from '@nestjs/common';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { DataService } from '../data/data.service';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { Team } from '../models/team';

@Injectable()
export class TeamsService {
  constructor(private dataService: DataService, private formattingService: FormattingService) { }

  async getTeams(asOf?: string): Promise<Team[]> {
    return await this.dataService.getAdvancedTeamStats(asOf);
  }

  async getTeam(teamId: number, asOf?: string): Promise<Team> {
    const allTeams: Team[] = await this.dataService.getAdvancedTeamStats(asOf);
    return allTeams.find(team => team.teamId === teamId);
  }

  getAdvancedTeamStats(upToDate: string): any {
    const dateFormatted = this.formattingService.formatDateForStatsCall(upToDate);
    const url = `https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=10/22/2019&DateTo=${dateFormatted}&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2019-20&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: AdvancedTeamsStatsResponse) => {
        fs.writeFileSync(`${Constants.dataDirectory}\\advanced-team-stats-${this.formattingService.formatDateForFileName(upToDate)}.json`, JSON.stringify(response));
        console.log(`Successfully retrieved advanced team stats from ${response.parameters.DateFrom} to ${response.parameters.DateTo}`);
        return response;
      })
      .catch(error => console.error(`Failed to retrieve advanced team stats up to ${dateFormatted}`, error));
  }

  async getRangeOfAdvancedTeamStats(fromDate: string, upToDate: string): Promise<any> {
    try {
      let fromNumber = parseInt(fromDate);
      const toNumber = parseInt(upToDate);

      for (fromNumber; fromNumber <= toNumber; fromNumber++) {
        this.getAdvancedTeamStats(fromNumber.toString());
        await new Promise(r => setTimeout(r, 1000))
      }
      return `Successfully retrieved advanced team stats from ${fromDate} to ${upToDate}`;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
