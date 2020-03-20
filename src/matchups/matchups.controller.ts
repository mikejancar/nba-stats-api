import { Controller } from '@nestjs/common';

import { MatchupsService } from './matchups.service';

@Controller('matchups')
export class MatchupsController {
  constructor(private matchupsService: MatchupsService) { }
}
