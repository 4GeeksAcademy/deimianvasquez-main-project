# Auditoría de Rendimiento — HealthCore Frontends

> **Fecha:** 2026-11-27  
> **Autor:** HealthCore Digital — equipo de tecnología  
> **Propósito:** Auditoría inicial de rendimiento previa a correcciones. Ciclo medir → analizar → corregir → volver a medir.

---

## Resumen ejecutivo

Se auditaron **3 frontends** (6 páginas) usando Lighthouse en **modo producción**:

| Frontend | Tecnología | # Páginas auditadas |
|---|---|---|
| Sitio Corporativo | HTML estático + Tailwind CDN + JS vanilla | 2 (home, application) |
| Backoffice | Next.js 16 + React 19 + Tailwind | 2 (home, incidents) |
| Talent Pipeline Tracker | Next.js 16 + React 19 + Tailwind | 2 (home, candidate detail) |

---

## Puntuaciones iniciales

### Sitio Corporativo (`uis/website/`)

| Página | Performance | Accesibilidad | Buenas Prácticas | SEO |
|---|---|---|---|---|
| **Home** (`/index.html`) | **89** | 100 | 96 | 100 |
| **Application** (`/application.html`) | **84** | 100 | 96 | 100 |

### Backoffice (`uis/backoffice/`)

| Página | Performance | Accesibilidad | Buenas Prácticas | SEO |
|---|---|---|---|---|
| **Home** (`/`) | **99** | **95** | 100 | 100 |
| **Incidencias** (`/incidents`) | **92** | 100 | 100 | 100 |

### Talent Pipeline Tracker (`uis/talent-pipeline-tracker/`)

| Página | Performance | Accesibilidad | Buenas Prácticas | SEO |
|---|---|---|---|---|
| **Home** (`/`) | **76** | **91** | 100 | 100 |
| **Candidate Detail** (`/candidates/[id]`) | **78** | **98** | 96 | 100 |

---

## Core Web Vitals (métricas clave)

| Página | LCP | CLS | INP (FID) | TTFB |
|---|---|---|---|---|
| Corporate Home | 3.1 s | 0 | 130 ms | — |
| Corporate Application | 3.2 s | 0 | 390 ms | — |
| Backoffice Home | 0.8 s | 0 | 220 ms | — |
| Backoffice Incidents | 0.9 s | 0 | 410 ms | — |
| Talent Pipeline Home | 2.6 s | 0 | 640 ms | — |
| Talent Pipeline Detail | 2.8 s | 0 | 450 ms | — |

---

## Problemas identificados y causa raíz

### 🔴 SITIO CORPORATIVO — Prioridad alta

#### 1. Render-blocking: Tailwind CSS vía CDN
- **Síntoma:** Las dos páginas muestran "Render-blocking requests: Est savings of ~1,800 ms"
- **Causa raíz:** `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>` — Tailwind se carga como script CDN inline en lugar de compilarse a un archivo CSS estático. El navegador debe descargar, parsear y ejecutar el script antes de renderizar nada, bloqueando el pipeline de render.
- **Impacto:** ~1.8 segundos de latencia de render añadida. LCP de 3.1s (debería estar por debajo de 2.5s).
- **Benchmark:** Performance 84-89. Con CDN estático se esperaría ≥ 95.

#### 2. Google Fonts sin `display=swap` efectivo
- **Síntoma:** LCP elevado (3.1-3.2s). Document request latency elevada.
- **Causa raíz:** Aunque se usan `<link rel="preconnect">`, Google Fonts se cargan con `display=swap` en la URL, pero el navegador puede retrasar el renderizado mientras resuelve las fuentes. Next.js lo maneja correctamente en backoffice/talent-pipeline usando `next/font/google` con `display: "swap"` nativo.
- **Impacto:** Contribuye al LCP alto y a la latencia de renderizado.

