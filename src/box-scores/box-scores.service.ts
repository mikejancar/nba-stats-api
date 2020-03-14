import { Injectable } from '@nestjs/common';
import { addDays, format, parseISO } from 'date-fns';
import fs from 'fs';
import fetch from 'node-fetch';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStatsColumns } from '../models/advanced-team-stats-columns.enum';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { BoxScore } from '../models/box-score';
import { BoxScoreColumns } from '../models/box-score-columns.enum';
import { BoxScoreResponse } from '../models/box-score-response';
import { BoxScoreSummary } from '../models/box-score-summary';
import { BoxScoreTeam } from '../models/box-score-team';

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

  buildBoxScoreSummary(endDate: string, daysOfHistory: number, excludeBoxScores = true): BoxScoreSummary {
    const lastDate = parseISO(endDate);
    let firstDate = addDays(lastDate, -daysOfHistory);

    const boxScoreSummary: BoxScoreSummary = {
      fromDate: firstDate,
      toDate: lastDate,
      boxScores: []
    };

    while (firstDate <= lastDate) {
      const dateFormatted = format(firstDate, 'yyyyMMdd');
      boxScoreSummary.boxScores.push(...this.getEnhancedBoxScores(dateFormatted));
      firstDate = addDays(firstDate, 1);
    }

    this.summarizeWinningCharacteristics(boxScoreSummary);
    if (excludeBoxScores) {
      boxScoreSummary.boxScores = [];
    }
    return boxScoreSummary;
  }

  summarizeWinningCharacteristics(boxScoreSummary: BoxScoreSummary): void {
    const totalBoxScores = boxScoreSummary.boxScores.length;
    boxScoreSummary.winningCharacteristics = {
      wasHomeTeam: boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.wasHomeTeam).length / totalBoxScores,
      moreOffensivelyEfficient: boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreOffensivelyEfficient).length / totalBoxScores,
      moreDefensivelyEfficient: boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.moreDefensivelyEfficient).length / totalBoxScores,
      hadHigherWinningPercentage: boxScoreSummary.boxScores.filter((boxScore: BoxScore) => boxScore.winningCharacteristics.hadHigherWinningPercentage).length / totalBoxScores,
      averagePointGap: boxScoreSummary.boxScores.map(box => box.winningCharacteristics.pointGap).reduce((accum, next) => accum + next) / totalBoxScores
    };
  }

  getEnhancedBoxScores(datePlayed: string): BoxScore[] {
    const dateFormatted = this.formattingService.formatDateForFileName(datePlayed);
    const boxScoreFilePath = `${Constants.dataDirectory}\\box-scores-${dateFormatted}.json`
    const boxScoreData: BoxScoreResponse = JSON.parse(fs.readFileSync(boxScoreFilePath).toString());

    const boxScores: BoxScore[] = [];

    for (let i = 0; i < boxScoreData.resultSets[0].rowSet.length; i += 2) {
      const rowOne: any[] = boxScoreData.resultSets[0].rowSet[i];
      const rowTwo: any[] = boxScoreData.resultSets[0].rowSet[i + 1];

      const teamOne: BoxScoreTeam = this.createTeamFromBoxScore(rowOne);
      const teamTwo: BoxScoreTeam = this.createTeamFromBoxScore(rowTwo);

      const boxScore: BoxScore = {
        homeTeam: rowOne[BoxScoreColumns.MATCHUP].includes('@') ? teamTwo : teamOne,
        awayTeam: rowOne[BoxScoreColumns.MATCHUP].includes('@') ? teamOne : teamTwo,
        datePlayed: rowOne[BoxScoreColumns.GAME_DATE]
      };
      this.enhanceBoxScore(boxScore);
      this.determineWinningCharacteristics(boxScore);
      boxScores.push(boxScore);
    }
    return boxScores;
  }

  createTeamFromBoxScore(row: any[]): BoxScoreTeam {
    return {
      teamId: row[BoxScoreColumns.TEAM_ID],
      teamName: row[BoxScoreColumns.TEAM_NAME],
      abbreviation: row[BoxScoreColumns.TEAM_ABBREVIATION],
      pointsScored: row[BoxScoreColumns.PTS],
      wonGame: row[BoxScoreColumns.WL] === 'W'
    };
  }

  enhanceBoxScore(boxScore: BoxScore): void {
    const filePath = `${Constants.dataDirectory}\\advanced-team-stats-${boxScore.datePlayed}.json`;
    const advancedStats: AdvancedTeamsStatsResponse = JSON.parse(fs.readFileSync(filePath).toString());
    const rowSet = advancedStats.resultSets[0].rowSet;

    this.loadAdvancedStats(boxScore.homeTeam, rowSet);
    this.loadAdvancedStats(boxScore.awayTeam, rowSet);
  }

  loadAdvancedStats(team: BoxScoreTeam, rowSet: any[][]): void {
    const teamData: any[] = rowSet.find((row: any[]) => row[AdvancedTeamStatsColumns.TEAM_ID] === team.teamId);
    if (!teamData) {
      const errorMessage = `Failed to find an advanced team stat record for the ${team.teamName}`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }

    team.winningPercentage = teamData[AdvancedTeamStatsColumns.W_PCT];
    team.offensiveEfficiency = teamData[AdvancedTeamStatsColumns.OFF_RATING];
    team.offensiveRank = teamData[AdvancedTeamStatsColumns.OFF_RATING_RANK];
    team.defensiveEfficiency = teamData[AdvancedTeamStatsColumns.DEF_RATING];
    team.defensiveRank = teamData[AdvancedTeamStatsColumns.DEF_RATING_RANK];
  }

  determineWinningCharacteristics(boxScore: BoxScore): void {
    const winningTeam = boxScore.homeTeam.wonGame ? boxScore.homeTeam : boxScore.awayTeam;
    const losingTeam = boxScore.homeTeam.wonGame ? boxScore.awayTeam : boxScore.homeTeam;

    boxScore.winningCharacteristics = {
      wasHomeTeam: boxScore.homeTeam.wonGame,
      moreOffensivelyEfficient: winningTeam.offensiveEfficiency > losingTeam.offensiveEfficiency,
      offensiveEfficiencyGap: winningTeam.offensiveEfficiency - losingTeam.offensiveEfficiency,
      moreDefensivelyEfficient: winningTeam.defensiveEfficiency < losingTeam.defensiveEfficiency,
      defensiveEfficiencyGap: losingTeam.defensiveEfficiency - winningTeam.defensiveEfficiency,
      hadHigherWinningPercentage: winningTeam.winningPercentage > losingTeam.winningPercentage,
      winningPercentageGap: winningTeam.winningPercentage - losingTeam.winningPercentage,
      pointGap: winningTeam.pointsScored - losingTeam.pointsScored
    };
  }
}
