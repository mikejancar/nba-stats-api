import { Injectable } from '@nestjs/common';
import fs from 'fs';
import fetch from 'node-fetch';
import { AdvancedTeamsStatsResponse } from 'src/models/advanced-team-stats-response';

import { Team } from '../models/team.interface';

@Injectable()
export class TeamsService {

  standardHeaders = {
    'Host': 'stats.nba.com',
    'Connection': 'keep-alive',
    'Accept': 'application/json, text/plain, */*',
    'x-nba-stats-token': 'true',
    'X-NewRelic-ID': 'VQECWF5UChAHUlNTBwgBVw==',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
    'x-nba-stats-origin': 'stats',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Referer': 'https://stats.nba.com/teams/advanced/?sort=DEF_RATING&dir=-1&Season=2019-20&SeasonType=Regular%20Season&DateFrom=10%2F22%2F2019&DateTo=10%2F22%2F2019',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  getTeams(): Team[] {
    return JSON.parse(fs.readFileSync('C:\\Dev\\nba-stats-api\\dist\\assets\\data\\teams.json', 'utf-8'));
  }

  getAdvancedTeamStats(upToDate: string): any {
    const dateFormatted = `${upToDate.substring(0, 2)}/${upToDate.substring(2, 4)}/${upToDate.substring(4)}`;
    const url = `https://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=10/22/2019&DateTo=${dateFormatted}&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Advanced&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2019-20&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision=`;

    return fetch(url, { method: 'GET', headers: this.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: AdvancedTeamsStatsResponse) => {
        console.log(`Successfully retrieved advanced team stats from ${response.parameters.DateFrom} to ${response.parameters.DateTo}`);
        return response;
      })
      .catch(error => console.log(error));
  }
}
