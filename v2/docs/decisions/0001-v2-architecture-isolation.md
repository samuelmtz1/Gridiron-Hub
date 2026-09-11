# ADR 0001: Aislamiento Completo de la Versión 1.0 y Nueva Arquitectura V2

## Contexto
El usuario requiere preservar la versión 1.0 como respaldo de contingencia inmutable, garantizando que cualquier fallo o necesidad de reversión pueda atenderse sin pérdida de funcionalidad previa. La nueva versión 2.0 incorpora mejoras radicales en seguridad, diseño y motor de datos.

## Decisión
1. Mantener todos los archivos raíz de la versión 1.0 intactos.
2. Centralizar todo el desarrollo de la versión 2.0 en el subdirectorio `v2/`.
3. Organizar las contribuciones en Git a partir de la rama `develop-v2` mediante ramas temáticas `feature/v2-*`.

## Consecuencias
- **Positivas:** Cero riesgo de regresión para la versión operativa. Posibilidad de alternar entre versiones instantáneamente.
- **Compromisos:** Duplicación intencional y aislada de los módulos base en `v2/`, justificada por la necesidad de contingencia.

