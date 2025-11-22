# Skribbl Clone (SVG-based) — Full Project

This archive contains a fullstack starter for a Skribbl.io-like drawing & guessing game.
- Server: /server (Node.js + Socket.IO + Redis)
- Client: /client (React + Vite, SVG drawing, Zustand state)

## Quick start (dev)
1. Start Redis (local on port 6379 using docker) or set REDIS_URL.
2. Start server:
   cd server
   npm install
   node index.js
3. Start client:
   cd client
   npm install
   npm run dev
4. Open the client in browser (Vite will show the address), open multiple tabs to test multiplayer.

Notes:
- This prototype uses Redis for shared state. Timer coordination for production multi-instance requires leader election or a single timer service.
- The client uses SVG so drawings scale responsively; strokes are normalized to 0..1.
