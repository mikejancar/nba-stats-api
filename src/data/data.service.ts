import { Injectable } from '@nestjs/common';

import { DateFormats, FormattingService } from '../formatting/formatting.service';
import {
  AdvancedTeamsStatsResponse, AdvancedTeamStatsColumns, BoxScore, BoxScoreColumns, BoxScoreResponse,
  BoxScoreTeam, DataSources, Matchup, MatchupColumns, MatchupResponse, MatchupTeam, Team
} from '../models';
import { NetworkService } from '../network/network.service';
import { StatsService } from '../stats/stats.service';
import { teams as teamsJson } from './teams.json';

@Injectable()
export class DataService {
  private advancedTeamData: Map<string, Team[]> = new Map();
  private boxScoreData: Map<string, BoxScore[]> = new Map();
  private matchupData: Map<string, Matchup[]> = new Map();
  private latestAdvancedDate = '';
  private latestBoxScoreDate = '';

  constructor(private formattingService: FormattingService, private networkService: NetworkService, private statsService: StatsService) {
    this.preloadData();
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

  async getAdvancedTeamStats(asOf?: string): Promise<Team[]> {
    const statDate = await this.determineLatestValidDate(DataSources.AdvancedTeamStats, asOf);

    if (!this.advancedTeamData.has(statDate)) {
      const dateFormatted = this.formattingService.formatDateForFileName(statDate);
      const teamStatsData: AdvancedTeamsStatsResponse = await this.getAdvancedTeamStatData(dateFormatted);

      if (teamStatsData.errorMessage) {
        return Promise.resolve([]);
      }
      await this.loadAdvancedTeamStatData(statDate, teamStatsData);
    }
    return Promise.resolve(this.advancedTeamData.get(statDate));
  }

  private async loadAdvancedTeamStatData(asOf: string, teamStatsData: AdvancedTeamsStatsResponse): Promise<void> {
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
    try {
      const teamStatsData = await this.networkService.getObjectFromBucket(DataSources.AdvancedTeamStats, dateFormatted);
      const teamStatsResponse = JSON.parse(teamStatsData.Body.toString());
      return Promise.resolve(teamStatsResponse);
    } catch (error) {
      return Promise.resolve({ resource: DataSources.AdvancedTeamStats, parameters: null, resultSets: [], errorMessage: error.message });
    }
  }

  async getEnhancedBoxScores(datePlayed: string): Promise<BoxScore[]> {
    const statDate = await this.determineLatestValidDate(DataSources.BoxScores, datePlayed);

    if (!this.boxScoreData.has(statDate)) {
      const dateFormatted = this.formattingService.formatDateForFileName(statDate);
      const boxScoreData: BoxScoreResponse = await this.getBoxScoreData(dateFormatted);

      if (boxScoreData.errorMessage) {
        console.log(`No box score data found for ${datePlayed}`);
        return Promise.resolve([]);
      }
      await this.loadBoxScoreData(statDate, boxScoreData);
    }
    return Promise.resolve(this.boxScoreData.get(statDate));
  }

  private async loadBoxScoreData(datePlayed: string, boxScoreData: BoxScoreResponse): Promise<void> {
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
    try {
      const boxScoreData = await this.networkService.getObjectFromBucket(DataSources.BoxScores, dateFormatted);
      const boxScoreResponse = JSON.parse(boxScoreData.Body.toString());
      return Promise.resolve(boxScoreResponse);
    } catch (error) {
      return Promise.resolve({ resource: DataSources.BoxScores, parameters: null, resultSets: [], errorMessage: error.message });
    }
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

  async determineLatestValidDate(source: DataSources, givenDate?: string): Promise<string> {
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

  async getMatchups(scheduleDate: string): Promise<Matchup[]> {
    if (!this.matchupData.has(scheduleDate)) {
      const dateFormatted = this.formattingService.formatDateForFileName(scheduleDate);
      const matchupsData: MatchupResponse = await this.getMatchupData(dateFormatted);

      if (matchupsData.errorMessage) {
        return Promise.resolve([]);
      }

      const matchups = await this.createMatchups(matchupsData);
      this.matchupData.set(scheduleDate, matchups);
    }
    return Promise.resolve(this.matchupData.get(scheduleDate));
  }

  private async getMatchupData(scheduleDate: string): Promise<MatchupResponse> {
    try {
      const matchupsData = await this.networkService.getObjectFromBucket(DataSources.Matchups, scheduleDate);
      const matchupResponse = JSON.parse(matchupsData.Body.toString());
      return Promise.resolve(matchupResponse);
    } catch (error) {
      return Promise.resolve({ resource: DataSources.Matchups, parameters: null, resultSets: [], errorMessage: error.message });
    }
  }

  private async createMatchups(response: MatchupResponse): Promise<Matchup[]> {
    const matchups: Matchup[] = [];
    for (let i = 0; i < response.resultSets[0].rowSet.length; i++) {
      const matchupData = response.resultSets[0].rowSet[i];
      const matchup: Matchup = this.createMatchup(matchupData);
      matchups.push(matchup);
    }
    return matchups;
  }

  private createMatchup(matchupData: any[]): Matchup {
    const homeTeam: MatchupTeam = this.getTeam(matchupData[MatchupColumns.HOME_TEAM_ID]);
    const awayTeam: MatchupTeam = this.getTeam(matchupData[MatchupColumns.VISITOR_TEAM_ID]);

    return {
      gameId: matchupData[MatchupColumns.GAME_ID],
      homeTeam,
      awayTeam
    };
  }

  private getTeam(teamId: number): Team {
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
}
