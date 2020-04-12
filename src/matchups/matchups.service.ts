import { Injectable, NotFoundException } from '@nestjs/common';

import { BoxScoresService } from '../box-scores/box-scores.service';
import { DataService } from '../data/data.service';
import { Matchup } from '../models';
import { StatsService } from '../stats/stats.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class MatchupsService {
  constructor(
    private teamsService: TeamsService,
    private statsService: StatsService,
    private boxScoresService: BoxScoresService,
    private dataService: DataService
  ) {}

  async getAdvancedMatchup(scheduleDate: string, gameId: string, statRangeInDays = 30): Promise<Matchup> {
    const matchups: Matchup[] = await this.dataService.getMatchups(scheduleDate);
    const matchup: Matchup = matchups.find(matchup => matchup.gameId === gameId);

    if (!matchup) {
      throw new NotFoundException(`Matchup ${gameId} from ${scheduleDate} could not be found`);
    }

    matchup.homeTeam = await this.teamsService.getAdvancedTeam(matchup.homeTeam.teamId, scheduleDate);
    matchup.awayTeam = await this.teamsService.getAdvancedTeam(matchup.awayTeam.teamId, scheduleDate);

    this.statsService.computeStatGaps(matchup.homeTeam, matchup.awayTeam);
    await this.boxScoresService.getBoxScorePredictors(matchup, scheduleDate, statRangeInDays);

    return Promise.resolve({ gameId, homeTeam: matchup.homeTeam, awayTeam: matchup.awayTeam });
  }
}
