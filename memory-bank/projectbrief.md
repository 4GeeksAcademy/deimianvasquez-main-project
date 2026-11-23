# Project Brief — HealthCore

## Resumen de la empresa

HealthCore es una empresa sanitaria de atención ambulatoria fundada en 2011 en Austin, Texas. Opera una red de **12 clínicas**:

- **9 en EE. UU.** (Texas, Florida y Georgia)
- **3 en el Reino Unido** (Londres y Mánchester)

Ofrece atención primaria, consultas con especialistas, gestión de enfermedades crónicas y programas de salud preventiva. Cuenta con unos **200 empleados** entre personal clínico, operaciones, administración y tecnología. Su facturación anual ronda los **28 millones de dólares**.

### Liderazgo

- **Dra. Sandra Okonkwo** — CEO y fundadora. Médica de formación, escéptica con la tecnología que no resuelve problemas reales.
- **James Osei** — CTO. Lidera un equipo de 6 personas en Austin para mantener y modernizar el legado tecnológico.

---

## Problemas del negocio

HealthCore enfrenta múltiples problemas derivados de una infraestructura tecnológica fragmentada:

| Departamento | Problema principal |
|---|---|
| **Operaciones Clínicas** | Dos EHR incompatibles; 35 min/día perdidos en documentación |
| **Experiencia del Paciente** | 22 % de no-shows (~1,8 M$/año perdido); sin recordatorios |
| **Ciclo de Ingresos** | 14 % de rechazos de reclamaciones (doble del promedio); facturación manual |
| **Cumplimiento** | HIPAA + UK GDPR; sin pistas de auditoría centralizadas |
| **Personas y Fuerza Laboral** | Onboarding manual; 47 días en cerrar contrataciones clínicas; CME en hoja de cálculo |
| **Tecnología** | Sistemas heredados no integrados; sin telemetría ni registro central |
| **Dirección Ejecutiva** | Sin dashboard unificado; informes semanales desactualizados |

---

## Enfoque del proyecto

Según **company-choice.md**, el milestone elegido es:

> **Workflow automatizado de onboarding para personal clínico, con recordatorios de tareas y un asistente de IA para consultar políticas internas.**

### Descripción

El workflow crea una lista de incorporación (checklist) según el cargo, la sede y el país; registra el progreso de verificaciones y capacitaciones; envía recordatorios por tareas pendientes; e incluye un asistente de IA (agente) que responde dudas sobre políticas internas con referencias documentadas.

### Principios rectores

- El agente **no aprueba credenciales ni toma decisiones de habilitación laboral** — esas decisiones siguen bajo revisión humana.
- El asistente deriva a RR. HH. cuando detecta credenciales incompletas o dudas que no puede resolver.
- El sistema debe cumplir con **HIPAA (EE. UU.)** y **UK GDPR (Reino Unido)**.

### Departamentos involucrados

- **Personas y Fuerza Laboral** (Diane Foster) — dueña del proceso de onboarding.
- **Tecnología** (James Osei) — plataforma y datos.
- **Cumplimiento y Gobierno del Dato** (Claire Whitfield) — supervisión regulatoria.

---

## Objetivos del proyecto

1. **Automatizar** el checklist de onboarding clínico adaptado por cargo, sede y país.
2. **Notificar** recordatorios automáticos de tareas pendientes a los nuevos empleados y a RR. HH.
3. **Implementar un agente de IA** que responda preguntas sobre políticas internas con referencias a la documentación autorizada.
4. **Centralizar** el seguimiento de credenciales, capacitaciones y formación continua (CME).
5. **Garantizar** el cumplimiento normativo (HIPAA + UK GDPR) en el manejo de datos personales y clínicos.

---

## Referencias

- `BRIEFING.md` — fuente del contexto de negocio.
- `company-choice.md` — justificación de la empresa y milestone elegido.
- `agents/` — directorio donde residirá el agente de onboarding.
- `workflows/` — directorio para los flujos de automatización (recordatorios, notificaciones).