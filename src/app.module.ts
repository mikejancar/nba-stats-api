import { HttpModule, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { BoxScoresController } from './box-scores/box-scores.controller';
import { BoxScoresService } from './box-scores/box-scores.service';
import { DataService } from './data/data.service';
import { FormattingService } from './formatting/formatting.service';
import { MatchupsController } from './matchups/matchups.controller';
import { MatchupsService } from './matchups/matchups.service';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController, TeamsController, MatchupsController, BoxScoresController],
  providers: [TeamsService, MatchupsService, BoxScoresService, FormattingService, DataService],
})
export class AppModule { }
