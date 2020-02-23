export interface BoxScoreTeam {
  teamId: number;
  abbreviation: string;
  teamName: string;
  pointsScored: number;
  wonGame: boolean;
  winningPercentage?: number;
  offensiveEfficiency?: number;
  offensiveRank?: number;
  defensiveEfficiency?: number;
  defensiveRank?: number;
}