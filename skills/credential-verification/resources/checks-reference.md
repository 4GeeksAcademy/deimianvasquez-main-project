# Credential Verification — Reference Card

> Resumen rápido de los 5 chequeos, sus criterios y valores de referencia de HealthCore.

## Chequeos

| ID | Chequeo | Pass | Warning | Fail |
|---|---|---|---|---|
| CA-1 | Licencia vigente | `expiry >= today` | En período de gracia | Vencida |
| CA-2 | Rol soportado | Rol válido | — | No soportado |
| CA-3 | CME completo | >= 80 % | 50–79 % | < 50 % |
| CA-4 | Jurisdicción | EE. UU.: state code; UK: GMC ID | — | No coincide |
| CA-5 | Tiempo contratación | <= 47 días | > 47 días | — |

## Referencias de HealthCore

- **Promedio contratación clínica:** 47 días (BRIEFING.md — Personas y Fuerza Laboral).
- **Tasa de no-shows:** 22 % (BRIEFING.md — Experiencia del Paciente).
- **Personal total:** ~200 empleados en 12 sedes.
- **Países:** EE. UU. (9 clínicas: Texas, Florida, Georgia) y Reino Unido (3 clínicas: Londres, Mánchester).
- **Cumplimiento:** HIPAA (EE. UU.) y UK GDPR (Reino Unido).

## Tipos de datos (`src/types/models.ts`)

```typescript
interface Clinician {
  clinicianId: string;
  firstName: string;
  lastName: string;
  role: "physician" | "nurse_practitioner" | "nurse" | "medical_assistant";
  locationId: string;
  licenceState: string;
  licenceExpiryDate: string;  // ISO 8601
  cmeHoursRequired: number;
  cmeHoursLogged: number;
  cmeYearStartDate: string;
}

interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
}
```
