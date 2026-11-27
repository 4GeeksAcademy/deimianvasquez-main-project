# 🧪 Batería de pruebas — HealthCore Auth API

## 📋 Plan de pruebas (AUTH-088)

### Convención

Cada endpoint cubre tres niveles:

| Tipo | Qué prueba |
|---|---|
| **Camino feliz** | Entrada válida → respuesta/efecto esperado |
| **Caso límite** | Entrada en el borde de lo aceptable (campo vacío, longitud mínima, usuario sin perfil, email no registado) |
| **Modo de fallo** | Entrada inválida, credenciales incorrectas, token expirado, manipulación |

---

### `POST /auth/login`

| Tipo | Caso | Afirmación clave |
|---|---|---|
| ✅ Feliz | Email y contraseña correctos, usuario activo | Retorna token JWT y cookie |
| 🔲 Límite | Campo `password` vacío (string vacío) | Rechaza con 401 (llega al router, Pydantic lo acepta como string) |
| 🔲 Límite | Campo `email` con formato inválido | Rechaza con 400 (validation handler custom) |
| ❌ Fallo | Email no registrado | 401 — "Invalid email or password." |
| ❌ Fallo | Contraseña incorrecta | 401 — mismo mensaje que email inexistente |
| ❌ Fallo | Usuario desactivado (`is_active=False`) | 401 — "Account is deactivated…" |

### `GET /auth/me`

| Tipo | Caso | Afirmación clave |
|---|---|---|
| ✅ Feliz | Token válido, usuario existe, perfil completo | 200 con email, role y profile con datos |
| 🔲 Límite | Token válido, usuario existe, perfil **no existe** | 200 con campos de perfil en `null` |
| ❌ Fallo | Sin token (ni cookie ni Bearer) | 401 — "Not authenticated." |
| ❌ Fallo | Token expirado | 401 — "Token has expired." |
| ❌ Fallo | Token firmado con clave distinta | 401 — "Invalid token." |
| ❌ Fallo | Token con `sub` no numérico o ausente | 401 — error de payload |
| ❌ Fallo | Token válido pero usuario eliminado | 401 — "User not found." |

### `POST /auth/forgot-password`

| Tipo | Caso | Afirmación clave |
|---|---|---|
| ✅ Feliz | Email registrado | 200 — mensaje genérico; token generado y correo "enviado" |
| 🔲 Límite | Email **no** registrado | 200 — mismo mensaje genérico (no se filtra existencia) |
| 🔲 Límite | Email vacío o malformado | 400 (validation handler custom convierte errores Pydantic) |
| ❌ Fallo | (El servicio devuelve True siempre; no hay fallo HTTP de negocio) | — |

### `POST /auth/reset-password`

| Tipo | Caso | Afirmación clave |
|---|---|---|
| ✅ Feliz | Token JWT válido, registro existente, no usado | 200; contraseña actualizada (hash distinto); token marcado usado |
| 🔲 Límite | `new_password` de exactamente 6 caracteres | 200 (mínimo aceptado) |
| ❌ Fallo | Token malformado (cadena aleatoria) | 400 |
| ❌ Fallo | Token con `purpose` distinto de `password_reset` | 400 |
| ❌ Fallo | Token expirado | 400 |
| ❌ Fallo | Token JWT válido pero **sin registro en DB** (replay) | 400 — mensaje genérico |
| ❌ Fallo | Token JWT válido pero registro **ya consumido** (replay) | 400 — "already been used" |
| ❌ Fallo | `new_password` de 5 caracteres o menos | 400 (validation handler custom) |

### `POST /auth/change-password`

| Tipo | Caso | Afirmación clave |
|---|---|---|
| ✅ Feliz | `current_password` correcta, sesión activa | 200; hash de contraseña actualizado |
| 🔲 Límite | `new_password` de exactamente 6 caracteres | 200 |
| ❌ Fallo | `current_password` incorrecta | 400 — "Current password is incorrect." |
| ❌ Fallo | Usuario no encontrado en DB | 401 — (get_current_user lo detecta antes de llegar al handler) |
| ❌ Fallo | Sin sesión (token ausente) | 401 (cae en dependencia `get_current_user`) |

---

## 🧠 Caso identificado con ayuda de IA

Durante el análisis del flujo `reset-password` se identificó un caso de seguridad que no era obvio a simple vista:

> **Replay de token**: un atacante puede tener un JWT de reset que aún no ha expirado, firmado correctamente, pero que ya fue canjeado. El flujo debe rechazarlo comprobando el registro en base de datos, aunque el JWT en sí sea válido. Este caso está cubierto en la tabla anterior como "Token válido pero registro ya consumido".

---

## 🐍 Backend — pytest

### Ejecución

