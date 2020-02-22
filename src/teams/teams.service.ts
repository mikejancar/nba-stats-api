import { Injectable } from '@nestjs/common';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { Team } from '../models/team.interface';

@Injectable()
export class TeamsService {

  getTeams(): Team[] {
    return JSON.parse(fs.readFileSync('C:\\Dev\\nba-stats-api\\dist\\assets\\data\\teams.json', 'utf-8'));
  }

  getAdvancedTeamStats(upToDate: string): any {
    const dateFormatted = `${upToDate.substring(4, 6)}/${upToDate.substring(6)}/${upToDate.substring(0, 4)}`;
    const url = `https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=10/22/2019&DateTo=${dateFormatted}&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2019-20&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;
    const fileStoragePath = 'C:\\Users\\Mikej\\OneDrive\\Betting\\NBA';

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: AdvancedTeamsStatsResponse) => {
        fs.writeFileSync(`${fileStoragePath}\\advanced-team-stats-${response.parameters.DateTo.replace(/\//gi, '-')}.json`, JSON.stringify(response));
        console.log(`Successfully retrieved advanced team stats from ${response.parameters.DateFrom} to ${response.parameters.DateTo}`);
        return response;
      })
      .catch(error => console.log(error));
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
