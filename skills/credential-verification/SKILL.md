# Credential Verification — Clinical Onboarding

> **Skill ID:** `credential-verification`
> **Versión:** 1.0.0
> **Alcance:** Agente de onboarding clínico (HealthCore)

---

## Objetivo único

Verificar que las credenciales de un profesional clínico — licencia, CME (formación médica continua), rol y cumplimiento normativo — cumplen los requisitos de HealthCore para habilitar su incorporación en una sede concreta, distinguiendo entre los marcos regulatorios de EE. UU. (HIPAA) y Reino Unido (UK GDPR).

Esta skill **no autoriza** la habilitación laboral; solo produce un reporte de verificación que RR. HH. revisa para tomar la decisión final.

---

## Inputs documentados

### Obligatorios

| Campo | Tipo | Descripción | Origen |
|---|---|---|---|
| `clinician` | `Clinician` | Datos del profesional clínico | `src/types/models.ts` — interfaz `Clinician` |
| `location` | `Location` | Sede donde se incorporará | `src/types/models.ts` — interfaz `Location` |

### Opcionales

| Campo | Tipo | Descripción | Valor por defecto |
|---|---|---|---|
| `licenceGraceDays` | `number` | Días de gracia tras vencimiento de licencia | `0` |
| `cmeThresholdPercent` | `number` | % mínimo de CME completado para considerar "on track" | `80` |
| `complianceRules` | `ComplianceRule[]` | Reglas adicionales de cumplimiento por país/sede | Vacío |

---

## Criterios de aceptación (verificables)

La skill produce un reporte `CredentialReport` con la siguiente estructura:

```typescript
interface CredentialReport {
  clinicianId: string;
  fullName: string;
  role: string;
  locationId: string;
  country: "US" | "UK";
  overallStatus: "clear" | "warnings" | "blocked";
  checks: CredentialCheck[];
  summary: string;
}

interface CredentialCheck {
  check: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}
```

### CA-1: Verificación de licencia vigente
- **Criterio:** La fecha `licenceExpiryDate` del clínico debe ser igual o posterior a la fecha actual (más `licenceGraceDays` si se especifica).
- **Pass:** `licenceExpiryDate >= today` → estado `"pass"`.
- **Warning:** `licenceExpiryDate` está entre `today` y `today + licenceGraceDays`.
- **Fail:** `licenceExpiryDate < today` (vencida) o `licenceExpiryDate` no es una fecha ISO 8601 válida.

### CA-2: Verificación del rol requerido
- **Criterio:** El rol del clínico debe ser uno de los roles soportados por HealthCore.
- **Roles soportados:** `"physician"`, `"nurse_practitioner"`, `"nurse"`, `"medical_assistant"`.
- **Pass:** El rol está en la lista.
- **Fail:** El rol no está en la lista o está vacío.

### CA-3: Verificación de CME (formación médica continua)
- **Criterio:** El porcentaje de CME completado (`cmeHoursLogged / cmeHoursRequired * 100`) debe alcanzar el umbral definido (`cmeThresholdPercent`, por defecto 80 %).
- **Pass:** Porcentaje >= umbral.
- **Warning:** Porcentaje entre 50 % y umbral - 1 %.
- **Fail:** Porcentaje < 50 % o `cmeHoursRequired` es 0 o negativo.

### CA-4: Verificación de jurisdicción
- **Criterio:** La sede (`location`) y la licencia del clínico deben ser coherentes con el país de la sede.
- **EE. UU.** (`location.country === "US"`): `licenceState` debe ser un código de estado o territorio de EE. UU. válido.
- **Reino Unido** (`location.country === "UK"`): `licenceState` se ignora; se verifica que el clínico tenga un identificador de registro profesional del Reino Unido (formato `GMC-` + 7 dígitos en el campo `clinicianId` o validación equivalente).
- **Pass:** Cumple el criterio de su país.
- **Fail:** No cumple.

### CA-5: Verificación de tiempo de contratación (alerta)
- **Criterio:** Si la fecha `createdAt` o `appliedAt` del clínico supera los 47 días desde la fecha actual, se genera una alerta.
- **Aplica solo** si los datos históricos están disponibles.
- **Warning:** Días transcurridos > 47.
- **Pass:** Días transcurridos <= 47.

---

## Script auxiliar

`scripts/verify_credentials.py` contiene una implementación de referencia en Python de todos los chequeos anteriores. El agente puede:
- Ejecutarlo directamente con datos de ejemplo para validar la lógica.
- Importar las funciones de verificación desde su propio código de agente.
- Usarlo como referencia para implementar la misma lógica en el backend FastAPI.

---

## Dependencias

- **Python 3.10+** (para el script auxiliar).
- **Datos de HealthCore:** tipos `Clinician` y `Location` definidos en `src/types/models.ts`.

---

## Ejemplo de uso

```python
clinician = {
    "clinicianId": "HC-ABC123",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "physician",
    "locationId": "LOC-AUS-01",
    "licenceState": "TX",
    "licenceExpiryDate": "2027-06-15",
    "cmeHoursRequired": 100,
    "cmeHoursLogged": 85,
    "cmeYearStartDate": "2026-01-01"
}

location = {
    "locationId": "LOC-AUS-01",
    "name": "Austin Main",
    "city": "Austin",
    "stateOrCountry": "Texas",
    "country": "US",
    "phone": "+1-512-555-0100"
}

report = verify_credentials(clinician, location, cme_threshold_percent=80)
print(report["overallStatus"])  # "clear" si pasa todo
```

---

## Notas de cumplimiento

- Los datos de clínicos están protegidos por **HIPAA** (EE. UU.) y **UK GDPR** (Reino Unido).
- Esta skill **no almacena**, **no transmite** ni **comparte** datos personales fuera del contexto de HealthCore.
- Cualquier integración con sistemas externos debe pasar por una revisión de Claire Whitfield (Cumplimiento).

---

## Integración con el agente

Cuando el agente de onboarding necesite verificar credenciales:

1. Extrae los datos del clínico desde el checklist de onboarding (futuro endpoint FastAPI en `services/api/`).
2. Obtiene la sede desde el listado de ubicaciones.
3. Invoca esta skill (ejecuta `verify_credentials.py` o llama a la lógica implementada).
4. Incorpora el reporte en la respuesta al usuario de RR. HH. con los resultados de cada chequeo.
5. Si `overallStatus === "blocked"`, el agente debe notificar a RR. HH. y no continuar el flujo de onboarding.

---

## Referencias

- `BRIEFING.md` — sección "Personas y Fuerza Laboral": onboarding manual, 47 días de contratación, CME en hoja de cálculo.
- `company-choice.md` — milestone de onboarding clínico automatizado.
- `src/types/models.ts` — interfaces `Clinician` y `Location`.
- `src/utils/validations.ts` — función `validateClinician` (referencia de validación existente).
- `src/utils/transformations.ts` — funciones `generateCMEReport` y CME (referencia de cálculo existente).