import { Injectable } from '@nestjs/common';

import { FormattingService } from '../formatting/formatting.service';

@Injectable()
export class MatchupsService {
  constructor(private formattingService: FormattingService) { }


}
