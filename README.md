# Street Soccer 3D — Multiplayer Server

This folder contains the uploaded Street Soccer 3D game and the Node.js multiplayer server it connects to.

## What's included

- `server.js` — Express + Socket.IO server with four-letter lobby codes and room message relay.
- `package.json` — dependencies and start/test commands.
- `README.md` — these setup instructions.
- `public/index.html` — the game file you uploaded, served by the multiplayer server.
- `test/` — a server health-check test.

## Run on your computer

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in your browser. Use **Create lobby** or **Join lobby** from that page.

To run the test, use `npm test` after installing dependencies.

## Deploy to Render

1. Upload the **contents of this folder** to the root of a GitHub repository. Make sure `server.js`, `package.json`, `README.md`, `public/`, and `test/` are at the repository root.
2. In Render, create a **Web Service** and connect that GitHub repository.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Leave the Root Directory blank if these files are in the repository root, then deploy.
6. When deployment finishes, open your Render URL. The game is served from the main URL; `/health` is just a status check.

The server listens on Render's supplied `PORT` automatically. Render's default CORS setting allows any website origin. If you want to restrict it, set `CORS_ORIGIN` to a comma-separated list of allowed website origins, for example `https://example.com`.

## Important

Use the Render app URL to play the game online. Do not open `public/index.html` directly as a `file://` page for online multiplayer; Socket.IO needs to load from the server. If you edit the game, replace `public/index.html` in GitHub and let Render redeploy. Changes to `server.js` or `package.json` also require a redeploy.
