# VRAMS — Vehicle Request & Asset Management System

Built on **FuseReact v15 (Vite)** + **Flask + SQLAlchemy + Marshmallow**.

## Structure
```
vramsprotoptype/
├── frontend/        ← FuseReact v15 Vite app (React 19, MUI v7, RTK Query)
│   └── src/app/(control-panel)/apps/vrams/   ← VRAMS module
└── backend/         ← Flask REST API
```

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # edit DATABASE_URL if needed
python seed.py               # creates DB + demo data
python run.py                # starts on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                  # starts on http://localhost:5173
```

> Login: `admin@vrams.org` / `Password123!`

## VRAMS Pages
| Route | Page |
|---|---|
| `/apps/vrams/dashboard` | Dashboard with live stats |
| `/apps/vrams/requests` | Request management + review panel |
| `/apps/vrams/vehicles` | Fleet grid + vehicle profile |
| `/apps/vrams/vehicles/register` | Register new vehicle |
| `/apps/vrams/maintenance` | Service history + log service |
| `/apps/vrams/dispatch` | Assign + monitor dispatches |
| `/apps/vrams/settings` | Profile, Org, Users & Roles |
# vramsprototype
