# AMBER

Monorepo for the AMBER hackathon project.

## Stack (source of truth: `PROJECT_REFERENCE.md`)

- **Mobile**: React Native (Expo SDK 54, TypeScript)
- **Backend**: FastAPI (Python 3.11)
- **Database**: Supabase
- **Orchestration**: LangGraph + GPT-4o

## Prerequisites

- **Node**: `20.x` (see `.nvmrc`)
- **Python**: `3.11.x` (see `.python-version`)
- **Mobile Preview**: Install the **Expo Go** app on your phone.

## Quickstart

### 1. Initial Setup
```bash
git clone <repo-url>
cd Amber
npm install
```

### 2. Backend Setup
We use a Python virtual environment for the API.
```bash
# Create and activate venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
npm run api:install

# Start the API
npm run api:dev
```
Verify the backend is running at [http://localhost:8000/health](http://localhost:8000/health).

### 3. Mobile Setup
Open a **new terminal tab** and navigate to the mobile app:
```bash
cd apps/mobile
npm install
```

## Running the App

### Option A: Phone Preview (Recommended)
This uses a tunnel to ensure your phone can connect to your Mac regardless of Wi-Fi/Firewall settings.
```bash
npx expo start --tunnel
```
Scan the QR code with your **Phone Camera** (iOS) or **Expo Go App** (Android).

### Option B: iOS Simulator
*Requires Xcode installed.*
```bash
npx expo start --ios -c
```

### Option C: Android Emulator
*Requires Android Studio / ADB set up.*
```bash
npx expo start --android
```

## Common Commands

- **Format Code**: `npm run fmt`
- **Lint Check**: `npm run lint`

## Troubleshooting

- **"Opening project..." hang**: Always use `npx expo start --tunnel` if you are on a public/corporate Wi-Fi.
- **Python not found**: Ensure you are using `python3` and that your `venv` is activated.
- **Expo Go version error**: This project is pinned to SDK 54 for maximum compatibility. If Expo Go suggests an update, ensure you are running the `npx expo start --tunnel` command.

