import { HttpModule, Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { TeamsController } from './teams/teams.controller';
import { TeamsService } from './teams/teams.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController, TeamsController],
  providers: [TeamsService],
})
export class AppModule { }
