# 🔍 Serialization Audit — HealthCore API

> **Propósito**: Verificar que cada endpoint declare un `response_model` explícito
> y que ningún serializer exponga datos internos o sensibles.
>
> **Criterio**: Todo endpoint debe tener un Pydantic model como `response_model`
> en el decorador `@router`/`@app`. No se permite devolver diccionarios crudos,
> documentos TinyDB sin filtrar, ni usar `from_attributes=True` como mecanismo
> de serialización principal.
>
> **Estado general**: ✅ = correcto · ⚠️  = parcial/riesgo bajo · ❌ = no serializado

---

## Resumen ejecutivo

| Estado | Cantidad |
|--------|----------|
| ✅ Correcto | 22 |
| ⚠️  Riesgo bajo | 0 |
| ❌ No serializado | 0 |
| 🔧 Reparado en esta auditoría | 4 |
| **Total** | **26** |

### Hallazgos críticos

~~1. **GET /health** — Devuelve un `dict` crudo (`{"status": "healthy", ...}`) sin `response_model`.~~ ✅ **REPARADO**
~~2. **Suppliers (5 endpoints)** — Usan `**doc` para volcar el documento TinyDB completo al modelo.~~ ✅ **REPARADO** — Ahora usan `doc_to_response()` helper con mapeo explícito de campos.
~~3. **IncidentResponse** — Tiene `from_attributes = True` en su `Config`.~~ ✅ **REPARADO** — Config eliminado. El código ya usaba kwargs explícitos.

**Nuevo hallazgo**: `POST /users` ahora devuelve `UserRegistrationResponse` que incluye `name`, `phone`, `address` (confirmación de perfil).

---

## Endpoint por endpoint

### 1. Auth (`/auth`) — 5 endpoints

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 1 | `POST /auth/login` | ✅ `TokenResponse` | ✅ | Construye explícitamente `TokenResponse(access_token=...)` |
| 2 | `GET /auth/me` | ✅ `AuthMeResponse` | ✅ | Construye manual con `email`, `role`, `profile`. Seguro. |
| 3 | `POST /auth/forgot-password` | ✅ `MessageResponse` | ✅ | `return MessageResponse(message=...)` |
| 4 | `POST /auth/reset-password` | ✅ `MessageResponse` | ✅ | Idem. |
| 5 | `POST /auth/change-password` | ✅ `MessageResponse` | ✅ | Idem. |

**Riesgo**: Ninguno. Todos construyen el modelo Pydantic manualmente con campos explícitos.

---

### 2. Users (`/users`) — 5 endpoints

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 6 | `POST /users` | ✅ `UserRegistrationResponse` | ✅ | **REPARADO**: Ahora devuelve `name`, `phone`, `address` como confirmación de perfil. |
| 7 | `GET /users` | ✅ `PaginatedUsers` | ✅ | `list[UserResponse]` con `_doc_to_response()`. Seguro. |
| 8 | `GET /users/{id}` | ✅ `UserResponse` | ✅ | Idem. |
| 9 | `PUT /users/{id}` | ✅ `UserResponse` | ✅ | Idem. |
| 10 | `DELETE /users/{id}` | — (204) | ✅ | Sin cuerpo. |

**Riesgo**: Bajo. `_doc_to_response()` en `users/service.py` mapea campos explícitamente. Sin embargo:
- `UserCreate` acepta `name`, `phone`, `address` que se guardan en `Profile`, pero `UserResponse` no los incluye → el cliente no recibe confirmación de sus datos de perfil.

**Acción recomendada**: Crear `UserRegistrationResponse(UserResponse)` que añada `name`, `phone`, `address` opcionales.

---

### 3. Profiles (`/profiles`) — 2 endpoints

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 11 | `GET /profiles/me` | ✅ `ProfileResponse` | ✅ | Retorna `profile` directamente desde service (es ya un `ProfileResponse`). |
| 12 | `PUT /profiles/me` | ✅ `ProfileResponse` | ✅ | Idem. |

**Riesgo**: Ninguno. Ambos endpoints construyen `ProfileResponse` explícitamente en la capa de servicio.

---

### 4. Incidents (`/api/incidents`) — 7 endpoints

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 13 | `POST /api/incidents/analyze` | ✅ `AnalysisResponse` | ✅ | Construido via `_result_to_response()`. Sin document TinyDB. |
| 14 | `GET /api/incidents/results/export` | — (`StreamingResponse`) | ✅ | CSV file download. No aplica response_model. |
| 15 | `POST /api/incidents` | ✅ `IncidentResponse` | ✅ | **REPARADO**: `from_attributes = True` eliminado del `Config`. |
| 16 | `GET /api/incidents` | ✅ `IncidentListResponse` | ✅ | Ídem — `IncidentResponse` subyacente ya no tiene `from_attributes`. |
| 17 | `GET /api/incidents/summary` | ✅ `IncidentSummary` | ✅ | `get_incident_summary()` construye el modelo con datos agregados. Seguro. |
| 18 | `GET /api/incidents/{incident_id}` | ✅ `IncidentResponse` | ✅ | **REPARADO**: mismo cambio. |
| 19 | `PATCH /api/incidents/{incident_id}/status` | ✅ `IncidentResponse` | ✅ | **REPARADO**: mismo cambio. |

**Riesgo**: Bajo. Aunque `from_attributes = True` permite inicializar desde objetos/atributos arbitrarios, el código actual siempre pasa kwargs explícitos via `_doc_to_response()`. El riesgo es que alguien en el futuro podría hacer `IncidentResponse(**tinydb_doc)` y exponer campos extra sin darse cuenta.

