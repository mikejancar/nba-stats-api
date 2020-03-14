import { Injectable } from '@nestjs/common';

import { FormattingService } from '../formatting/formatting.service';

@Injectable()
export class StatsService {
  constructor(private formattingService: FormattingService) { }
}
