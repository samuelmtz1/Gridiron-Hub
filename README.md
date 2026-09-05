# 🏈 Gridiron Hub

> Plataforma interna de research, analítica avanzada y producción de contenido NFL y NCAA para canal de YouTube.

---

## 🎯 Objetivo
Automatizar la ingesta post-jornada (NFL y College Football), filtrar jugadas clave por **EPA** (Expected Points Added) y **Win Probability Swing**, preseleccionar candidatos a premios semanales (OPOW, DPOW, MVP, DOs & DON'Ts) y centralizar la preparación de guiones de video en una sola interfaz.

**Costo:** $0 perpetuo (100% fuentes públicas y tiers gratuitos).

---

## 🏗 Arquitectura y Módulos

```text
gridiron-hub/
├── SOP.md                      # Fuente de verdad de arquitectura y reglas
├── ingestion/                  # Wrappers: nflreadpy, cfbd, espn scoreboard, nflplotR
├── processing/                 # Motores de premios (awards), jugadas clave y trivia
├── storage/                    # Base de datos SQLite / DuckDB y modelos
├── api/                        # API REST en FastAPI
├── frontend/                   # Interfaz de usuario (React + Vite, design-tokens)
├── mock/                       # Entorno de Staging Mock Preview para pruebas locales
├── security/                   # Políticas de seguridad y auditoría de secretos
└── tests/                      # Pruebas automatizadas (pytest)
```

---

## 🌿 Flujo de Ramas (Git Flow)
* **`main`**: Producción blindada. Solo Sam realiza merge manual tras verificación.
* **`develop`**: Integración semanal de features.
* **`feature/<módulo>`**: Ramas dedicadas para cada módulo (`feature/security`, `feature/storage`, `feature/ingestion`, `feature/processing`, `feature/api`, `feature/frontend`, `feature/mock-preview`).

---

## 🚀 Inicio Rápido

### 1. Requisitos
* Python 3.11+
* Git
* Node.js 18+ (para el frontend)

### 2. Configuración
```bash
# Copiar variables de entorno
cp .env.example .env

# Crear entorno virtual de Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Entorno de Staging Mock Preview ("Solo para tus ojos")
Para levantar la plataforma en modo simulación con datos completos de prueba (partidos, métricas EPA, WP swing y premios):
```bash
python -m mock.preview_runner
```
