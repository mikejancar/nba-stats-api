import { Test, TestingModule } from '@nestjs/testing';
import { BoxScoresController } from './box-scores.controller';

describe('BoxScores Controller', () => {
  let controller: BoxScoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoxScoresController],
    }).compile();

    controller = module.get<BoxScoresController>(BoxScoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
