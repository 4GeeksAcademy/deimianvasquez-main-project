#!/usr/bin/env python
"""
Wrapper para ejecutar el seeder de incidencias desde la raíz del proyecto.

Uso: uv run python seed_incidents.py [--csv path/to/file.csv]
     uv run python -m app.incidents.seed --csv path/to/file.csv
"""

import sys
import os

# Ensure the api package is importable
API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "api"))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

from app.incidents.seed import main

if __name__ == "__main__":
    main()