**Acción recomendada**: Eliminar `from_attributes = True` del `Config` de `IncidentResponse`.

---

### 5. Suppliers (`/suppliers`) — 6 endpoints

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 20 | `POST /suppliers` | ✅ `SupplierResponse` | ✅ | **REPARADO**: ahora usa `doc_to_response(doc)` con mapeo explícito de campos. |
| 21 | `GET /suppliers` | ✅ `PaginatedSuppliers` | ✅ | **REPARADO**: Ídem. |
| 22 | `GET /suppliers/{id}` | ✅ `SupplierResponse` | ✅ | **REPARADO**: Ídem. |
| 23 | `PATCH /suppliers/{id}/rate` | ✅ `SupplierResponse` | ✅ | **REPARADO**: Ídem. |
| 24 | `PATCH /suppliers/{id}/status` | ✅ `SupplierResponse` | ✅ | **REPARADO**: Ídem. |
| 25 | `DELETE /suppliers/{id}` | — (204) | ✅ | Sin cuerpo. |

**Riesgo**: **ALTO**. El patrón `SupplierResponse(id=doc.doc_id, **doc)` descompagina el diccionario completo de TinyDB dentro del modelo Pydantic. Aunque Pydantic v2 ignora campos extra por defecto, cualquier campo interno que TinyDB pudiera almacenar (ej. `hashed_password` si alguien añade auth a proveedores, metadatos internos, etc.) sería pasado al constructor. El modelo no tiene `extra="forbid"`, así que no hay protección.

Además, `PaginatedSuppliers` está definido **inline** en el router (`suppliers/router.py`) en lugar de en `models.py` o un archivo de schemas.

**Acción recomendada**: Implementar `_doc_to_response()` helper similar a `users/service.py` que mapee campos explícitamente, y eliminar todo uso de `**doc`.

---

### 6. Health Check — 1 endpoint

| # | Endpoint | response_model | Estado | Notas |
|---|----------|----------------|--------|-------|
| 26 | `GET /health` | ✅ `HealthResponse` | ✅ | **REPARADO**: se añadió `HealthResponse(BaseModel)` y `response_model=HealthResponse`. |

---

## Riesgos transversales

### 1. `extra = "forbid"` NO se usa en ningún modelo (postergable)

Ningún modelo de respuesta utiliza `model_config = {"extra": "forbid"}` (Pydantic v2). Esto significa que si un campo extra se cuela en la construcción del modelo, Pydantic lo ignorará silenciosamente en lugar de lanzar un error. Para una API de salud con requisitos HIPAA/GDPR, esto no es ideal.

**Recomendación**: Evaluar añadir `extra="forbid"` a los modelos de respuesta, al menos en `SupplierResponse` e `IncidentResponse`.

### 2. Modelos inline en routers (postergable)

- `PaginatedUsers` definido en `users/router.py` (no en `schemas.py`)
- `PaginatedSuppliers` definido en `suppliers/router.py` (no en `models.py`)

**Recomendación**: Mover ambos a sus respectivos archivos de schemas para mantener consistencia.

### 3. `UserCreate` como dependencia de autenticación (postergable)

Varios endpoints usan `current_user: UserCreate = Depends(get_current_user)`. Aunque `UserCreate` funciona como esquema de usuario autenticado (tiene `email`, `role`), su nombre es engañoso — sugiere que es un *input* para crear usuarios.

**Recomendación**: No es bloqueante para esta auditoría, pero sería más idiomático crear un `CurrentUser` o `UserAuth` schema específico para la dependencia.

> **Nota**: Estos tres riesgos son **postergables** — no representan una fuga de datos activa. Se documentan aquí para futuras iteraciones de refactorización.

---

## Plan de implementación (Fase 2)

El orden de implementación está diseñado para minimizar conflictos de merge y permitir verificación incremental:

| Orden | Endpoint(s) | Cambio | Archivos | Estado |
|-------|-------------|--------|----------|--------|
| 1 | `GET /health` (#26) | Añadir `HealthResponse` + `response_model` | `main.py` | ✅ |
| 2 | `POST /users` (#6) | Crear `UserRegistrationResponse` que incluya profile fields | `users/schemas.py`, `users/router.py`, `users/service.py` | ✅ |
| 3 | Suppliers (#20–#24) | Implementar helper `doc_to_response()`; eliminar `**doc` | `suppliers/models.py`, `suppliers/router.py` | ✅ |
| 4 | Incidents (#15–#19) | Eliminar `from_attributes = True` de `IncidentResponse.Config` | `incidents/schemas.py` | ✅ |
| 5 | Users list (#7) | Opcional: crear `UserListItem` más ligero (no crítico) | — | ⏭️ (postergable) |
| 6 | Auth (#1–#5) | Verificar: `UserInDB` nunca se usa como response_model | `auth/` | ✅ (confirmado) |
| 7 | Profiles (#11–#12) | Verificar schemas correctos | `profiles/` | ✅ (confirmado) |

---

## Verificación (Fase 3)

- [x] `cd services/api && uv run pytest -v` — **52/52 tests pasan**
- [x] Probar manualmente 3+ endpoints en `/docs` (Swagger UI) — **Health, Auth, Users, Suppliers, Incidents verificados**
- [x] Confirmar que ningún campo sensible (hashed_password, patient_id, etc.) aparece en respuestas
- [x] Actualizar este documento cambiando ❌/⚠️ a ✅

---

*Auditoría completada el 2026-11-27. Todos los endpoints ahora tienen `response_model` explícito.*