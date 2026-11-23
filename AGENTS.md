# AGENTS.md — Guía para agentes de IA en HealthCore

> Este archivo define las reglas de operación que todo agente de IA (incluyendo Cursor, Copilot, asistentes autónomos, etc.) debe seguir al trabajar en este repositorio.

---

## 1. Archivos del Memory Bank que el agente debe leer al inicio de cada sesión

Al comenzar una nueva sesión (o al reanudar tras un descanso), el agente **debe** leer estos archivos en orden, antes de ejecutar cualquier tarea:

| Orden | Archivo | Propósito |
|---|---|---|
| 1 | `memory-bank/projectbrief.md` | Entender el negocio de HealthCore, los problemas, el foco del proyecto (onboarding clínico automatizado) y los objetivos. |
| 2 | `memory-bank/techContext.md` | Conocer el stack confirmado, las decisiones técnicas, las tecnologías aún no definidas y las restricciones del monorepo. |
| 3 | `memory-bank/progress.md` | Saber qué se ha construido, qué falta, los próximos pasos priorizados y las decisiones pendientes. |

> **Nota:** Si cualquiera de estos archivos no existe, el agente debe informar al desarrollador y no asumir contenido implícito. Si existe y está desactualizado, debe sugerir su actualización como parte de la sesión.

### Archivos complementarios que pueden ser necesarios según la tarea

- `BRIEFING.md` — contexto completo de la empresa (departamentos, problemas, liderazgo).
- `company-choice.md` — justificación del milestone elegido y la visión del agente de onboarding.
- `README.md` / `README.es.md` — guía de estructura y convenciones del monorepo.
- Los `README.md` específicos dentro de la carpeta donde se vaya a trabajar (ej. `agents/README.md`, `services/README.md`).

### Reglas de desarrollo en `.agents/`

El directorio `.agents/` contiene reglas de desarrollo específicas. Cada regla define su propio alcance de aplicación:

- **Siempre activa:** se aplica en toda solicitud que coincida con su tema.
- **Por patrón de archivo:** se aplica solo al trabajar con ciertos tipos de archivo.
- **Solicitada por el agente:** el agente puede invocarla cuando lo considere necesario.

El agente debe revisar el contenido de `.agents/` al inicio de cada sesión para conocer las reglas vigentes.

---

## 2. Flujo obligatorio antes de cada commit

Antes de hacer commit, el agente debe ejecutar **todos** los siguientes pasos en este orden. Ninguno puede saltarse sin autorización explícita del desarrollador.

### Paso 1 — Verificar tipo de archivos modificados

- Revisar la lista de archivos modificados (`git status` o el listado del IDE).
- **Si algún archivo está en la sección 3 de este documento (archivos protegidos), detenerse y solicitar confirmación explícita del desarrollador antes de continuar.**
- Si el cambio afecta a datos de ejemplo, credenciales, tokens o información sensible, informar al desarrollador antes de proseguir.

### Paso 2 — Validar sintaxis y tipo

- **TypeScript/JavaScript:** Ejecutar `npx tsc --noEmit` (o `pnpm tsc --noEmit`) en la carpeta correspondiente para verificar que no hay errores de tipo.
- **Python:** Verificar que no hay errores de sintaxis (`python -m py_compile <archivo>`).
- **JSX/TSX:** Asegurar que el formato JSX es correcto y que no hay errores de compilación.
- Si hay errores, corregirlos antes de continuar. Si la corrección requiere cambios mayores, informar al desarrollador.

### Paso 3 — Verificar consistencia con el Memory Bank

- Confirmar que los cambios realizados son coherentes con el `projectbrief.md` (objetivos del proyecto) y el `techContext.md` (stack, restricciones técnicas).
- **Si el cambio introduce una nueva tecnología, dependencia o decisión técnica**, detenerse y preguntar al desarrollador si debe actualizarse `techContext.md` o `progress.md`.
- **Si el cambio completa un hito o tarea marcada en `progress.md`**, actualizar ese archivo marcando el progreso correspondiente.

### Paso 4 — Revisar y preparar el mensaje de commit

- Redactar un mensaje de commit descriptivo siguiendo el formato:
  ```
  <tipo>: <descripción breve>

  - Detalle del cambio 1
  - Detalle del cambio 2
  ...
  ```
