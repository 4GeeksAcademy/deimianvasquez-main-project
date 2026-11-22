# Design Tokens — HealthCore

> **Propósito:** Este documento define la guía de diseño visual compartida para todos los frontends del ecosistema HealthCore. Cualquier interfaz — sitio público (`uis/website`), backoffice (`uis/backoffice`), dashboards, etc. — debe consultar este archivo como fuente única de verdad para colores, tipografía, espaciados, componentes y comportamiento responsive.
>
> **Documento funcional de referencia:** `WEB_MVP.md` es la fuente de verdad para contenido, campos, nombres, validaciones y comportamiento. Si existe diferencia entre ambos, prevalece `WEB_MVP.md` para requisitos funcionales y de contenido.

---

## 1. Personalidad visual

- Profesional y serena.
- Accesible, no intimidante.
- Moderna y eficiente, sin parecer una aplicación tecnológica experimental.
- Multicultural e inclusiva, sin estereotipos visuales.

### Recursos gráficos

- Formas suaves, radios moderados y espacios amplios para transmitir calidez; mantener contraste y jerarquía propios de un servicio de salud.
- Fotografía auténtica de interacción paciente-profesional en entorno ambulatorio, diversa en edad y apariencia. Las imágenes deben ser autorizadas, sin información identificable de pacientes y con texto alternativo descriptivo.
- Si no hay fotografías aprobadas, usar ilustraciones abstractas o formas gráficas sencillas. Evitar imágenes de stock que sugieran procedimientos o resultados no especificados.
- Iconos de un solo estilo (línea simple, grosor consistente), con etiqueta textual si su significado no es obvio. No reemplazar información esencial con iconos.
- Para representar la marca, usar el nombre **HealthCore** en tipografía legible con un detalle geométrico sencillo. No inventar un logotipo oficial hasta tener recursos de marca aprobados.

---

## 2. Paleta de colores

Paleta orientada a una marca sanitaria: azul profundo para seguridad y legibilidad, teal para acción y cuidado, y fondos cálidos para evitar una sensación hospitalaria fría.

| Token            | Color         | Hex       | Uso recomendado                                                                   |
| ---------------- | ------------- | --------- | --------------------------------------------------------------------------------- |
| `brand-900`      | Azul noche    | `#123047` | Encabezados oscuros, footer, texto de alto énfasis sobre fondo claro              |
| `brand-800`      | Azul petróleo | `#174A5B` | Elementos de marca, enlaces y encabezados secundarios                             |
| `primary-700`    | Teal profundo | `#087E78` | Botón primario, enlaces y controles activos; comprobar contraste con texto blanco |
| `primary-800`    | Teal oscuro   | `#06645F` | Hover/pressed del botón primario y estados de foco de marca                       |
| `primary-100`    | Menta pálido  | `#DDF3EF` | Fondos de acento, iconos y bloques informativos                                   |
| `surface`        | Blanco cálido | `#FFFFFF` | Tarjetas, formulario y superficie principal                                       |
| `surface-muted`  | Marfil suave  | `#F5F8F7` | Fondos alternos de sección y página                                               |
| `text-primary`   | Tinta         | `#18323D` | Texto principal y etiquetas                                                       |
| `text-secondary` | Gris azulado  | `#526771` | Texto auxiliar; validar contraste para texto pequeño                              |
| `border`         | Gris claro    | `#D7E2E1` | Bordes y separadores                                                              |
| `success`        | Verde oscuro  | `#246B45` | Confirmaciones, siempre acompañado de icono/texto                                 |
| `warning`        | Ámbar oscuro  | `#815500` | Advertencias de disponibilidad, acompañado de texto/icono                         |
| `error`          | Rojo profundo | `#B42332` | Errores de formulario, acompañado de mensaje explícito                            |

### Reglas de uso

- Fondo principal blanco o `surface-muted`; reservar los fondos teal oscuros para CTA, bandas puntuales o el footer.
- Botón primario: `primary-700` con texto blanco y estado hover `primary-800`. Si el contraste calculado no alcanza 4.5:1, usar `primary-800` como color por defecto.
- Evitar texto blanco pequeño sobre menta, colores de estado como único indicador y combinaciones de bajo contraste.
- Enlaces: color de marca y subrayado visible en texto corrido. No distinguir enlaces solo por color.
- Rojo únicamente para errores. Ámbar para avisos no bloqueantes (ej. disponibilidad limitada).

---

## 3. Tipografía

### Familias

