import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-muted">
      <div className="max-w-2xl mx-auto px-4 text-center">
        {/* Hero */}
        <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-primary-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-brand-900 mb-3 font-heading">
          HealthCore
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Panel de gestión y análisis de incidencias
        </p>
        <p className="text-sm text-text-secondary mb-10 max-w-md mx-auto">
          Sistema de análisis de reportes de incidentes de pacientes para
          clínicas en Estados Unidos y Reino Unido
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <Link
            href="/incidents"
            className="group bg-surface rounded-xl border border-border p-6 hover:border-primary-100 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
              <svg
                className="w-6 h-6 text-primary-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Análisis de Incidentes
            </h2>
            <p className="text-sm text-text-secondary">
              Carga archivos CSV, valida registros y visualiza métricas de
              satisfacción, categorías y más.
            </p>
          </Link>

          <div className="group bg-surface rounded-xl border border-border p-6 opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 bg-surface-muted rounded-xl flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-secondary mb-1">
              Configuración
            </h2>
            <p className="text-sm text-text-secondary">Próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
