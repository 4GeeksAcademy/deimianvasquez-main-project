"""
Conexión a TinyDB para HealthCore Supplier Directory.

TinyDB es una base de datos documental ligera que almacena los datos
en un archivo JSON local. Se usa como base de datos principal para
el desarrollo del directorio de proveedores.
"""

from pathlib import Path
from tinydb import TinyDB

# Ruta donde se almacenará el archivo JSON de la base de datos
DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "db.json"

# Asegurarse de que el directorio data/ existe
DB_DIR.mkdir(parents=True, exist_ok=True)

# Instancia única (singleton) de la base de datos
db = TinyDB(DB_PATH)


def get_db() -> TinyDB:
    """
    Retorna la instancia de TinyDB.

    Úsala para acceder a las tablas/colecciones desde cualquier parte
    de la aplicación:
        db = get_db()
        suppliers = db.table("suppliers")
        suppliers.insert({...})
    """
    return db