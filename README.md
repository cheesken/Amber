# AMBER

Monorepo for the AMBER hackathon project.

## Stack (source of truth: `PROJECT_REFERENCE.md`)

- **Mobile**: React Native (Expo, TypeScript)
- **Backend**: FastAPI (Python)
- **Database**: Supabase Postgres
- **Blob storage**: Supabase Storage
- **Agent orchestration**: LangGraph + GPT-4o
- **Media analysis**: Reka AI
- **PDF generation**: reportlab
- **Voice agent**: ElevenLabs
- **SMS**: Twilio

## Tooling (standardized)

- **Node**: `20` (see `.nvmrc`)
- **Python**: `3.11` (see `.python-version`)
- **Package manager**: `npm`

## Quickstart

1. Copy env

```bash
cp .env.example .env
```

2. Install JS tooling

```bash
npm install
```

3. Install API deps

```bash
npm run api:install
```

4. Run API

```bash
npm run api:dev
```

5. Create mobile app (first time only)

```bash
npm run mobile:init
```

## Common commands

- **Format**

```bash
npm run fmt
```

- **Lint (format check)**

```bash
npm run lint
```

- **API health check**

After `pnpm api:dev`, visit:

After `npm run api:dev`, visit:

- `http://localhost:8000/health`

