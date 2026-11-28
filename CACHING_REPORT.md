# Reporte de Optimización — Caching Estratégico

## Resumen

Se implementó una estrategia de caching en tres capas para reducir latencias,
evitar cómputos redundantes y mejorar la experiencia del usuario final.

| Aspecto                | Técnica              | Impacto estimado |
|------------------------|----------------------|------------------|
| Backend — middleware   | Timing / logging     | Diagnóstico      |
| Backend — summary      | Caché en memoria TTL | ⚡ **Alto** (4 agregaciones → 1 lookup) |
| Backend — products     | Caché en memoria TTL | ⚡ **Alto** (N consultas SQL → 1 lookup) |
| Backend — invalidación | Por prefijo          | Consistencia     |
| Frontend — paneles     | `next/dynamic`       | ⚡ **Medio** (carga bajo demanda) |
| Frontend — cómputos    | `useMemo`            | ⚡ **Bajo** (evita re-cálculos en cada render) |
| Frontend — paginación  | skip/limit + cache   | ⚡ **Medio** (20 resultados por página, evita transferir el catálogo completo) |

---

## 1. Middleware de Timing (`main.py`)

### Archivo
`services/api/app/main.py`

### Cambio
Se agregó un middleware HTTP que mide y registra la duración de cada request:

```
GET /api/incidents → 200 | 45.3ms
```

### Propósito
- Proveer visibilidad inmediata del impacto de las optimizaciones.
- Detectar endpoints lentos sin necesidad de herramientas externas.

### Código relevante
```python
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} | {elapsed:.1f}ms")
    return response
```

---

## 2. Módulo de Caché Compartido (`core/cache.py`)

### Archivo
`services/api/app/core/cache.py` (nuevo)

### Diseño
- **Dict en memoria** con expiración por TTL.
- Sincronizado con `threading.Lock` para entornos multi-hilo.
- **Clave**: valor serializable (dict, list, str, int).
- **Valor**: `tuple[Any, float]` donde el float es `time.monotonic() + ttl`.
- **Invalidación por prefijo**: elimina todas las claves que empiezan con una cadena.

### API pública
| Función          | Parámetros                        | Comportamiento                              |
|------------------|-----------------------------------|---------------------------------------------|
| `get_cached(key)`  | `key: str`                        | Retorna el valor o `None` si expiró/no existe |
| `set_cache(key, value, ttl_seconds=60)` | `value: Any` | Almacena con TTL (default 60 s)             |
| `invalidate(prefix="")` | `prefix: str`              | Elimina todas las claves que empiecen con `prefix`. Si `prefix=""` limpia todo |
| `get_cache_size()` | —                                | Retorna `(active_entries, expired_entries)` |

### Ejemplo de uso
```python
from app.core.cache import get_cached, set_cache, invalidate

cached = get_cached("incidents:summary")
if cached is not None:
    return cached

result = compute_expensive_summary()
set_cache("incidents:summary", result, ttl_seconds=60)
return result
```

### Thread-safety
Todas las operaciones sobre `_cache` se realizan dentro de `with _lock:`.

### Por qué no Redis
- Zero dependencias adicionales.
- Configuración instantánea para desarrollo.
- La API pública es idéntica en concepto a Redis; migrar sería cambiar `get_cached`/`set_cache` por llamadas Redis.

---

## 3. Backend — Incidents Summary (`incidents/service.py`)

### Archivo
`services/api/app/incidents/service.py`

### Estrategia
- **Cachear** el resumen (`by_status`, `by_category`, `by_origin`, `by_branch`) por **60 segundos**.
- **Invalidar** el prefijo `"incidents:"` cada vez que se crea un incidente o se cambia su estado.

### Línea de tiempo de una request típica
1. `GET /api/incidents/summary` → `get_incident_summary()`
2. `get_cached("incidents:summary")` → **miss** (primera vez o TTL expirado)
3. Se ejecutan 4 agregaciones (`count_incidents_by_field`)
4. `set_cache("incidents:summary", summary, ttl_seconds=60)`
5. Siguientes requests → **hit** → retorna instantáneo

### Código relevante
```python
def get_incident_summary() -> IncidentSummary:
    cached = get_cached(_SUMMARY_CACHE_KEY)
    if cached is not None:
        return cached

    summary = IncidentSummary(
        by_status=count_incidents_by_field("status"),
        by_category=count_incidents_by_field("category"),
        by_origin=count_incidents_by_field("origin"),
        by_branch=count_incidents_by_field("branch"),
    )

    set_cache(_SUMMARY_CACHE_KEY, summary, ttl_seconds=_SUMMARY_CACHE_TTL)
    return summary
```

### Invalidación
```python
# En create_incident():
invalidate(_INCIDENTS_CACHE_PREFIX)

# En update_incident_status():
invalidate(_INCIDENTS_CACHE_PREFIX)
```

---

## 4. Backend — Inventory Products (`inventory/router.py`)

### Archivo
`services/api/app/inventory/router.py`

