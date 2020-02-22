import { Test, TestingModule } from '@nestjs/testing';
import { BoxScoresService } from './box-scores.service';

describe('BoxScoresService', () => {
  let service: BoxScoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoxScoresService],
    }).compile();

    service = module.get<BoxScoresService>(BoxScoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
