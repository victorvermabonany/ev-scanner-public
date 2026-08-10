# Chess Coach

A web app for reviewing and learning from your chess games.

Two pieces:

- `client/` — the React frontend (Vite dev server, port **5173**)
- `server/` — the Node/Express API (port **3001**)

## Setup

Requires Node.js 18+ (tested on 22).

```bash
cd chess-coach
npm run install:all
```

## Run it

```bash
npm run dev
```

Then open http://localhost:5173.

This starts both the API and the frontend together. Requests the frontend
makes to `/api/...` are proxied to the server, so you only ever visit the
5173 URL in your browser.

You can also run them separately:

```bash
npm run dev:client   # frontend only
npm run dev:server   # API only
```

## Build

```bash
npm run build    # writes client/dist
npm run preview  # serves the built files locally
```

## Layout

```
chess-coach/
├── package.json          scripts that run both halves
├── client/
│   ├── index.html        page shell
│   ├── vite.config.js    dev server + /api proxy
│   └── src/
│       ├── main.jsx      mounts React
│       ├── App.jsx       the homepage
│       └── styles.css    global styles
└── server/
    └── index.js          Express app, /api/health
```

Add new UI as components under `client/src/`, and new endpoints as routes in
`server/index.js`.
