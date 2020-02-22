import { Test, TestingModule } from '@nestjs/testing';
import { FormattingService } from './formatting.service';

describe('FormattingService', () => {
  let service: FormattingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormattingService],
    }).compile();

    service = module.get<FormattingService>(FormattingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
