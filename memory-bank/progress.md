# Progress — HealthCore

## Estado actual del proyecto

### Lo que ya existe

#### Frontend — Candidate Tracking (`uis/talent-pipeline-tracker/`)

- ✅ Proyecto Next.js 16 con React 19, TypeScript, Tailwind CSS 4.
- ✅ Página principal con listado de candidatos y filtros (status, stage, búsqueda).
- ✅ Vista en cuadrícula y tabla con paginación.
- ✅ Formulario de creación y edición de candidatos.
- ✅ Página de detalle de candidato con sección de notas.
- ✅ Controles de estado y etapa del pipeline.
- ✅ Servicio API (`api.ts`) con funciones CRUD para candidates y notes.
- ✅ Tipos de dominio completos (`Candidate`, `CandidateStatus`, `CandidateStage`, etc.).
- ✅ Hook `useRecords` para gestión de estado en el frontend.
- ✅ Componentes UI atómicos (Button, Card, Badge, Input, Select, Pagination, Feedback).

#### Utilidades compartidas (`src/`)

- ✅ Modelos de datos de HealthCore en `types/models.ts` (Claim, Appointment, Clinician, Location, CMEReport).
- ✅ Utilidades de colecciones, búsqueda, transformaciones y validaciones.
- ✅ Demostración (`main.ts`) que utiliza estas utilidades.

#### Paquete compartido (`packages/shared/`)

- ✅ `@repo/shared-types` con tipos base `Id` y `BaseEntity` (placeholder).

#### Infraestructura de agente

- ✅ `AGENTS.md` — guía de operación para agentes de IA con flujo pre-commit de 4 pasos y 3 niveles de protección.
- ✅ `.agents/design-rule.md` — regla de diseño con alcance explícito (siempre activa para tareas de UI/visual).
- ✅ `skills/credential-verification/` — skill funcional con SKILL.md, script Python verificado y recurso checks-reference.md.

### Lo que son guías/plantillas (no código funcional)

- 📄 **`agents/_template/`** — plantilla para crear agentes, no un agente funcionando.
- 📄 **`services/`** — README con guía para implementar FastAPI, sin código backend.
- 📄 **`workflows/`** — README con guía para n8n, sin flujos implementados.
- 📄 **`mcps/`** — README con guía para MCP, sin servidores creados.
- 📄 **`skills/`** — skills de ejemplo (data-analysis, code-review, research), no integrados aún.
- 📄 **`data/`** — estructura de directorios vacía, sin datasets ni pipelines.

### Contexto del negocio

- ✅ `BRIEFING.md` completo con información de HealthCore (departamentos, problemas, necesidades).
- ✅ `company-choice.md` con milestone elegido: onboarding clínico automatizado.
- ❌ `CONTEXT.md` aún contiene la plantilla original (placeholder), no ha sido reemplazado.

---

## Próximos pasos

### Prioridad alta

1. **Reemplazar `CONTEXT.md`** — sustituir el placeholder de la plantilla con el contexto real de HealthCore (usando BRIEFING.md como fuente).
2. **Definir la base de datos** — elegir tecnología (p. ej. PostgreSQL), diseñar schema para onboarding: candidatos, checklists, políticas, CME.
3. **Implementar backend FastAPI** en `services/`:
   - Endpoints CRUD para el pipeline de onboarding.
   - Endpoint para consultar políticas internas.
   - Endpoint para recordatorios y checklists.
4. **Crear el agente de onboarding** en `agents/onboarding-agent/`:
   - Sistemática de prompts para consultar políticas.
   - Herramientas (tools) para leer checklists, actualizar progreso, consultar políticas.
   - Tests unitarios siguiendo la plantilla.

### Prioridad media

5. **Diseñar el corpus de políticas internas** — documentación que alimentará al asistente de IA (RAG).
6. **Configurar el pipeline de datos** en `data/pipelines/` para ingestión de políticas y datos de ejemplo.
7. **Implementar workflows de notificaciones** en `workflows/` (n8n) para recordatorios de tareas.
8. **Definir el modelo de IA** — decidir entre OpenAI, Anthropic o modelo open-source para el agente.

### Prioridad baja

9. **MCP server** para que el agente acceda a datos del sistema de onboarding.
10. **Infraestructura** — Docker Compose, CI/CD, despliegue.
11. **Dashboard ejecutivo** con KPIs de onboarding (tiempo de contratación, cumplimiento de CME, etc.).

---

## Decisiones pendientes

- Tipo de base de datos y ORM.
- Proveedor de LLM para el agente.
- Servicio de notificaciones (email/SMS).
- Sistema de autenticación.
- Estrategia de embeddings para RAG sobre políticas.
- Formato y ubicación del corpus de políticas internas.

---

## Hitos del curso (referencia)

Este proyecto está asociado al programa AI Engineering de 4Geeks Academy. Los hitos del curso incluyen Web, Programación, Backend, Telemetría, RAG, Agentes, Workflows y Tiempo real. El milestone actual (onboarding automatizado) abarca principalmente los módulos de backend, RAG, agentes y workflows.

---

*Última actualización: 2026-11-22*