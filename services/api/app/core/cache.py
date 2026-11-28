"""
HealthCore — Shared In-Memory Cache
=====================================
Caché en proceso con soporte para TTL e invalidación por prefijo.

Usa un diccionario simple. Para multi-worker (Gunicorn/Uvicorn con
varios procesos), cada worker tiene su propia caché. En ese caso,
migrar a Redis u otra caché externa.

Uso:

    from app.core.cache import get_cached, set_cache, invalidate

    # Guardar
    set_cache("incidents:summary", data, ttl_seconds=60)

    # Leer
    cached = get_cached("incidents:summary")
    if cached is not None:
        return cached

    # Invalidar por prefijo
    invalidate("incidents:")
"""

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# ── Almacén interno ───────────────────────────────────────────────
# { key: (value, expiry_timestamp) }
_cache: dict[str, tuple[Any, float]] = {}


def get_cached(key: str) -> Any | None:
    """
    Retrieve a cached value by key.

    Returns None if the key does not exist or has expired (and removes it).
    """
    entry = _cache.get(key)
    if entry is None:
        return None

    value, expiry = entry
    now = time.monotonic()

    if now < expiry:
        return value

    # Expired — clean up
    del _cache[key]
    return None


def set_cache(key: str, value: Any, ttl_seconds: int = 60) -> None:
    """
    Store a value in the cache with a TTL.

    Args:
        key: Cache key (use colon-separated prefixes for invalidation).
        value: Any pickle-able value.
        ttl_seconds: Time-to-live in seconds (default: 60).
    """
    expiry = time.monotonic() + max(ttl_seconds, 0)
    _cache[key] = (value, expiry)


def invalidate(prefix: str = "") -> None:
    """
    Invalidate all cache entries whose key starts with *prefix*.

    If prefix is empty, the entire cache is cleared.
    """
    global _cache

    if not prefix:
        _cache.clear()
        logger.debug("Cache: full invalidation.")
        return

    before = len(_cache)
    _cache = {k: v for k, v in _cache.items() if not k.startswith(prefix)}
    removed = before - len(_cache)
    if removed:
        logger.debug(f"Cache: invalidated {removed} entries with prefix '{prefix}'.")


def get_cache_size() -> int:
    """Return the number of entries currently in the cache (for monitoring)."""
    return len(_cache)


def __getattr__(name: str) -> Any:
    """Fallback for older import style."""
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")