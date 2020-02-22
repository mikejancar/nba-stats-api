import { HttpModule, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { BoxScoresController } from './box-scores/box-scores.controller';
import { BoxScoresService } from './box-scores/box-scores.service';
import { StatsController } from './stats/stats.controller';
import { StatsService } from './stats/stats.service';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController, TeamsController, StatsController, BoxScoresController],
  providers: [TeamsService, StatsService, BoxScoresService],
})
export class AppModule { }
