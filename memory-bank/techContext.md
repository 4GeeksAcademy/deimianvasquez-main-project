# Tech Context — HealthCore

## Estructura del monorepo

El proyecto sigue la plantilla del programa AI Engineering de 4Geeks Academy. Es un monorepo con carpetas de primer nivel con responsabilidad única:

| Carpeta | Propósito |
|---|---|
| `uis/` | Interfaces de usuario (frontends) |
| `services/` | Backend FastAPI centralizado |
| `data/` | Datos crudos, pipelines, evaluación |
| `agents/` | Agentes de IA |
| `skills/` | Capacidades reutilizables para agentes |
| `mcps/` | Servidores MCP |
| `workflows/` | Automatización y orquestación (n8n) |
| `packages/` | Librerías compartidas |
| `shared/` | Recursos sueltos compartidos |
| `infra/` | Docker, despliegue |
| `internal/` | CLIs internos |
| `scripts/` | Scripts puntuales |
| `docs/` | Arquitectura y decisiones transversales |
| `memory-bank/` | Documentación contextual del proyecto |

---

## Stack confirmado (existente en el código)

### Frontend — `uis/talent-pipeline-tracker/`

| Tecnología | Versión | Detalle |
|---|---|---|
| **Next.js** | 16.4.6 | App Router, React 19 |
| **React** | 19.3.0 | Server & Client Components |
| **TypeScript** | ~5 | Strict mode |
| **Tailwind CSS** | 4.3.3 | Con @tailwindcss/turbopack |
| **pnpm** | 12.18.0 | Package manager |
| **ESLint** | ~9 | Config `eslint-config-next` |

Estructura interna:
- `src/app/` — páginas (candidates, candidates-new)
- `src/components/` — UI (candidates, layout, ui/atoms)
- `src/hooks/` — hooks personalizados (useRecords)
- `src/services/` — API service (fetch cliente)
- `src/types/` — tipos del dominio de candidatos (Candidate, CandidateStatus, CandidateStage)

### Utilidades compartidas — `src/`

| Tecnología | Detalle |
|---|---|
| **TypeScript** | ES2022, bundler module resolution |
| **tsx** | Runtime para ejecutar TS directamente |

Contiene modelos de dominio (`types/models.ts`) y utilidades (`utils/collections.ts`, `search.ts`, `transformations.ts`, `validations.ts`) orientados a datos de HealthCore (claims, appointments, clinicians, locations, CME).

### Paquete compartido — `packages/shared/`

- `@repo/shared-types` — tipos base (`Id`, `BaseEntity`). Placeholder, pendiente de extensión.

---

## Decisiones y restricciones técnicas indicadas en READMEs

- El backend debe implementarse en **FastAPI** (único servicio centralizado, no microservicios al inicio).
- Los agentes de IA deben estructurarse con prompts, herramientas y tests; usar `agents/_template/` como base.
- Los workflows de automatización deben documentarse como exports de **n8n** (o configuración equivalente).
- Cada nuevo componente (app, servicio, agente, pipeline) debe incluir su propia subcarpeta + README.
- Los datos deben seguir el flujo: `raw` → `pipelines` → `process` → consumido por servicios/agentes/interfaces.
- Se espera usar MCP como puente entre modelos de IA y sistemas (bases de datos, APIs, GitHub).

---

## Tecnologías aún no definidas

Lo siguiente **no está definido ni implementado** aún; son decisiones pendientes:

- **Base de datos** — no hay schema, ORM ni tipo de BD (SQL/NoSQL) definido.
- **Backend FastAPI** — no hay implementación ni endpoints creados.
- **Agente de IA** — no hay implementación del agente de onboarding; solo existe la plantilla en `agents/_template/`.
- **Modelo de IA / LLM** — no se ha seleccionado un proveedor (OpenAI, Anthropic, open-source, etc.).
- **Sistema de MCP** — no hay servidores MCP implementados.
- **Workflows** — no hay flujos n8n ni orquestación definidos.
- **Infraestructura** — no hay Docker Compose, CI/CD ni configuración de despliegue.
- **Autenticación y autorización** — no hay sistema de login definido.
- **Documentación de políticas** — no existe el corpus de políticas internas que alimentará al asistente de IA.
- **Servicio de notificaciones** — (SMS, email, etc.) no definido para los recordatorios.

