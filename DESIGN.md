---
name: Odisea Cloud Design System
description: Futuristic, high-contrast dark theme for cloud infrastructure management.
colors:
  primary: "#00A3FF"
  secondary: "#00E5FF"
  background: "#050B14"
  neutral-sidebar: "#0A1221"
  neutral-card: "#111B2F"
  text-primary: "#F8FAFC"
  text-muted: "#71717A"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
rounded:
  sm: "8px"
  md: "12px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-kinetic:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-glass:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: Odisea Cloud

## 1. Overview

**Creative North Star: "The Celestial Voyager"**

Odisea Cloud es un sistema de diseño inmersivo y futurista diseñado para la gestión de infraestructura crítica. Utiliza una estética de "Deep Space" con fondos negros profundos, gradientes de energía (cian/azul) y efectos de vidrio sutiles para evocar una sensación de tecnología de vanguardia y confiabilidad absoluta.

**Key Characteristics:**
- **Estética OLED**: Fondos negros puros o extremadamente oscuros para minimizar la fatiga visual y maximizar el contraste de los datos.
- **Energía Kinetic**: Uso de gradientes vibrantes en puntos de interacción clave para guiar al usuario.
- **Estructura Cristalina**: Jerarquía visual construida mediante capas de vidrio (backdrop-blur) y bordes finos de alta precisión.

## 2. Colors

La paleta se inspira en el espacio profundo y la luz de neón técnica.

### Primary
- **Odisea Azure** (#00A3FF): Color principal de marca, usado para acciones primarias, estados activos y acentos de navegación.

### Secondary
- **Hyper Cyan** (#00E5FF): Color de acento de alta energía, usado en gradientes cinéticos y estados de éxito.

### Neutral
- **Deep Space** (#050B14): El lienzo base de toda la interfaz.
- **Sidebar Glass** (#0A1221): Fondo de navegación lateral con 60% de opacidad y desenfoque.
- **Card Surface** (#111B2F): Superficie base para contenedores de datos.

**The Rare Glow Rule.** El brillo neón (`neon-text`) debe usarse con moderación. Si todo brilla, nada destaca.

## 3. Typography

**Display Font:** Inter (Bold/Black Italic)
**Body Font:** Inter (Medium/Regular)
**Label Font:** JetBrains Mono / Fira Code (para datos técnicos)

### Hierarchy
- **Display** (900, clamp(2rem, 5vw, 3rem), 1): Usado para títulos de sección y branding. Siempre en mayúsculas e itálica cuando sea branding.
- **Headline** (700, 24px, 1.2): Títulos de página y secciones principales.
- **Body** (400, 14px, 1.5): Texto de lectura principal. Máximo 70ch de longitud.
- **Label** (700, 10px, 1, 0.2em spacing): Etiquetas de metadatos y categorías en mayúsculas.

## 4. Elevation

No usamos sombras tradicionales. La profundidad se comunica a través del contraste de capas y el brillo del borde (stroke).

**The Stroke Hierarchy Rule.** La elevación se define por la opacidad del borde. Las capas más frontales tienen bordes más brillantes (`border-white/20`) que las capas de fondo (`border-white/5`).

## 5. Components

### Buttons
- **Shape:** Rounded XL (24px) o MD (12px).
- **Primary (Kinetic):** Gradiente de Odisea Azure a Hyper Cyan con texto blanco.
- **Hover:** Aumento sutil de brillo y escala (1.02).

### Cards
- **Corner Style:** Rounded 2XL (16px).
- **Background:** Card Surface (#111B2F) con 40% de opacidad y backdrop-blur (12px).
- **Border:** 1px sólido de color Odisea Azure al 10% de opacidad.

### Inputs
- **Style:** Fondo blanco al 5% con borde al 10%.
- **Focus:** El borde cambia a Odisea Azure al 50%.

## 6. Do's and Don'ts

### Do:
- **Do** usar gradientes cinéticos solo en elementos interactivos principales.
- **Do** mantener el fondo en #050B14 o más oscuro.
- **Do** usar tipografía mono para valores de CPU, RAM y direcciones IP.

### Don't:
- **Don't** usar bordes de colores sólidos y opacos; siempre usar opacidades bajas.
- **Don't** usar sombras paralelas oscuras; el sistema es emisor de luz, no bloqueador.
- **Don't** usar más de un 10% de acento vibrante por pantalla.