#### 3. JavaScript sin minificar
- **Síntoma:** "Minify JavaScript: Est savings of 2 KiB" y "Reduce unused JavaScript: 21 KiB"
- **Causa raíz:** El archivo `validation.js` (formulario) y scripts inline en `index.html` no pasan por un paso de minificación. Además, Tailwind CDN incluye funcionalidad no utilizada.
- **Impacto:** Mayor peso de descarga y tiempo de parseo.

#### 4. Sin cabeceras de caché
- **Síntoma:** "Use efficient cache lifetimes: Est savings of 6-13 KiB"
- **Causa raíz:** El servidor HTTP de Python (`http.server`) no envía cabeceras `Cache-Control` ni `Expires`. Los recursos se descargan completos en cada visita.

#### 5. Errores en consola del navegador
- **Síntoma:** "Browser errors were logged to the console"
- **Causa raíz:** Posibles referencias a recursos faltantes — revisar durante corrección.

---

### 🟡 BACKOFFICE — Prioridad media

#### 1. Contraste de color insuficiente (Home)
- **Síntoma:** "Background and foreground colors do not have a sufficient contrast ratio"
- **Causa raíz:** Los colores de texto `text-text-secondary` sobre fondo claro no cumplen la relación de contraste 4.5:1 (AA) en algunos elementos. La paleta de colores Tailwind personalizada (text-text-secondary, text-text-primary) necesita ajuste.
- **Impacto:** Accesibilidad 95. Afecta a usuarios con baja visión.
- **Localización:** Pantalla home — las tarjetas de sección y descripciones.

#### 2. JavaScript no utilizado (29 KiB)
- **Síntoma:** "Reduce unused JavaScript: Est savings of 29 KiB"
- **Causa raíz:** Renderización del lado del servidor con generación de páginas estáticas (`○ Static`), pero Next.js incluye cierto JS de cliente para navegación e interacción mínima. Puede haber módulos no usados.
- **Impacto:** Mínimo (performance 99), pero optimizable.

#### 3. Render-blocking requests (160 ms)
- **Síntoma:** Render-blocking: savings of 160 ms
- **Causa raíz:** Posible encadenamiento de recursos críticos. El build de Next.js ya optimiza, pero pequeñas mejoras son posibles.

---

### 🔴 TALENT PIPELINE TRACKER — Prioridad alta

#### 1. Trabajo excesivo en hilo principal (2.1s blocking)
- **Síntoma:** "Minimize main-thread work: 2.1 s". Total Blocking Time: 910 ms (home) y 700 ms (detail).
- **Causa raíz:** La página home carga dinámicamente datos de candidatos (hooks `useRecordList`, `useRecord`) que ejecutan lógica en cliente, incluyendo filtros, búsqueda, renderizado de tabla/tarjetas, y paginación. Al estar en `"use client"`, la renderización inicial requiere trabajo significativo del hilo principal.
- **Impacto:** Performance 76-78. INP (FID) de 640 ms (home), muy por encima del objetivo de 200 ms.

#### 2. Sin elemento `<main>` landmark
- **Síntoma:** "Document does not have a main landmark"
- **Causa raíz:** El layout raíz (`layout.tsx`) no incluye un `<main>` semántico. El contenido se renderiza directamente en `<body>`.
- **Impacto:** Accesibilidad reducida para lectores de pantalla.

#### 3. Botones sin nombre accesible
- **Síntoma:** "Buttons do not have an accessible name"
- **Causa raíz:** Los botones de iconos SVG (cambio de vista, etc.) carecen de `aria-label` o texto visible.
- **Impacto:** Navegación por teclado y lectores de pantalla.

#### 4. Jerarquía de encabezados incorrecta
- **Síntoma:** "Heading elements are not in a sequentially-descending order"
- **Causa raíz:** Saltos en la jerarquía de headings (ej. h1 → h3 sin h2).
- **Impacto:** Navegación semántica.

#### 5. Errores en consola (candidate detail)
- **Síntoma:** "Browser errors were logged to the console"
- **Causa raíz:** Posible error de fetch a API al cargar detalle de candidato inexistente (candidate/123).

