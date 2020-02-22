export interface BoxScoreTeam {
  teamId: number;
  abbreviation: string;
  teamName: string;
  pointsScored: number;
  wonGame: boolean;
  offensiveEfficieny?: number;
  offensiveRank?: number;
  defensiveEfficiency?: number;
  defensiveRank?: number;
}