import { Injectable } from '@nestjs/common';

import { FormattingService } from '../formatting/formatting.service';
import { AdvancedTeamStatsColumns } from '../models/advanced-team-stats-columns.enum';
import { AdvancedTeamsStatsResponse } from '../models/advanced-team-stats-response';
import { BoxScore } from '../models/box-score';
import { BoxScoreColumns } from '../models/box-score-columns.enum';
import { BoxScoreResponse } from '../models/box-score-response';
import { BoxScoreTeam } from '../models/box-score-team';
import { Team } from '../models/team';
import { AvailableBuckets, NetworkService } from '../network/network.service';
import { StatsService } from '../stats/stats.service';
import { teams as teamsJson } from './teams.json';

@Injectable()
export class DataService {
  private advancedTeamData: Map<string, Team[]> = new Map();
  private boxScoreData: Map<string, BoxScore[]> = new Map();
  private latestAdvancedDate = '';

  constructor(private formattingService: FormattingService, private networkService: NetworkService, private statsService: StatsService) {}

  getTeam(teamId: number): Team {
    const team: any = teamsJson.find(team => team.teamId === teamId.toString());
    if (team) {
      return {
        teamId,
        teamName: team.fullName,
        abbreviation: team.tricode
      };
    }
    throw new Error(`Invalid team ID specified: ${teamId}`);
  }

  async getAdvancedTeamStats(asOf?: string): Promise<Team[]> {
    if (!this.latestAdvancedDate) {
      this.latestAdvancedDate = await this.networkService.getNewestBucketObjectDate(AvailableBuckets.AdvancedTeamStats);
    }
    const asOfIsValid = !!asOf && parseInt(asOf) <= parseInt(this.latestAdvancedDate);
    const statDate = asOfIsValid ? asOf : this.latestAdvancedDate;

    if (!this.advancedTeamData.has(statDate)) {
      await this.loadAdvancedTeamStatData(statDate);
    }
    return Promise.resolve(this.advancedTeamData.get(statDate));
  }

  async loadAdvancedTeamStatData(asOf: string): Promise<void> {
    const dateFormatted = this.formattingService.formatDateForFileName(asOf);
    const teamStatsData: AdvancedTeamsStatsResponse = await this.getAdvancedTeamStatData(dateFormatted);
    const teamList: any[][] = teamStatsData.resultSets[0].rowSet;

    const teams: Team[] = [];

    for (let index = 0; index < teamList.length; index++) {
      const teamStats: any[] = teamList[index];
      const teamName = teamStats[AdvancedTeamStatsColumns.TEAM_NAME];
      const teamId = teamStats[AdvancedTeamStatsColumns.TEAM_ID];
      teams.push({
        teamId,
        teamName,
        abbreviation: teamsJson.find(team => team.teamId === teamId.toString()).tricode,
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
    return Promise.resolve();
  }

  private async getAdvancedTeamStatData(dateFormatted: string): Promise<AdvancedTeamsStatsResponse> {
    const teamStatsData = await this.networkService.getObjectFromBucket(AvailableBuckets.AdvancedTeamStats, dateFormatted);
    const teamStatsResponse = JSON.parse(teamStatsData.Body.toString());
    return Promise.resolve(teamStatsResponse);
  }

  async getEnhancedBoxScores(datePlayed: string): Promise<BoxScore[]> {
    if (!this.boxScoreData.has(datePlayed)) {
      await this.loadBoxScoreData(datePlayed);
    }
    return Promise.resolve(this.boxScoreData.get(datePlayed));
  }

  private async loadBoxScoreData(datePlayed: string): Promise<void> {
    const dateFormatted = this.formattingService.formatDateForFileName(datePlayed);
    const boxScoreData: BoxScoreResponse = await this.getBoxScoreData(dateFormatted);

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
      await this.enhanceBoxScore(boxScore, datePlayed);
      this.statsService.determineWinningCharacteristics(boxScore);
      boxScores.push(boxScore);
    }

    this.boxScoreData.set(datePlayed, boxScores);
  }

  private async getBoxScoreData(dateFormatted: string): Promise<BoxScoreResponse> {
    const boxScoreData = await this.networkService.getObjectFromBucket(AvailableBuckets.BoxScores, dateFormatted);
    const boxScoreResponse = JSON.parse(boxScoreData.Body.toString());
    return Promise.resolve(boxScoreResponse);
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

  private async enhanceBoxScore(boxScore: BoxScore, datePlayed: string): Promise<void> {
    const advancedTeamStats = await this.getAdvancedTeamStats(datePlayed);

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
}
