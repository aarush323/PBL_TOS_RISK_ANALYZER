# Frontend (React + Vite)

UI for the ToS Risk Analyzer.

## Features

- Authentication (login/signup)
- URL/Text/PDF analysis flows
- Async job polling and result rendering
- Analysis history and restore
- Clause-level risk display
- Chat assistant linked to stored analysis sessions

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Default app URL: `http://localhost:5173`

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint

## Backend Dependency

The app currently targets backend API base URL:

- `http://localhost:8000`

This is defined directly in `src/App.jsx` as the `API` constant.
