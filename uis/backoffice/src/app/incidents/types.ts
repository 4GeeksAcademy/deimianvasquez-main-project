/** Tipos para el análisis y gestión de incidentes de HealthCore */

// ──────────────────────────────────────────────
//  Análisis CSV (v1)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
//  Incident CRUD (v2)
// ──────────────────────────────────────────────

export interface IncidentCreate {
  title: string;
  description: string;
  category: string;
  origin: string;
  branch: string;
}

export interface IncidentResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

// ── Constants (must match backend healthcore.constants) ──

export const INCIDENT_CATEGORIES: Record<string, string> = {
  clinical_equipment: "Clinical Equipment",
  it_system: "IT System",
  billing_error: "Billing Error",
  compliance_breach: "Compliance Breach",
  patient_experience: "Patient Experience",
  staff_issue: "Staff Issue",
  facility_issue: "Facility Issue",
  referral_issue: "Referral Issue",
  other: "Other",
};

export const INCIDENT_ORIGINS: Record<string, string> = {
  customer: "Customer",
  branch: "Branch",
  internal: "Internal",
};

export const INCIDENT_BRANCHES: Record<string, string> = {
  central: "Central — Austin Main Clinic",
  austin_north: "Austin — North",
  dallas_uptown: "Dallas Uptown",
  houston_med_center: "Houston Medical Center",
  san_antonio_west: "San Antonio West",
  miami_brickell: "Miami Brickell",
  miami_doral: "Miami Doral",
  orlando_east: "Orlando East",
  tampa_bay: "Tampa Bay",
  atlanta_midtown: "Atlanta Midtown",
  savannah: "Savannah",
  london_city: "London City",
  london_west: "London West End",
  manchester_central: "Manchester Central",
};

export const ALL_CATEGORIES = Object.keys(INCIDENT_CATEGORIES);
export const ALL_ORIGINS = Object.keys(INCIDENT_ORIGINS);
export const ALL_BRANCHES = Object.keys(INCIDENT_BRANCHES);

// ──────────────────────────────────────────────
//  Summary (v2)
// ──────────────────────────────────────────────

export interface IncidentSummary {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
}