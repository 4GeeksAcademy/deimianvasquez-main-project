export interface Supplier {
  id: number;
  name: string;
  country: string;
  categories: string[];
  monthly_rate: number;
  currency: string;
  status: "active" | "suspended";
  compliance_agreement: string | null;
  contract_renewal_date: string | null;
  contact_email: string | null;
  notes: string | null;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  medical_supplies: "Insumos médicos",
  laboratory_services: "Servicios de laboratorio",
  pharmaceutical: "Farmacéutica",
  clinical_software: "Software clínico",
  it_infrastructure: "Infraestructura TI",
  hr_and_payroll_software: "RRHH y nómina",
  cleaning_and_facilities: "Limpieza e instalaciones",
  patient_communication: "Comunicación con pacientes",
  billing_and_coding_software: "Facturación y codificación",
  training_platforms: "Plataformas de formación",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);