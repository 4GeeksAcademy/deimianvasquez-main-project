# Regla de diseño — HealthCore Design Guide

- **Alcance:** Siempre activa (se aplica en toda solicitud que involucre diseño, maquetación, UI, componentes visuales, temas o estilos para cualquier frontend del proyecto).
- **Fuente oficial:** `shared/design-guide.md`
- **Propósito:** Cada vez que se solicite una tarea de diseño — crear una página, componente, formulario, tarjeta, botón, paleta, layout responsive o cualquier elemento visual — el agente debe consultar este archivo para determinar la línea o sección exacta de la guía que aplica.

---

## Instrucciones

1. **Identificar la línea de la guía que corresponde a lo solicitado.** Usar la siguiente tabla de referencia para localizar la sección exacta:

2. **No inventar valores de diseño.** Todos los colores, tipografías, espaciados, radios de borde, sombras y breakpoints deben extraerse textualmente de `shared/design-guide.md`.

3. **Si la solicitud abarca múltiples secciones**, aplicar todas las relevantes. Por ejemplo, crear una tarjeta de servicio requiere: colores (sección 2), tipografía (sección 3), layout y componentes (sección 4 - Tarjetas), responsive (sección 5) y accesibilidad (sección 6).

---

## Mapa de líneas — shared/design-guide.md

| Sección | Tema | Líneas aprox. | Cuándo aplica |
|---|---|---|---|
| 1 | Personalidad visual | Líneas 1–32 | Diseño general, tono, recursos gráficos, iconos, logotipo |
| 2 | Paleta de colores | Líneas 34–84 | Colores, tokens CSS, botones, fondos, enlaces, estados (success/warning/error) |
| 3 | Tipografía | Líneas 86–118 | Familias (DM Sans, Inter), escala tipográfica, pesos, interlineado |
| 4 | Layout y componentes | Líneas 120–168 | Layout general, botones (primario/secundario), tarjetas (servicio/ubicación/ventaja), formularios |
| 5 | Responsive | Líneas 170–190 | Breakpoints (móvil ≤767px, tablet 768–1023px, escritorio ≥1024px), navegación móvil, CTA |
| 6 | Accesibilidad | Líneas 192–212 | WCAG 2.2 AA, landmarks, teclado, contraste, `alt`, `aria-*` |
| 7 | Variables CSS (design tokens) | Líneas 214–240 | Variables `--color-*`, `--font-*`, tokens para implementar en la hoja de estilos base |

---

## Ejemplo de uso

**Solicitud:** "Crear un botón primario para el formulario de contacto"

1. Consultar sección 2 (colores) → `primary-700` (#087E78) para fondo, hover `primary-800` (#06645F).
2. Consultar sección 3 (tipografía) → `Inter`, 16–18px, peso 500–600.
3. Consultar sección 4 (botones) → tabla de estados primario: normal, hover, focus, active, disabled.
4. Consultar sección 5 (responsive) → objetivo táctil ≥44×44px.
5. Consultar sección 7 (variables CSS) → `--color-primary-700`, `--color-primary-800`.

**Salida esperada:** Componente botón que implementa cada token y regla desde las líneas indicadas, sin desviarse de la guía.

---

## Notas

- Si una solicitud de diseño no tiene una correspondencia clara en la guía, el agente debe informar al desarrollador y preguntar cómo proceder, en lugar de improvisar valores.
- Esta regla aplica a **todos** los frontends del proyecto: `uis/talent-pipeline-tracker/`, `uis/website/` y cualquier otro que se cree.
- Los design tokens (sección 7) deben implementarse como variables CSS en la hoja de estilos base (`globals.css` o equivalente) de cada frontend.