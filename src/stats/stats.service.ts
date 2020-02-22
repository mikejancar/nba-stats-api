import { Injectable } from '@nestjs/common';
import fs from 'fs';

import { Constants } from '../app.constants';
import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStatsColumns } from '../models/advanced-team-stats-columns.enum';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { BoxScore } from '../models/box-score';
import { BoxScoreColumns } from '../models/box-score-columns.enum';
import { BoxScoreResponse } from '../models/box-score-response';
import { BoxScoreTeam } from '../models/box-score-team';

@Injectable()
export class StatsService {
  constructor(private formattingService: FormattingService) { }

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
        homeTeam: rowOne[BoxScoreColumns.MATCHUP].includes('@') ? teamOne : teamTwo,
        awayTeam: rowOne[BoxScoreColumns.MATCHUP].includes('@') ? teamTwo : teamOne,
        datePlayed: rowOne[BoxScoreColumns.GAME_DATE]
      };
      this.enhanceBoxScore(boxScore);
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

    this.loadEfficiencyStats(boxScore.homeTeam, rowSet);
    this.loadEfficiencyStats(boxScore.awayTeam, rowSet);
  }

  loadEfficiencyStats(team: BoxScoreTeam, rowSet: any[][]): void {
    const teamData: any[] = rowSet.find((row: any[]) => row[AdvancedTeamStatsColumns.TEAM_ID] === team.teamId);
    if (!teamData) {
      const errorMessage = `Failed to find an advanced team stat record for the ${team.teamName}`;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }

    team.offensiveEfficieny = teamData[AdvancedTeamStatsColumns.OFF_RATING];
    team.offensiveRank = teamData[AdvancedTeamStatsColumns.OFF_RATING_RANK];
    team.defensiveEfficiency = teamData[AdvancedTeamStatsColumns.DEF_RATING];
    team.defensiveRank = teamData[AdvancedTeamStatsColumns.DEF_RATING_RANK];
  }
}