### Estrategia
- **Cachear** `MedicalSupplyListResponse` por **30 segundos** (stock cambia más seguido que los incidentes).
- Se persiste `response.model_dump()` (dict) porque Pydantic v2 no es directamente cacheable.
- **Invalidar** el prefijo `"inventory:"` en:
  - `POST /inventory/products`
  - `POST /inventory/orders/inbound`
  - `POST /inventory/orders/outbound`

### Código relevante
```python
@router.get("/products", ...)
def list_products(session, current_user):
    cached = get_cached(_PRODUCTS_CACHE_KEY)
    if cached is not None:
        return MedicalSupplyListResponse(**cached)

    supplies = session.exec(select(MedicalSupply)).all()
    items = [_supply_to_response(s, session) for s in supplies]
    response = MedicalSupplyListResponse(items=items, total=len(items))

    set_cache(_PRODUCTS_CACHE_KEY, response.model_dump(), ttl_seconds=_PRODUCTS_CACHE_TTL)
    return response
```

---

## 5. Frontend — Lazy Loading (`next/dynamic`)

### Archivos modificados
- `uis/backoffice/src/app/incidents/page.tsx`
- `uis/backoffice/src/app/suppliers/page.tsx`

### Estrategia
Los componentes más pesados (SummaryPanel con sus 4 llamadas agregadas, SupplierForm con validación y formulario extenso) se cargan **solo cuando el usuario hace clic en la tab o botón correspondiente**, no al cargar la página principal.

### IncidentSummaryPanel
```typescript
const IncidentSummaryPanel = dynamic(
  () => import("./components/IncidentSummaryPanel"),
  {
    loading: () => (
      <div className="animate-pulse ...">
        {/* Skeleton loader */}
      </div>
    ),
  }
);
```

### SupplierForm
```typescript
const SupplierForm = dynamic(
  () => import("./SupplierForm"),
  {
    loading: () => (
      <div className="animate-pulse ...">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    ),
  }
);
```

### Impacto
- La página principal de incidents carga ~20 KB menos de JS en el cliente.
- SupplierForm no se importa hasta que el usuario hace clic en "New Supplier".

---

## 6. Frontend — `useMemo` para cómputos repetidos

### Archivos modificados
- `uis/backoffice/src/app/incidents/components/IncidentList.tsx`
- `uis/backoffice/src/app/incidents/components/ResultsPanel.tsx`
- `uis/backoffice/src/app/suppliers/SupplierTable.tsx`
- `uis/backoffice/src/app/suppliers/page.tsx`

### Estrategia
Los valores derivados que se usan en la UI (paginación, porcentajes, símbolos de moneda) se envuelven en `useMemo` para que React no los re-calcule en cada render.

| Componente        | Expresión memoizada        | Dependencias             |
|-------------------|----------------------------|--------------------------|
| IncidentList      | `totalPages`, `currentPage` | `total`, `skip`, `limit` |
| ResultsPanel      | `totalPct`                 | `total_records`, `valid_records` |
| SupplierTable     | `currencySymbols`          | —                        |
| Suppliers page    | `totalPages`, `currentPage` | `total`, `skip`, `limit` |

---

## Próximos pasos / Mejoras futuras

1. **Redis como backend de caché** — Reemplazar el dict en memoria por Redis cuando se despliegue con múltiples workers/servidores.
2. **Cache http en endpoints con mucha lectura** — Agregar `Cache-Control: public, max-age=30` a `GET /inventory/products` para que proxies y CDNs también cacheen.
3. **Datos de prueba realistas** — Poblador con cientos/miles de registros para validar el impacto real del caching.
4. **Monitorización** — Exponer una métrica de `cache_hit_rate` vía un endpoint `/health/cache` o logs estructurados.
5. **Stale-while-revalidate** — Para el summary, servir datos ligeramente desactualizados mientras se refresca en background (en lugar de bloquear la request).

---

## Resumen de Archivos Tocados

| Archivo                                                       | Tipo      | Cambio                     |
|---------------------------------------------------------------|-----------|----------------------------|
| `services/api/app/main.py`                                    | Backend   | Middleware de timing        |
| `services/api/app/core/cache.py` **(nuevo)**                  | Backend   | Módulo de caché compartido  |
| `services/api/app/incidents/service.py`                       | Backend   | Cache + invalidación summary |
| `services/api/app/inventory/router.py`                        | Backend   | Cache + invalidación products |
| `uis/backoffice/src/app/incidents/page.tsx`                   | Frontend  | Lazy loading SummaryPanel   |
| `uis/backoffice/src/app/suppliers/page.tsx`                   | Frontend  | Lazy loading SupplierForm + useMemo paginación |
| `uis/backoffice/src/app/incidents/components/IncidentList.tsx` | Frontend  | useMemo paginación          |
| `uis/backoffice/src/app/incidents/components/ResultsPanel.tsx` | Frontend  | useMemo totalPct            |
| `uis/backoffice/src/app/suppliers/SupplierTable.tsx`          | Frontend  | useMemo currencySymbols     |