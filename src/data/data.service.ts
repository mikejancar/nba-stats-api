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
import { Team } from '../models/team';
import { teams as teamsJson } from './teams.json';

@Injectable()
export class DataService {
  private advancedTeamData: Map<string, Team[]> = new Map();
  private boxScoreData: Map<string, BoxScore[]> = new Map();

  private advancedTeamStatsPrefix = 'advanced-team-stats';
  private boxScoresPrefix = 'box-scores';

  constructor(private formattingService: FormattingService) { }

  getAdvancedTeamStats(asOf?: string): Team[] {
    const statDate = asOf || this.getLatestFileDate(this.advancedTeamStatsPrefix);

    if (!this.advancedTeamData.has(statDate)) {
      this.loadTeamData(statDate);
    }
    return this.advancedTeamData.get(statDate);
  }

  private loadTeamData(asOf: string): void {
    const dateFormatted = this.formattingService.formatDateForFileName(asOf);
    const teamStatsFilePath = `${Constants.dataDirectory}\\${this.advancedTeamStatsPrefix}-${dateFormatted}.json`
    const teamStatsData: AdvancedTeamsStatsResponse = JSON.parse(fs.readFileSync(teamStatsFilePath).toString());
    const teamList: any[][] = teamStatsData.resultSets[0].rowSet;

    const teams: Team[] = [];

    for (let index = 0; index < teamList.length; index++) {
      const teamStats: any[] = teamList[index];
      const teamName = teamStats[AdvancedTeamStatsColumns.TEAM_NAME];
      teams.push({
        teamId: teamStats[AdvancedTeamStatsColumns.TEAM_ID],
        teamName,
        abbreviation: teamsJson.find(team => team.teamName === teamName).abbreviation,
        advancedStats: {
          winningPercentage: teamStats[AdvancedTeamStatsColumns.W_PCT],
          offensiveEfficiency: teamStats[AdvancedTeamStatsColumns.OFF_RATING],
          offensiveRank: teamStats[AdvancedTeamStatsColumns.OFF_RATING_RANK],
          defensiveEfficiency: teamStats[AdvancedTeamStatsColumns.DEF_RATING],
          defensiveRank: teamStats[AdvancedTeamStatsColumns.DEF_RATING_RANK]
        }
      });
    }

    this.advancedTeamData.set(asOf, teams);
  }

  getEnhancedBoxScores(datePlayed: string): BoxScore[] {
    if (!this.boxScoreData.has(datePlayed)) {
      this.loadBoxScoreData(datePlayed);
    }
    return this.boxScoreData.get(datePlayed);
  }

  private loadBoxScoreData(datePlayed: string): void {
    const dateFormatted = this.formattingService.formatDateForFileName(datePlayed);
    const boxScoreFilePath = `${Constants.dataDirectory}\\${this.boxScoresPrefix}-${dateFormatted}.json`
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
      this.enhanceBoxScore(boxScore, datePlayed);
      this.determineWinningCharacteristics(boxScore);
      boxScores.push(boxScore);
    }

    this.boxScoreData.set(datePlayed, boxScores);
  }

  private createTeamFromBoxScore(row: any[]): BoxScoreTeam {
    return {
      teamId: row[BoxScoreColumns.TEAM_ID],
      teamName: row[BoxScoreColumns.TEAM_NAME],
      abbreviation: row[BoxScoreColumns.TEAM_ABBREVIATION],
      wonGame: row[BoxScoreColumns.WL] === 'W',
      advancedStats: {
        pointsScored: row[BoxScoreColumns.PTS]
      }
    };
  }

  private enhanceBoxScore(boxScore: BoxScore, datePlayed: string): void {
    const advancedTeamStats = this.getAdvancedTeamStats(datePlayed);

    this.loadAdvancedStats(boxScore.homeTeam, advancedTeamStats);
    this.loadAdvancedStats(boxScore.awayTeam, advancedTeamStats);
  }

  private loadAdvancedStats(team: BoxScoreTeam, advancedTeamStats: Team[]): void {
    const teamStats = advancedTeamStats.find(stats => stats.teamId === team.teamId);

    team.advancedStats = {
      pointsScored: team.advancedStats.pointsScored,
      ...teamStats.advancedStats
    };
  }

  private determineWinningCharacteristics(boxScore: BoxScore): void {
    const winningTeam = boxScore.homeTeam.wonGame ? boxScore.homeTeam : boxScore.awayTeam;
    const losingTeam = boxScore.homeTeam.wonGame ? boxScore.awayTeam : boxScore.homeTeam;

    boxScore.winningCharacteristics = {
      wasHomeTeam: boxScore.homeTeam.wonGame,
      moreOffensivelyEfficient: winningTeam.advancedStats.offensiveEfficiency > losingTeam.advancedStats.offensiveEfficiency,
      offensiveEfficiencyGap: this.formattingService.roundToNthDigit(winningTeam.advancedStats.offensiveEfficiency - losingTeam.advancedStats.offensiveEfficiency, 3),
      moreDefensivelyEfficient: winningTeam.advancedStats.defensiveEfficiency < losingTeam.advancedStats.defensiveEfficiency,
      defensiveEfficiencyGap: this.formattingService.roundToNthDigit(losingTeam.advancedStats.defensiveEfficiency - winningTeam.advancedStats.defensiveEfficiency, 3),
      hadHigherWinningPercentage: winningTeam.advancedStats.winningPercentage > losingTeam.advancedStats.winningPercentage,
      winningPercentageGap: this.formattingService.roundToNthDigit(winningTeam.advancedStats.winningPercentage - losingTeam.advancedStats.winningPercentage, 3),
      pointGap: winningTeam.advancedStats.pointsScored - losingTeam.advancedStats.pointsScored
    };
  }

  private getLatestFileDate(prefix: string): string {
    const files = fs.readdirSync(Constants.dataDirectory).filter(file => file.startsWith(prefix)).sort();
    return files[files.length - 1].replace(`${prefix}-`, '').replace('.json', '').replace(/-/g, '');
  }
}