---

## Stack propuesto (sin implementar, para referencia futura)

Basado en el milestone elegido, es probable que se necesiten:

- Backend en **FastAPI** con endpoints para onboarding, políticas y CME.
- **Base de datos relacional** (PostgreSQL) para candidatos, checklists, políticas.
- **Agente RAG** sobre políticas internas con recuperación semántica (embeddings + LLM).
- **Servicio de notificaciones** para recordatorios (email/SMS).
- **MCP server** para que el agente acceda a datos del sistema de onboarding.

---

## Cumplimiento normativo

Cualquier sistema debe cumplir:

- **HIPAA** (EE. UU.) — datos clínicos y de pacientes en clínicas estadounidenses.
- **UK GDPR** (Reino Unido) — datos de pacientes y personal en clínicas británicas.
- Los datos personales del personal (credenciales, CME, onboarding) también están protegidos bajo estos marcos.

---

## Mapa de ubicación del código de producto

Según los README de la plantilla, cada tipo de código debe ir en una carpeta específica. Esta tabla guía dónde crear el código cuando se desarrolle:

| Tipo de código | Carpeta | README de referencia |
|---|---|---|
| Interfaces de usuario (frontends) | `uis/<nombre-app>/` | `uis/README.md` |
| Backend API (FastAPI) | `services/api/` | `services/README.md` |
| Agentes de IA | `agents/<nombre-agent>/` | `agents/README.md` |
| Skills (capacidades reutilizables) | `skills/<nombre-skill>/` | `skills/README.md` |
| Servidores MCP | `mcps/<nombre-server>/` | `mcps/README.md` |
| Workflows / orquestación | `workflows/<nombre-flow>/` | `workflows/README.md` |
| Datos raw | `data/raw/` | `data/raw/README.md` |
| Pipelines ETL | `data/pipelines/` | `data/pipelines/README.md` |
| Datos procesados | `data/process/` | `data/process/README.md` |
| Evaluación | `data/eval/` | `data/eval/README.md` |
| Tipos compartidos | `packages/shared/types/` | `packages/README.md` |
| Assets sueltos | `shared/` | `shared/README.md` |
| Docker / infra | `infra/` | `infra/README.md` |
| Scripts auxiliares | `scripts/` | `scripts/README.md` |
| Documentación | `docs/` | `docs/README.md` |

> ⚠️ **Regla importante:** No crear un segundo árbol de frontend o API en otra ubicación. Todo frontend va en `uis/`, todo backend en `services/`. Seguir los README de cada carpeta.

### Mapa de aplicaciones existentes

| Aplicación | Carpeta | ¿Qué es? | Estado |
|---|---|---|---|
| **Talent Pipeline Tracker** | `uis/talent-pipeline-tracker/` | Backoffice de onboarding / seguimiento de candidatos (Next.js 16). Es el **único backoffice del proyecto**. | ✅ Implementado |
| **Website público** | `uis/website/` | Sitio web estático (HTML/CSS/JS) — páginas informativas de HealthCore. | 🟡 Básico |
| **API Backend** | `services/` | Backend FastAPI centralizado — aún no implementado. Será el backend único para todas las apps. | 📄 Solo README |

> 📌 **Nota importante:** No existe una carpeta `uis/backoffice/`. El backoffice del proyecto **es** `uis/talent-pipeline-tracker/`. Si en el futuro se necesita otro frontend (panel de administración, portal del paciente, etc.), debe crearse como una nueva app dentro de `uis/`. El backend siempre va en `services/`.

## Referencias

- `README.md` / `README.es.md` — guía del monorepo.
- `uis/talent-pipeline-tracker/README.md` — documentación del frontend.
- `agents/_template/` — plantilla para crear agentes.
- `services/README.md` — guía del backend FastAPI.
- `skills/README.md` — guía de skills de agente.