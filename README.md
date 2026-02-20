# Messenger Frontend

React + TypeScript + Vite frontend for the Messenger application.

## Tech Stack
- React
- TypeScript
- Vite
- TailwindCSS
- Lucide React (Icons)
- Axios

## Setup & Running

### Using Docker (Recommended)
1. Run:
   ```bash
   docker compose up --build
   ```
The application will be available at `http://localhost`.

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

## Configuration
The frontend uses Caddy to serve static files and proxy requests to the backend. 
- API calls are proxied from `/api/` to `http://backend:8000/`.
- WebSocket connections are proxied from `/ws` to `http://backend:8000/ws`.

Modify the `Caddyfile` if your backend is hosted at a different address or if you need to add more routes.

