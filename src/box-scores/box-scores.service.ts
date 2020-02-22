import { Injectable } from '@nestjs/common';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { BoxScoreResponse } from '../models/box-score-response';

@Injectable()
export class BoxScoresService {
  constructor(private formattingService: FormattingService) { }

  getBoxScoresOn(datePlayed: string): any {
    const dateFormatted = this.formattingService.formatDateForStatsCall(datePlayed);
    const url = `https://stats.nba.com/stats/leaguegamelog?Counter=1000&DateFrom=${dateFormatted}&DateTo=${dateFormatted}&Direction=DESC&LeagueID=00&PlayerOrTeam=T&Season=2019-20&SeasonType=Regular+Season&Sorter=DATE`;

    return fetch(url, { method: 'GET', headers: Constants.standardHeaders })
      .then(rawResponse => rawResponse.json())
      .then((response: BoxScoreResponse) => {
        fs.writeFileSync(`${Constants.dataDirectory}\\box-scores-${this.formattingService.formatDateForFileName(datePlayed)}.json`, JSON.stringify(response));
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
