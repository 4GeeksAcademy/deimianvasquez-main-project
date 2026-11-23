/** Tipos para el análisis de incidentes de HealthCore */

export interface CategoryBreakdown {
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  count: number;
  percentage: number;
}

export interface CountryBreakdown {
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  count: number;
  label: string;
}

export interface SatisfactionIndex {
  scored_cases: number;
  total_closed: number;
  average_score: number;
  distribution: Record<string, ScoreDistribution>;
}

export interface AnalysisResult {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  invalid_breakdown: Record<string, number>;
  by_category: Record<string, CategoryBreakdown>;
  by_status: Record<string, StatusBreakdown>;
  by_country: Record<string, CountryBreakdown>;
  satisfaction: SatisfactionIndex;
}