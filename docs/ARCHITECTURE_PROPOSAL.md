# Propuesta de Arquitectura de Backend — HealthCore

> **Autor:** Deimian Vásquez — HealthCore Digital
> **Propósito:** Documento de razonamiento técnico para la estructura del backend centralizado de HealthCore.
> **Destinatario:** James Osei (CTO) y equipo de ingeniería.
> **Estado:** Borrador inicial para revisión.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Contexto de negocio y restricciones](#2-contexto-de-negocio-y-restricciones)
3. [Patrón arquitectónico propuesto](#3-patrón-arquitectónico-propuesto)
4. [Estructura de carpetas y módulos](#4-estructura-de-carpetas-y-módulos)
5. [Separación frontend-backend](#5-separación-frontend-backend)
6. [Decisiones técnicas iniciales](#6-decisiones-técnicas-iniciales)
7. [Riesgos y puntos de atención](#7-riesgos-y-puntos-de-atención)
8. [Resumen de convenciones FastAPI aplicadas](#8-resumen-de-convenciones-fastapi-aplicadas)

---

## 1. Resumen ejecutivo

HealthCore necesita un backend que unifique los datos de 12 clínicas operando en dos países (EE.UU. y Reino Unido), con dos sistemas EHR incompatibles, regulaciones distintas (HIPAA y UK GDPR), y seis departamentos que hoy operan con datos aislados.

Este documento propone una **arquitectura en capas (Layered Architecture)** sobre FastAPI con **TinyDB** como motor de almacenamiento, diseñada para que el equipo pueda construir de forma incremental — empezando por los módulos de autenticación, usuarios y telemetría — e ir añadiendo los demás dominios (onboarding, tareas, etc.) sin reestructurar el proyecto.

La arquitectura prioriza la **simplicidad y la velocidad de desarrollo** sin sacrificar la separación de responsabilidades. No se propone microservicios porque el equipo es pequeño (6 personas) y la prioridad es tener un sistema funcionando pronto.

---

## 2. Contexto de negocio y restricciones

### 2.1 ¿Qué sabemos de la empresa?

HealthCore es una red de clínicas ambulatorias con:

- **12 sedes** (9 EE.UU., 3 Reino Unido).
- **~200 empleados**, de los cuales ~120 son personal clínico.
- **Dos sistemas EHR** que no se comunican entre sí.
- **Facturación separada**: reclamaciones de seguros en EE.UU. (14% de rechazo), pago privado + NHS en Reino Unido.
- **Onboarding manual** que tarda 47 días en perfiles clínicos.
- **CME** (formación médica continua) registrada en hojas de cálculo.
- **No-shows del 22%** (~1,8M$/año perdido) sin sistema de recordatorios.

### 2.2 Restricciones técnicas conocidas

| Restricción | Implicación |
|---|---|
| Equipo backend: 6 personas | Arquitectura simple de mantener, nada de microservicios |
| Datos sanitarios regulados | HIPAA + UK GDPR: auditoría, cifrado, control de acceso |
| Frontend ya existe (Next.js 16) | API REST como contrato, CORS, variables de entorno |
| Monorepo existente | El backend vive en `services/`, separado del frontend en `uis/` |
| Milestone inicial: onboarding clínico | Los primeros módulos serán auth, users, telemetría y tasks |

### 2.3 ¿Qué sistemas externos necesitamos integrar (futuro)?

Aunque el milestone inicial es onboarding, la arquitectura debe anticipar:

- **EHR EE.UU. y EHR Reino Unido** — lectura de datos de pacientes y clínicos.
- **Sistema de facturación EE.UU.** — consulta y envío de reclamaciones.
- **SMS/Email** — recordatorios de citas y notificaciones de onboarding.
- **Portal de candidatos** — potencial frontend público.

---

## 3. Patrón arquitectónico propuesto

### 3.1 Decisión: Arquitectura en Capas (Layered Architecture)

Propongo una **arquitectura en capas** clásica, donde cada capa tiene una responsabilidad bien definida y se comunica solo con la capa inmediatamente inferior.

```
┌─────────────────────────────────────────────────────┐
│               Capa de Presentación                   │
│         (Routers / FastAPI endpoints)                │
│   Recibe requests HTTP, delega al service,           │
│   devuelve respuestas JSON con formato consistente    │
├─────────────────────────────────────────────────────┤
│                Capa de Aplicación                    │
│            (Service layer / lógica de negocio)        │
│   Orquesta operaciones, aplica reglas de negocio,     │
│   coordina llamadas entre módulos y a BD              │
├─────────────────────────────────────────────────────┤
│                Capa de Datos                         │
│        (TinyDB / acceso a almacenamiento)            │
│   Lee y escribe en la base de datos.                 │
│   Abstrae si los datos vienen de TinyDB, una API     │
│   externa (EHR) o un archivo JSON                    │
└─────────────────────────────────────────────────────┘
```

Los módulos (auth, users, tasks, telemetry) son **dominios funcionales** que implementan estas tres capas de forma interna, pero a diferencia de una arquitectura hexagonal completa, aquí los módulos pueden compartir la misma instancia de TinyDB y el mismo core de configuración. Esto mantiene la separación de responsabilidades sin el overhead de una estructura más compleja.

### 3.2 ¿Por qué este patrón y no otro?

| Patrón | ¿Por qué NO? |
|---|---|
| **Microservicios** | El equipo es pequeño (6 personas). Los datos de HealthCore están intrínsecamente relacionados: un paciente tiene citas, reclamaciones y un clínico asignado. Microservicios añadiría complejidad de red, consistencia eventual y despliegue que no necesitamos hoy. |
| **Serverless (funciones)** | Las operaciones de HealthCore implican transacciones largas (onboarding: 47 días), workflows con estado y acceso a datos regulados. Serverless añade complejidad de estado, cold starts y límites de ejecución. |
| **MVC puro (Model-View-Controller)** | Mezcla lógica de negocio con controladores. En un sistema sanitario donde las reglas de negocio (HIPAA, validación de credenciales) son críticas, necesitamos separación más explícita entre "recibir un request" y "decidir qué hacer con él". |

### 3.3 ¿Por qué este patrón SÍ?

1. **Simplicidad comprobada:** TinyDB + FastAPI + capas es un stack que se puede poner en marcha en días, no en semanas. Ideal para un equipo pequeño.
2. **Crecimiento incremental:** Podemos empezar con `auth`, `users` y `telemetry`, e ir añadiendo nuevos módulos según los necesite el negocio, todos siguiendo exactamente la misma estructura.
3. **Separación de responsabilidades clara:** El `router.py` solo valida requests y delega. El `service.py` contiene la lógica de negocio. La BD se accede solo desde la capa de datos. Si mañana cambiamos TinyDB por PostgreSQL, solo toca la capa de datos.
4. **Testabilidad:** Los services se pueden testear con datos mock sin necesidad de levantar el servidor. Los routers se testean con `TestClient` de FastAPI.

---

## 4. Estructura de carpetas y módulos

### 4.1 Convención estándar de FastAPI

Basado en la investigación de proyectos FastAPI del mundo real (documentación oficial, repositorio `fastapi-full-stack` de tiangolo, y proyectos comunidad), las convenciones más comunes son:

- **`app/`** como directorio raíz del proyecto Python.
- **`app/main.py`** — punto de entrada, creación de la app FastAPI.
- **`app/core/`** — configuración, seguridad, dependencias transversales.
- **`app/db/`** — acceso a base de datos (engine, sesión).
- **Routers separados por recurso/funcionalidad** — no todo en un solo archivo.
- **Schemas Pydantic** en cada módulo para definir contratos de entrada/salida.

### 4.2 Estructura propuesta para HealthCore (con TinyDB)

```
services/
└── api/                              # Backend centralizado (único servicio)
    │
    ├── app/                          # Código fuente del backend
    │   ├── __init__.py
    │   │
    │   ├── core/                     # 🏗️ Capa transversal compartida
    │   │   ├── __init__.py
    │   │   ├── config.py             # Settings (TinyDB path, secret_key, JWT config)
    │   │   └── security.py           # JWT creation/verification, bcrypt hashing
    │   │
    │   ├── db/                       # 💾 Capa de datos / almacenamiento
    │   │   ├── __init__.py
    │   │   ├── database.py           # TinyDB principal (usuarios, tareas, etc.)
    │   │   └── telemetry.py          # TinyDB separada para eventos de telemetría
    │   │
    │   ├── telemetry/                # 📊 Módulo de telemetría (eventos, auditoría)
    │   │   ├── __init__.py
    │   │   ├── schemas.py
    │   │   ├── router.py
    │   │   └── service.py
    │   │
    │   ├── auth/                     # 🔐 Módulo de autenticación
    │   │   ├── __init__.py
    │   │   ├── schemas.py
    │   │   ├── router.py
    │   │   └── service.py
    │   │
    │   ├── users/                    # 👤 Módulo de usuarios
    │   │   ├── __init__.py
    │   │   ├── schemas.py
    │   │   ├── router.py
    │   │   └── service.py
    │   │
    │   └── main.py                   # 🚀 Punto de entrada: creación de la app FastAPI,
    │                                 #    montaje de routers, middlewares (CORS),
    │                                 #    manejadores de errores globales
    │
    ├── data/                         # 📁 Archivos de datos (se crean solos al ejecutar)
    │   ├── db.json                   # TinyDB principal
    │   └── telemetry.json            # TinyDB de telemetría
    │
    ├── tests/                        # 🧪 Tests del backend
    │   ├── __init__.py
    │   ├── conftest.py               # Fixtures: TestClient, TinyDB en memoria temporal
    │   ├── test_main.py
    │   ├── test_auth.py
    │   ├── test_users.py
    │   └── test_telemetry.py
    │
    ├── .env                          # Variables de entorno (no versionar, solo ejemplo)
    ├── .env.example                  # Template de variables de entorno para developers
    ├── pyproject.toml                # Configuración del proyecto Python (dependencias)
    ├── requirements.txt              # Dependencias exactas (pip freeze)
    └── README.md                     # Documentación del servicio
```

### 4.3 Estructura interna de cada módulo

Cada módulo dentro de `app/` sigue una estructura consistente:

```
📦 users/
├── __init__.py
├── schemas.py         # Modelos Pydantic del módulo
├── router.py          # Endpoints FastAPI
└── service.py         # Lógica de negocio
```

| Archivo | ¿Siempre? | Responsabilidad |
|---|---|---|
| `__init__.py` | ✅ Sí | Hace el módulo importable |
| `schemas.py` | ✅ Sí | Define con Pydantic los contratos de datos del módulo |
| `router.py` | ✅ Sí | Declara los endpoints HTTP y delega al service |
| `service.py` | ⬜ No siempre | Contiene la lógica de negocio. Si el módulo es simple, puede vivir en el router. |

### 4.4 Justificación de los módulos iniciales

| Módulo | Prioridad | Vinculación con HealthCore |
|---|---|---|
| **core** | Inmediata | Configuración compartida (secret key, rutas de BD, JWT). Todo módulo depende de esto. |
| **db** | Inmediata | Acceso a TinyDB. Separa la BD principal de la de telemetría para evitar mezclar datos. |
| **auth** | Sprint 1 | Sin autenticación no podemos proteger ningún endpoint. JWT + bcrypt. |
| **users** | Sprint 1 | CRUD básico de usuarios del sistema. Base para todo lo demás. |
| **telemetry** | Sprint 1 | Auditoría de eventos (quién accedió a qué, cuándo). Requerido por HIPAA y UK GDPR. |

### 4.5 ¿Por qué TinyDB y no PostgreSQL?

TinyDB es una base de datos **documental embebida** (no requiere servidor, los datos se guardan en un archivo JSON). Para este proyecto:

| Aspecto | TinyDB | PostgreSQL |
|---|---|---|
| **Setup** | `pip install tinydb` y listo | Requiere instalar/configurar servidor |
| **Datos** | Documentos JSON (cada registro es un dict) | Tablas relacionales con schema fijo |
| **Ideal para** | Prototipado rápido, equipos pequeños, datos semi-estructurados | Sistemas en producción con millones de registros |
| **Consultas** | Búsqueda por campos, query con sintaxis Python | SQL complejo, joins, agregaciones |
| **Transacciones** | No soporta transacciones reales | ACID completo |

**Decisión:** Empezamos con TinyDB para validar la arquitectura y tener algo funcionando rápido. Cuando el sistema escale y necesitemos consistencia transaccional, migramos a PostgreSQL. La capa de datos (archivos en `db/`) abstrae ese cambio.

---

## 5. Separación frontend-backend

### 5.1 Modelo de comunicación

El frontend (Next.js 16 en `uis/talent-pipeline-tracker/`) y el backend (FastAPI en `services/api/`) son **sistemas separados** que se comunican exclusivamente por **API REST** sobre HTTP.

```
┌─────────────────┐         REST/HTTP          ┌──────────────────┐
│   Next.js App    │ ◄═══════════════════════►  │  FastAPI Backend │
│  (uis/*)         │      JSON + JWT            │  (services/api)  │
└─────────────────┘                             └──────────────────┘
```

No hay comunicación directa a base de datos desde el frontend. No hay server-side rendering que importe módulos del backend. El frontend solo conoce la URL base de la API.

### 5.2 Implicaciones técnicas

| Aspecto | Decisión | Justificación |
|---|---|---|
| **Repositorio** | Monorepo (mismo repo, carpetas separadas) | El monorepo ya existe. Backend en `services/`, frontend en `uis/`. No comparten dependencias. |
| **URL base** | Variable de entorno `NEXT_PUBLIC_API_URL` | El frontend debe apuntar a `localhost:8000` en desarrollo y a la URL de producción en deploy. |
| **CORS** | Configurado en FastAPI middleware | El backend debe permitir orígenes específicos (ej: `http://localhost:3000`). Nunca `allow_origins=["*"]` en producción. |
| **Autenticación** | JWT (Bearer token en header `Authorization`) | Stateless. El frontend almacena el token (httpOnly cookie o memoria) y lo envía en cada request. |
| **Variables de entorno** | Backend: `.env` con `pydantic-settings`. Frontend: `.env.local` con `NEXT_PUBLIC_*`. | Cada sistema gestiona su propia configuración. |

### 5.3 Formato consistente de errores

El backend debe devolver errores con una estructura predecible para que el frontend los maneje sin depender solo de códigos HTTP:

```json
{
  "detail": "Descripción legible del error",
  "code": "USER_NOT_FOUND",
  "errors": [
    { "field": "email", "message": "El usuario no existe" }
  ]
}
```

---

## 6. Decisiones técnicas iniciales

### 6.1 Tecnologías base

| Tecnología | Decisión | Justificación |
|---|---|---|
| **Framework** | FastAPI | Rendimiento, validación automática con Pydantic, documentación OpenAPI generada, soporte async. Es el stack del curso. |
| **Base de datos** | TinyDB | Base de datos documental embebida (archivo JSON). Sin servidor, setup inmediato. Ideal para prototipado y equipo pequeño. Migraremos a PostgreSQL cuando sea necesario. |
| **Validación** | Pydantic v2 | Viene con FastAPI. Schemas de request/response con validación automática de tipos y formatos. |
| **Autenticación** | JWT + OAuth2 (Password flow) | FastAPI tiene soporte nativo via `OAuth2PasswordBearer`. Stateless, fácil de integrar con Next.js. |
| **Hashing** | bcrypt (via passlib) | Estándar industrial para almacenar contraseñas de forma segura. |
| **Testing** | pytest + httpx (TestClient) | pytest es el estándar en Python. TestClient de FastAPI permite probar endpoints sin levantar servidor. |
| **Configuración** | pydantic-settings | Lee variables de entorno y las valida con tipos Python. |

### 6.2 Dependencias Python (pyproject.toml conceptual)

```toml
[project]
name = "healthcore-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "tinydb>=4.8.0",
    "python-multipart>=0.0.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.27.0",
]
```

### 6.3 Variables de entorno (.env)

```bash
# HealthCore API — Configuración de entorno
TINYDB_PATH=data/db.json
TINYDB_TELEMETRY_PATH=data/telemetry.json
SECRET_KEY=genera-una-clave-segura-aqui
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

---

## 7. Riesgos y puntos de atención

### 🔴 Riesgo 1: TinyDB no soporta concurrencia ni transacciones

**Problema:** TinyDB no está diseñada para múltiples escrituras simultáneas ni para operaciones atómicas. Si dos usuarios intentan modificar el mismo registro al mismo tiempo, puede haber corrupción de datos o lecturas inconsistentes.

**Mitigación:** Para el alcance actual (equipo pequeño, baja concurrencia), TinyDB es suficiente. Cuando el sistema crezca, migrar a SQLite (soporta concurrencia básica) o PostgreSQL (transacciones ACID). La arquitectura en capas y el archivo `db/database.py` abstraen el motor de BD, el cambio no debería afectar a routers ni services.

### 🔴 Riesgo 2: Mezclar lógica de negocio dentro de los routers

**Problema:** Es tentador escribir la lógica directamente en el `router.py` para "ir más rápido". Esto lleva a routers difíciles de mantener, imposibles de testear unitariamente y con lógica duplicada entre endpoints.

**Mitigación:** El `router.py` solo debe validar el request (con Pydantic), llamar al `service.py` y devolver la respuesta. Toda lógica de negocio — incluso la más simple — va en `service.py`. Esto se debe revisar en code review.

### 🟡 Riesgo 3: Endpoints sin versionar desde el principio

**Problema:** Es fácil empezar con `/tasks` sin el prefijo `v1`. Cuando el frontend ya está conectado y necesitamos cambiar un endpoint, rompemos el frontend.

**Mitigación:** Incluir `/api/v1/` en el prefix de cada router desde el primer endpoint. Así podemos tener `/api/v2/` en el futuro sin migraciones forzadas.

### 🟡 Riesgo 4: CORS mal configurado (o no configurado)

**Problema:** El frontend corre en `localhost:3000` y el backend en `localhost:8000`. Sin CORS, todas las peticiones del frontend fallarán con errores del tipo "Blocked by CORS policy" que son difíciles de debuguear para alguien que empieza.

**Mitigación:** Configurar `CORSMiddleware` en `main.py` desde el primer commit, con `allow_origins` como variable de entorno. En producción, solo los orígenes específicos. En desarrollo, `http://localhost:3000`.

### 🟡 Riesgo 5: Datos sensibles expuestos en endpoints de telemetría

**Problema:** El módulo de telemetría registra eventos de acceso a datos. Si un endpoint de telemetría devuelve información sin filtrar (ej: qué usuario accedió a qué registro de paciente), podríamos estar exponiendo datos protegidos por HIPAA/GDPR.

**Mitigación:** El schema de respuesta de telemetría debe excluir explícitamente campos sensibles. Nunca devolver el cuerpo completo del evento si contiene datos de pacientes. La telemetría registra _metadata_ del acceso (quién, cuándón, qué recurso), no los datos en sí.

### 🟢 Riesgo 6: Dependencia de un solo proveedor de LLM para el agente de IA

**Problema:** El asistente de IA del onboarding dependerá de un LLM. Si elegimos OpenAI y luego necesitamos cambiarlo, el acoplamiento puede ser alto.

**Mitigación:** Abstraer el cliente LLM detrás de una interfaz/servicio desde el inicio, para que cambiarlo sea cuestión de implementar otro adaptador (OpenAI → Anthropic → open-source local).

---

## 8. Resumen de convenciones FastAPI aplicadas

Para dejar constancia de que esta propuesta se basa en investigación real sobre cómo se estructuran proyectos FastAPI:

| Convención común en proyectos FastAPI | Cómo se aplica en HealthCore |
|---|---|
| **`app/main.py` como punto de entrada** | `services/api/app/main.py` — crea la app, monta routers con `include_router()`, configura middlewares |
| **Routers separados por funcionalidad** | Cada módulo (`auth/`, `users/`, `telemetry/`) tiene su propio `router.py` con un `APIRouter` |
| **Schemas Pydantic separados de la lógica** | Cada módulo tiene su `schemas.py` con los modelos de request/response |
| **Configuración centralizada con variables de entorno** | `core/config.py` usando `pydantic-settings` que lee de `.env` |
| **Seguridad desacoplada** | `core/security.py` con funciones de creación/verificación de JWT y hashing, reutilizables desde cualquier módulo |
| **Base de datos abstraída** | `db/database.py` y `db/telemetry.py` como únicos puntos de acceso a TinyDB |
| **Versionado de API (`/api/v1/`)** | Prefijo `/api/v1/` en todos los routers montados en `main.py` |
| **Manejadores de errores globales** | Se configuran en `main.py` con `@app.exception_handler()` para devolver formato JSON consistente |
| **Tests con TestClient** | `tests/conftest.py` proporciona un cliente de prueba, los tests por módulo usan TinyDB temporal |

---

> **Próximos pasos sugeridos:**
>
> 1. ✅ Revisar este documento en equipo (especialmente la estructura de módulos y los riesgos).
> 2. 📝 Crear la estructura de carpetas (`services/api/app/...`) y el `pyproject.toml`.
> 3. 🔧 Implementar `core/config.py` y `core/security.py` como base compartida.
> 4. 💾 Implementar `db/database.py` y `db/telemetry.py` con TinyDB.
> 5. 🔐 Primer módulo completo: `auth` (register + login + JWT).
> 6. 🧪 Escribir tests para auth antes de pasar al siguiente módulo.
>
> Este documento debe vivir en `docs/ARCHITECTURE_PROPOSAL.md` y actualizarse a medida que el equipo tome decisiones.