- **Títulos (headings):** `DM Sans`, pesos 600–700
- **Texto, navegación y formularios:** `Inter`, pesos 400–600
- **Alternativas del sistema:** `Arial`, `Helvetica`, sans-serif

**Pilas de fuentes recomendadas:**

```css
/* Headings */
font-family: "DM Sans", "Arial", sans-serif;

/* Body / UI */
font-family: "Inter", "Helvetica", Arial, sans-serif;
```

Cargar fuentes con pocos pesos y `font-display: swap`. Preferir auto-alojamiento sobre proveedor externo; si se usa un proveedor, evitar cargar datos de formularios en esos servicios.

### Escala tipográfica

| Estilo           | Escritorio | Móvil    | Peso / interlineado |
| ---------------- | ---------- | -------- | ------------------- |
| H1               | 48–60 px   | 38–44 px | 700 / 1.05–1.15     |
| H2               | 36–44 px   | 30–36 px | 650–700 / 1.15      |
| H3               | 22–28 px   | 20–24 px | 600–700 / 1.25      |
| Texto destacado  | 18–20 px   | 18 px    | 400–500 / 1.55–1.7  |
| Texto base       | 16–18 px   | 16 px    | 400 / 1.5–1.65      |
| Etiqueta / ayuda | 14–16 px   | 14–16 px | 500 / 1.4–1.5       |

> La escala debe adaptarse al largo de las traducciones. Evitar alturas fijas en títulos y tarjetas que puedan cortar texto en español o inglés.

---

## 4. Layout y componentes

### Layout general

- Contenedor centrado con **ancho máximo ~1,200 px**.
- Márgenes fluidos: 20–24 px en móvil, 32–48 px en escritorio.
- Espaciado basado en múltiplos de 4 u 8 px.
- Secciones amplias: 72–104 px verticales en escritorio, 48–72 px en móvil.
- Grid de 12 columnas en escritorio cuando sea útil.
- Bordes de tarjetas: 1 px, radio 12–16 px.
- Sombras suaves solo para separar niveles, no como decoración general.
- Objetivos táctiles de al menos **44 × 44 px**.

### Botones

| Estado     | Primario                           | Secundario                               |
| ---------- | ---------------------------------- | ---------------------------------------- |
| Normal     | Fondo `primary-700`, texto blanco  | Borde teal/azul, fondo transparente      |
| Hover      | Fondo `primary-800`                | Fondo con opacidad o borde más marcado   |
| Focus      | Anillo de foco de alto contraste   | Anillo de foco de alto contraste         |
| Active     | `primary-800` + presión visual     | Retroalimentación de clic                |
| Disabled   | Opacidad reducida, sin interacción | Opacidad reducida, sin interacción       |

- Botón primario: acción principal, texto específico según idioma (ej. "Solicitar una cita").
- Botón secundario: borde con color de marca, fondo transparente, hover evidente.
- **No usar** "Reservar ahora" ni lenguaje que implique cita confirmada. El formulario es una **consulta** que recepción debe confirmar.

### Tarjetas

- **Servicio:** título prominente, icono decorativo opcional, descripción en lista corta. Alturas flexibles.
- **Ubicación:** nombre, ciudad/estado, teléfono como enlace `tel:`, horario. En móvil, tarjetas; en escritorio, cuadrícula de 2–3 columnas.
- **Ventaja:** frase breve con icono o indicador visual + texto completo.

### Formularios

- Una columna en móvil; en escritorio, agrupar datos relacionados en dos columnas si las etiquetas y errores siguen claros.
- Etiquetas visibles y persistentes sobre cada control. No usar placeholder como única etiqueta.
- Usar `<fieldset>`/`<legend>` para radios y secciones relacionadas. Indicar campos requeridos de forma coherente y accesible.
- Controles con borde neutral, altura cómoda, padding adecuado y foco visible.
- Errores junto al campo, asociados con `aria-describedby`.
- Campos condicionales aparecen sin desplazar el foco inesperadamente. Al ocultarlos, no conservan validación requerida.
- Confirmación de envío simulado: sustituir o preceder al formulario con encabezado claro y foco anunciado. No sugerir que la cita está confirmada.

---

## 5. Responsive

### Breakpoints

| Rango           | Comportamiento                                               |
| --------------- | ------------------------------------------------------------ |
| **Móvil**       | ≤ 767 px: una columna, navegación móvil, tarjetas apiladas, controles ancho completo |
| **Tablet**      | 768–1023 px: grids de dos columnas donde el espacio lo permita |
| **Escritorio**  | ≥ 1024 px: composición completa, hero, grids y navegación horizontal |

