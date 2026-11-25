#!/usr/bin/env python
"""
Wrapper para ejecutar el seeder desde la raíz del proyecto.

Uso: uv run python seed.py
     uv run python -m app.seed
"""

from app.seed import main

if __name__ == "__main__":
    main()