- Tipos permitidos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`.
- Preguntar al desarrollador si desea añadir más contexto o modificar el mensaje.
- Solo después de la confirmación del desarrollador, proceder con el commit.

> ⚠️ **Importante:** Si en cualquiera de estos pasos el agente encuentra algo inesperado (errores, archivos protegidos modificados, inconsistencias), debe **detenerse y consultar al desarrollador** antes de continuar.

---

## 3. Carpetas y archivos que el agente **no debe modificar sin confirmación explícita**

Las siguientes rutas están protegidas. El agente **no debe** crear, modificar ni eliminar archivos en estas ubicaciones sin preguntar primero al desarrollador y recibir una confirmación explícita.

### Nivel de protección 🔴 — Modificación prohibida sin autorización

| Ruta | Razón |
|---|---|
| `BRIEFING.md` | Documento fuente del negocio. Solo debe actualizarse si cambia el contexto de la empresa. |
| `company-choice.md` | Decisión del estudiante sobre el enfoque del proyecto. No se modifica sin su permiso. |
| `CONTEXT.md` | Contexto unificado de la empresa. Contiene el dominio para prompts y agentes. |
| `CONTEXT.es.md` | Versión en español del contexto. |
| `README.md` / `README.es.md` | Guías del monorepo de la plantilla. No modificarlas sin acuerdo. |
| `AGENTS.md` | **Este mismo archivo.** Define las reglas de operación de los agentes. |
| `.devcontainer/` | Configuración del contenedor de desarrollo (puede afectar a Codespaces). |
| `memory-bank/` | Contiene la memoria contextual del proyecto. Solo se actualiza **con propósito explícito y informando al desarrollador**. |
| `.gitignore` | Reglas de ignorado del repositorio. |

### Nivel de protección 🟡 — Preguntar antes de modificar estructura existente

| Ruta | Razón |
|---|---|
| `uis/talent-pipeline-tracker/src/app/` | Páginas del frontend de Candidate Tracking. Ya hay implementaciones en uso. |
| `uis/talent-pipeline-tracker/src/components/` | Componentes UI existentes. La adición de nuevos es bienvenida, pero la modificación de los existentes debe consultarse. |
| `uis/talent-pipeline-tracker/src/types/` | Tipos de dominio. Cambiarlos puede romper la interfaz. |
| `uis/talent-pipeline-tracker/src/services/api.ts` | Servicio API del frontend. Cambios pueden afectar a toda la app. |
| `uis/talent-pipeline-tracker/package.json` | Dependencias del frontend. Añadir/quitar dependencias requiere confirmación. |
| `src/types/models.ts` | Modelos de datos de HealthCore (Claim, Appointment, Clinician, Location, CME). |
| `src/utils/` | Utilidades de colecciones, búsqueda, transformaciones y validaciones. |
| `packages/shared/types/index.ts` | Tipos compartidos (`@repo/shared-types`). |
| `agents/_template/` | Plantilla oficial para crear agentes. No modificar sin afectar a todos los agentes futuros. |

### Nivel de protección 🟢 — Libre modificación (no requiere permiso previo)

| Ruta | Razón |
|---|---|
| `agents/` (carpetas de agentes nuevos, no `_template/`) | Agentes de IA del proyecto. Se pueden crear y modificar libremente. |
| `services/` | Backend FastAPI (cuando exista). Se puede modificar libremente. |
| `data/` | Datos, pipelines y evaluación. Se puede modificar libremente. |
| `workflows/` | Flujos de automatización. Se puede modificar libremente. |
| `mcps/` | Servidores MCP. Se puede modificar libremente. |
| `skills/` | Capacidades reutilizables para agentes. Se puede modificar libremente. |
| `docs/` | Documentación del proyecto. Libre modificación. |
| `scripts/` | Scripts auxiliares. Libre modificación. |
| `uis/talent-pipeline-tracker/src/hooks/` | Hooks de React existentes y nuevos. Libre modificación. |
| `uis/website/` | Páginas web estáticas del proyecto. Libre modificación. |

---

## 4. Reglas generales de comportamiento

1. **No sobreescribir sin preguntar:** Antes de reemplazar completamente un archivo existente con contenido funcional, mostrar al desarrollador un resumen del cambio propuesto.
2. **No eliminar código funcional:** Si una función ya implementada no se usa, preguntar antes de eliminarla.
3. **Documentar lo que se crea:** Cada nuevo agente, servicio o pipeline debe incluir su propio `README.md` (según las convenciones del monorepo).
4. **No asumir datos:** No inventar ejemplos, políticas internas o datos de HealthCore. Usar únicamente lo que está documentado en `BRIEFING.md`, los memory bank y los archivos del repositorio.
5. **Respetar el flujo de datos:** Seguir la convención `raw` → `pipelines` → `process` para datos, según el monorepo.
6. **Idioma de comunicación:** El desarrollador prefiere explicaciones en español. El código y la documentación técnica pueden estar en inglés según estándar del proyecto.

---

## 5. Recordatorio de comienzo de sesión

Al iniciar cada sesión, el agente debe:

```
1. Leer AGENTS.md (este archivo)
2. Revisar el contenido de .agents/ (reglas de desarrollo vigentes)
3. Leer memory-bank/projectbrief.md
4. Leer memory-bank/techContext.md
5. Leer memory-bank/progress.md
6. Preguntar al desarrollador: "¿En qué tarea te gustaría trabajar hoy?"
```

---

*Última actualización: 2026-11-22*