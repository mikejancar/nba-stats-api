import { Injectable } from '@nestjs/common';

import { DataService } from '../data/data.service';
import { Team } from '../models';

@Injectable()
export class TeamsService {
  constructor(private dataService: DataService) {}

  async getAdvancedTeams(asOf?: string): Promise<Team[]> {
    return await this.dataService.getAdvancedTeamStats(asOf);
  }

  async getAdvancedTeam(teamId: number, asOf?: string): Promise<Team> {
    const allTeams: Team[] = await this.dataService.getAdvancedTeamStats(asOf);
    return allTeams.find(team => team.teamId === teamId);
  }
}