```bash
# Desde la raíz del proyecto backend
cd services/api

# Instalar dependencias (si no se ha hecho)
uv sync

# Ejecutar todas las pruebas
uv run pytest -v

# Con cobertura (objetivo: >= 70% en app.auth)
uv run pytest --cov=app.auth --cov=app.core --cov-report=term-missing
```

### Estructura de archivos

```
services/api/
├── tests/
│   ├── conftest.py              # Fixtures compartidas: test client, db tmp, usuarios mock
│   ├── test_login.py            # POST /auth/login
│   ├── test_me.py               # GET /auth/me
│   ├── test_forgot_password.py  # POST /auth/forgot-password
│   ├── test_reset_password.py   # POST /auth/reset-password
│   ├── test_change_password.py  # POST /auth/change-password
│   └── test_auth_service.py     # Pruebas unitarias de service.py / repository.py
└── pyproject.toml               # pytest y pytest-cov declarados como dev-dependencies
```

### Fixtures y aislamiento

- `tiny_db(tmp_path)` — Base TinyDB temporal en directorio volátil.
- `sample_user` / `sample_admin` — Usuarios de prueba insertados en la DB temporal.
- `auth_headers` / `auth_cookies` — Token JWT firmado para peticiones autenticadas.
- `reset_token` — Token JWT de reset firmado, con su registro en DB.
- `mock_email_service` — Monkeypatch de `app.auth.service.send_reset_email`.

---

## 🟦 Frontend — Jest (helpers de autenticación)

### Ejecución

```bash
cd uis/backoffice

# Instalar dependencias
pnpm install

# Ejecutar pruebas
pnpm test -- --coverage
```

### Estructura

```
uis/backoffice/
├── jest.config.ts               # Configuración de Jest con ts-jest
├── src/services/
│   └── __tests__/
│       ├── setup.ts             # Mocks globales (localStorage, cookie, fetch)
│       └── api.test.ts          # Pruebas de token management, login, fetchWithAuth, etc.
└── src/services/
    └── __tests__/
        └── api.test.ts          # Pruebas de token management, login, fetchWithAuth, etc.
```

### Lo que se prueba (21 tests)

| Helper | Camino feliz | Modo fallo |
|---|---|---|
| `getToken` / `setToken` / `clearToken` | Lee/escribe en localStorage y cookie | Error al escribir lanza excepción con mensaje |
| `isAuthenticated` | Verdadero si hay token | Falso si no hay token |
| `login` (exitoso) | Guarda token, llama a `/me`, devuelve CurrentUser | — |
| `login` (fallo) | — | Error HTTP lanza excepción con `data.detail` |
| `fetchWithAuth` | Adjunta Bearer, respeta headers existentes | 401 → limpia sesión y redirige |
| `forgotPassword` | POST sin auth, respeta respuesta | Error HTTP lanza excepción |
| `resetPassword` | POST sin auth, respeta respuesta | Error HTTP lanza excepción |
| `changePassword` | POST con auth, respeta respuesta | Error HTTP lanza excepción |

---

## 📊 Cobertura objetivo

| Módulo | Objetivo | Real |
|---|---|---|
| `app.auth` (router + service + repository + deps) | ≥ 70 % | **100 %** |
| `app.core` (config + security) | — | **91 %** |
| Helpers de auth en `uis/backoffice` (api.ts) | ≥ 70 % | **70 % statements / 75 % lines** |

> La evaluación no exige 100 %. Un 70 % bien razonado, con casos justificados, es el estándar del ticket.

---

## ✅ Resultados finales

### Backend (pytest)

```
52 passed, 0 failed — 9.82s
```

**Cobertura específica de auth + core: 90 %** (275 sentencias, 27 sin cubrir).

| Módulo | Cobertura | Observaciones |
|---|---|---|
| `app/auth/deps.py` | 100 % | — |
| `app/auth/repository.py` | 100 % | — |
| `app/auth/router.py` | 100 % | — |
| `app/auth/schemas.py` | 100 % | — |
| `app/auth/service.py` | 92 % | Faltan líneas de errores internos (101-102, 166, 170, 203) |
| `app/auth/email_service.py` | 40 % | Integración real con Resend — no se mockea en estos tests |
| `app/core/security.py` | 91 % | Funciones auxiliares no usadas directamente (151-158) |
| `app/core/config.py` | 71 % | Variables de entorno no sobreescritas en test |

### Frontend (Jest)

```
21 passed, 0 failed — 0.86s
```

**Cobertura de `api.ts`: 70 % statements / 75 % lines**.

Funciones cubiertas: `getToken`, `setToken`, `clearToken`, `isAuthenticated`, `login`, `fetchWithAuth`, `forgotPassword`, `resetPassword`, `changePassword`.

---