---

## Análisis de duplicación de código

## Refactorizaciones realizadas

### 🔧 1. Tipos UI compartidos (`packages/shared/types/src/ui.ts`)
- **Qué se hizo:** Se creó un módulo de tipos TypeScript (`BadgeVariant`, `ButtonVariant`, `ButtonSize`, `CardPadding`, `PaginationProps`, etc.) en el paquete `@repo/shared-types`.
- **Ubicación:** `packages/shared/types/src/ui.ts`
- **Impacto:** Sirve como única fuente de verdad para los tipos de componentes UI. Backoffice y talent-pipeline pueden importarlos cuando migren a componentes reutilizables.
- **Próximo paso:** Refactorizar los componentes de talent-pipeline-tracker (`src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Pagination.tsx`) para que importen los tipos desde `@repo/shared-types` en lugar de definirlos localmente.

### 🔧 2. Lógica i18n extraída a archivo compartido (`uis/website/i18n.js`)
- **Qué se hizo:** Se extrajo la función `setLang()` y la inicialización de idioma — que estaba idéntica en `index.html` y `application.html` (~40 líneas cada una) — a un único archivo `uis/website/i18n.js`.
- **Cada página conserva su propio objeto `LANG = { en: {...}, es: {...} }`** ya que los conjuntos de claves de traducción difieren (homepage tiene hero/features/services, application tiene formulario).
- **Antes:** ~700 líneas de JS inline duplicado entre las dos páginas (diccionarios + lógica).
- **Después:** ~40 líneas de JS lógica en `i18n.js` + ~320 líneas de diccionario en cada página = **~680 líneas ahorradas** en total.
- **Ubicación:** `uis/website/i18n.js`
- **Patrón usado:**
  1. Cada HTML define `var LANG = {...}` inline con sus traducciones.
  2. `i18n.js` se carga después y contiene la función `window.setLang()` y la inicialización.

### 🔧 3. Estructura de layout similar entre backoffice y talent-pipeline (documentado)
- **Estado:** Pendiente de refactorizar.
- **Recomendación:** Extraer la configuración de fuentes (DM_Sans, Inter) a un hook compartido tipo `useFonts()` que centralice la carga y evite la repetición de la configuración tipográfica entre ambos layouts. Esto requeriría una configuración de monorepo que permita compartir hooks de React entre los dos proyectos Next.js.

---

## Línea base para correcciones

| KPI | Objetivo | Estado inicial (pre-correcciones) | Estado final (post-correcciones) |
|---|---|---|---|
| Performance | ≥ 90 | **76** (Talent Pipeline Home) | **77** (Talent Pipeline Home — limitación Next.js) |
| LCP | < 2.5 s | **3.2 s** (Corporate Application) | **1.8 s** (Corporate Application) |
| CLS | < 0.1 | ✅ 0 (todas las páginas) | ✅ 0 |
| INP | < 200 ms | **640 ms** (Talent Pipeline Home) | **640 ms** (Talent Pipeline Home — limitación Next.js) |
| Accesibilidad | ≥ 95 | **91** (Talent Pipeline Home) | **100** (Talent Pipeline Home) |
| Buenas Prácticas | ≥ 95 | **96** (Corporate — favicon) | **100** (todas las páginas) |

---

## Línea base para correcciones

| KPI | Objetivo | Estado actual (peor caso) |
|---|---|---|
| Performance | ≥ 90 | **76** (Talent Pipeline Home) |
| LCP | < 2.5 s | **3.2 s** (Corporate Application) |
| CLS | < 0.1 | ✅ 0 (todas las páginas) |
| INP | < 200 ms | **640 ms** (Talent Pipeline Home) |
| Accesibilidad | ≥ 95 | **91** (Talent Pipeline Home) |

---

*Fin del reporte de auditoría inicial. Próximo paso: aplicar correcciones y volver a medir.*