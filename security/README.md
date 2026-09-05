# Políticas de Seguridad — Gridiron Hub

Este documento define las directrices y mecanismos de seguridad aplicados en el proyecto.

## 1. Detección de Secretos (Gitleaks)
* Se escanean todos los commits antes de enviarse a producción.
* **Pre-commit hook local:** Ejecutar `gitleaks protect --staged` antes de confirmar cambios.
* **CI:** El workflow `.github/workflows/gitleaks.yml` bloquea Pull Requests con secretos expuestos.

## 2. Manejo de Credenciales
* Ningún token o API key debe colocarse en código duro.
* Todas las claves se configuran en `.env` (el cual está explícitamente en `.gitignore`).
* En despliegues remotos (Vercel/Render/GitHub Actions), se utilizan **GitHub Actions Secrets** o variables de entorno de la plataforma.

## 3. Principio de Menor Privilegio (Least Privilege)
* La rama `main` cuenta con protección: únicamente Sam tiene permisos de merge.
* Todo desarrollo se realiza en ramas `feature/*` y se integra a `develop` mediante Pull Request con revisión de código.

## 4. Rate Limiting y Protección de Cuotas Gratuitas
* El módulo `ingestion/cfb_source.py` implementa control de llamadas para no superar las 1,000 llamadas mensuales del tier gratuito de CollegeFootballData.
* Se cachean resultados en almacenamiento local (SQLite/DuckDB) para evitar consultas redundantes a APIs externas.

## 5. Autenticación en API
* Si el API de FastAPI se despliega fuera del entorno local, los endpoints protegidos requieren el encabezado:
  `X-Team-Token: <TEAM_SHARED_SECRET>`
