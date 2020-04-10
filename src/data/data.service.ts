import { Injectable } from '@nestjs/common';

import { DateFormats, FormattingService } from '../formatting/formatting.service';
import {
  AdvancedTeamsStatsResponse, AdvancedTeamStatsColumns, BoxScore, BoxScoreColumns, BoxScoreResponse,
  BoxScoreTeam, DataSources, Team
} from '../models';
import { NetworkService } from '../network/network.service';
import { StatsService } from '../stats/stats.service';
import { teams as teamsJson } from './teams.json';

@Injectable()
export class DataService {
  private advancedTeamData: Map<string, Team[]> = new Map();
  private boxScoreData: Map<string, BoxScore[]> = new Map();
  private latestAdvancedDate = '';
  private latestBoxScoreDate = '';

  constructor(private formattingService: FormattingService, private networkService: NetworkService, private statsService: StatsService) {
    this.preloadData();
  }

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
    const statDate = await this.determineLatestValidDate(DataSources.AdvancedTeamStats, asOf);

    if (!this.advancedTeamData.has(statDate)) {
      await this.loadAdvancedTeamStatData(statDate);
    }
    return Promise.resolve(this.advancedTeamData.get(statDate));
  }

  private async loadAdvancedTeamStatData(asOf: string): Promise<void> {
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
    const teamStatsData = await this.networkService.getObjectFromBucket(DataSources.AdvancedTeamStats, dateFormatted);
    const teamStatsResponse = JSON.parse(teamStatsData.Body.toString());
    return Promise.resolve(teamStatsResponse);
  }

  async getEnhancedBoxScores(datePlayed: string): Promise<BoxScore[]> {
    const statDate = await this.determineLatestValidDate(DataSources.BoxScores, datePlayed);

    if (!this.boxScoreData.has(statDate)) {
      await this.loadBoxScoreData(statDate);
    }
    return Promise.resolve(this.boxScoreData.get(statDate));
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
    const boxScoreData = await this.networkService.getObjectFromBucket(DataSources.BoxScores, dateFormatted);
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

  private async determineLatestValidDate(source: DataSources, givenDate?: string): Promise<string> {
    let latestDate;
    if (source === DataSources.AdvancedTeamStats) {
      if (!this.latestAdvancedDate) {
        this.latestAdvancedDate = await this.networkService.getNewestBucketObjectDate(source);
      }
      latestDate = this.latestAdvancedDate;
    } else {
      if (!this.latestBoxScoreDate) {
        this.latestBoxScoreDate = await this.networkService.getNewestBucketObjectDate(source);
      }
      latestDate = this.latestBoxScoreDate;
    }

    const givenDateIsAvailable = !!givenDate && parseInt(givenDate) <= parseInt(latestDate);
    return Promise.resolve(givenDateIsAvailable ? givenDate : latestDate);
  }

  async preloadData(): Promise<void> {
    const yesterday = this.formattingService.addDaysToDate(new Date(), -1);
    const dateFormatted = this.formattingService.formatDate(yesterday, DateFormats.Numeric);

    await this.loadStatisticalData(DataSources.AdvancedTeamStats, dateFormatted, 30);
    this.loadStatisticalData(DataSources.BoxScores, dateFormatted, 30);
    return Promise.resolve();
  }

  private async loadStatisticalData(source: DataSources, scheduleDate: string, statRangeInDays: number): Promise<void> {
    console.log(`Loading ${source}...0%`);
    const latestValidDate = await this.determineLatestValidDate(source, scheduleDate);
    let lastDate = this.formattingService.parseDate(latestValidDate);

    for (let i = 0; i < statRangeInDays; i++) {
      const dateString = this.formattingService.formatDate(lastDate, DateFormats.Numeric);
      source === DataSources.AdvancedTeamStats ? await this.getAdvancedTeamStats(dateString) : await this.getEnhancedBoxScores(dateString);

      const progress = this.formattingService.roundToNthDigit(((i + 1) / statRangeInDays) * 100, 0);
      console.log(`Loading ${source}...${progress}%`);

      lastDate = this.formattingService.addDaysToDate(lastDate, -1);
    }
    return Promise.resolve();
  }
}
