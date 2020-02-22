import { Injectable } from '@nestjs/common';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { BoxScoreResponse } from '../models/box-score-response';

@Injectable()
export class BoxScoresService {
  getBoxScoresOn(datePlayed: string): any {
    const dateFormatted = `${datePlayed.substring(4, 6)}/${datePlayed.substring(6)}/${datePlayed.substring(0, 4)}`;
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=1000&DateFrom=${dateFormatted}&DateTo=${dateFormatted}&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=2019-20&SeasonType=Regular+Season&Sorter=DATE`;
    const fileStoragePath = 'C:\\Users\\Mikej\\OneDrive\\Betting\\NBA';

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: BoxScoreResponse) => {
        fs.writeFileSync(`${fileStoragePath}\\box-scores-${response.parameters.DateTo.replace(/\//gi, '-')}.json`, JSON.stringify(response));
        console.log(`Successfully retrieved box scores from ${response.parameters.DateFrom}`);
        return response;
      })
      .catch(error => console.log(error));
  }

  async getRangeOfBoxScores(fromDate: string, upToDate: string): Promise<any> {
    try {
      let fromNumber = parseInt(fromDate);
      const toNumber = parseInt(upToDate);

      for (fromNumber; fromNumber <= toNumber; fromNumber++) {
        this.getBoxScoresOn(fromNumber.toString());
        await new Promise(r => setTimeout(r, 1000))
      }
      return `Successfully retrieved box scores from ${fromDate} to ${upToDate}`;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
