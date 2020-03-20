import { Test, TestingModule } from '@nestjs/testing';

import { MatchupsController } from './matchups.controller';

describe('Matchups Controller', () => {
  let controller: MatchupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchupsController],
    }).compile();

    controller = module.get<MatchupsController>(MatchupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
