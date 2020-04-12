import { HttpModule, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { BoxScoresService } from './box-scores/box-scores.service';
import { DataService } from './data/data.service';
import { FormattingService } from './formatting/formatting.service';
import { MatchupsController } from './matchups/matchups.controller';
import { MatchupsService } from './matchups/matchups.service';
import { NetworkService } from './network/network.service';
import { StatsService } from './stats/stats.service';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController, TeamsController, MatchupsController],
  providers: [NetworkService, TeamsService, MatchupsService, BoxScoresService, FormattingService, DataService, StatsService]
})
export class AppModule {}
