---
name: ux-audit
description: UX/UI design audit skill enforcing Lookbook theme compliance, WCAG 2.2 accessibility, and drawer responsiveness.
metadata:
  standard: skills.sh/v1
  framework: ux-ui-skills
---

# UX/UI Audit Skill (Gridiron Hub 2.0)

## Propósito
Auditar la interfaz de Gridiron Hub 2.0 para garantizar que cumple con el Lookbook Aesthetic extraído de las referencias: fondo negro azabache (`#0B0B0C`), outlines blancos definidos (`#FFFFFF`) y acentos en rojo vibrante (`#E5252A`), cumpliendo accesibilidad WCAG 2.2 nivel AA/AAA.

## Puntos de Verificación
1. **Tokens de Color:**
   - Todo color visual debe derivar de `v2/frontend/design-tokens/tokens.css`.
   - Cero colores quemados dispersos en componentes.
2. **Jerarquía Visual y Contraste:**
   - Textos primarios en blanco puro sobre fondo negro (ratio de contraste superior a 15:1).
   - Acentos rojos limitados a badges, botones primarios y tabs activas.
3. **Ficha del Partido (Drawer):**
   - El boxscore debe estructurarse estrictamente en 3 columnas: Métrica, Visita, Local.
   - Rendimiento instantáneo de apertura y cierre mediante delegación de eventos y transiciones aceleradas por hardware.