### Reglas responsive

- Evitar scroll horizontal a 320 px de ancho (tablas, selectores, textos largos).
- Navegación móvil: operable con teclado y lector de pantalla, `aria-expanded`, Escape para cerrar.
- CTA visible y fácil de alcanzar sin tapar contenido ni controles.
- Cambio de idioma conserva la página correspondiente sin perder datos no enviados.
- Respetar `prefers-reduced-motion`: transiciones breves y prescindibles.

---

## 6. Accesibilidad (resumen)

Objetivo: **WCAG 2.2 AA**.

- Landmarks HTML5, orden lógico de encabezados, enlace para saltar al contenido.
- `lang="en"` o `lang="es"` según idioma activo. Selector de idioma anuncia cuál está seleccionado.
- Todos los elementos interactivos operables por teclado con `:focus-visible`.
- Errores claros, específicos, asociados al campo. Al enviar con errores, anunciar resumen y mover foco.
- No comunicar estado solo con color: incluir texto + icono.
- Imágenes informativas: `alt` descriptivo. Imágenes decorativas: `alt=""`.
- Controles y foco distinguibles. Contraste texto normal ≥ 4.5:1, texto grande ≥ 3:1.
- No persistir ni transmitir información sensible del paciente.

---

## 7. Variables CSS (design tokens)

Estas variables deben definirse en la hoja de estilos base de cada frontend:

```css
:root {
  /* Brand */
  --color-brand-900: #123047;
  --color-brand-800: #174A5B;

  /* Primary */
  --color-primary-700: #087E78;
  --color-primary-800: #06645F;
  --color-primary-100: #DDF3EF;

  /* Surface */
  --color-surface: #FFFFFF;
  --color-surface-muted: #F5F8F7;

  /* Text */
  --color-text-primary: #18323D;
  --color-text-secondary: #526771;

  /* Border */
  --color-border: #D7E2E1;

  /* Semantic */
  --color-success: #246B45;
  --color-warning: #815500;
  --color-error: #B42332;

  /* Typography */
  --font-heading: "DM Sans", "Arial", sans-serif;
  --font-body: "Inter", "Helvetica", Arial, sans-serif;

  /* Sizes */
  --font-size-h1: clamp(2.375rem, 5vw, 3.75rem);
  --font-size-h2: clamp(1.875rem, 4vw, 2.75rem);
  --font-size-h3: clamp(1.25rem, 2.5vw, 1.75rem);
  --font-size-body: clamp(1rem, 2.5vw, 1.125rem);
  --font-size-small: 0.875rem;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Layout */
  --container-max: 1200px;
  --border-radius: 12px;
  --border-radius-sm: 8px;
  --border-width: 1px;
  --focus-ring: 0 0 0 3px rgba(8, 126, 120, 0.35);

  /* Breakpoints */
  --bp-mobile: 767px;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
}
```

---

## 8. Criterios de aceptación visual

- [ ] Landing y formulario comparten paleta, tipografía, espaciado, botones y estilo de controles.
- [ ] El aspecto transmite confianza y cercanía, sin afirmar certificaciones o beneficios médicos no aprobados.
- [ ] Cada vista tiene jerarquía visual clara; todas las secciones requeridas caben sin truncar contenido.
- [ ] Versiones español e inglés tienen el mismo nivel de calidad; textos largos no desbordan componentes.
- [ ] Diseños funcionan a 320 px, tablet y escritorio, sin scroll horizontal accidental.
- [ ] Contraste de texto normal ≥ 4.5:1 y texto grande ≥ 3:1.
- [ ] Navegación, selector de idioma, formulario y mensajes usables con teclado y lector de pantalla.
- [ ] Foco visible; hover, error, éxito, advertencia y disabled son estados diferenciables.
- [ ] Teléfonos y correos accionables desde dispositivos compatibles.
- [ ] Formulario se percibe como consulta, no como reserva automática.

---

## 9. Notas para implementación

- **Confirmar contraste:** verificar que los colores propuestos superan WCAG AA con las combinaciones reales.
- **Fuentes:** confirmar disponibilidad/licencia de DM Sans e Inter antes de usarlas. Si no están disponibles, usar las alternativas del sistema.
- **Traducciones:** validar apariencia en español e inglés con textos reales en anchuras pequeñas.
- **WEB_MVP.md es la autoridad:** cualquier cambio en servicios, ubicaciones, horarios o datos de contacto debe acordarse en `WEB_MVP.md`, no en esta guía.