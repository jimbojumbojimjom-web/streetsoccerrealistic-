'use strict';

const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_PLAYERS_PER_LOBBY = 24;

function allowedOriginsFromEnv() {
  return (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function createServer(options = {}) {
  const app = express();
  const httpServer = http.createServer(app);
  const origins = options.corsOrigin ? String(options.corsOrigin).split(',').map(s => s.trim()) : allowedOriginsFromEnv();
  const io = new Server(httpServer, {
    cors: {
      origin: origins.includes('*') ? '*' : origins,
      methods: ['GET', 'POST'],
      credentials: false
    },
    transports: ['websocket', 'polling']
  });

  const lobbies = new Map();
  const socketLobby = new Map();
  const publicDir = path.join(__dirname, 'public');

  app.get('/health', (_req, res) => {
    res.json({ ok: true, activeLobbies: lobbies.size });
  });
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  function makeCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!lobbies.has(code)) return code;
    }
    throw new Error('Could not create a lobby code. Please try again.');
  }

  function lobbySummary(lobby) {
    return {
      code: lobby.code,
      hostId: lobby.hostId,
      players: [...lobby.players].map(id => ({ id }))
    };
  }

  function publishLobby(lobby) {
    io.to(lobby.code).emit('lobby-updated', lobbySummary(lobby));
  }

  function removeSocketFromLobby(socket, reason = 'A player left the lobby.') {
    const code = socketLobby.get(socket.id);
    if (!code) return;
    const lobby = lobbies.get(code);
    socketLobby.delete(socket.id);
    socket.leave(code);
    if (!lobby) return;

    if (socket.id === lobby.hostId) {
      io.to(code).emit('lobby-closed', { reason: 'The lobby host left. The room has closed.' });
      for (const id of lobby.players) socketLobby.delete(id);
      lobbies.delete(code);
      return;
    }

    lobby.players.delete(socket.id);
    publishLobby(lobby);
  }

  io.on('connection', socket => {
    socket.on('create-lobby', (_data, callback) => {
      if (socketLobby.has(socket.id)) removeSocketFromLobby(socket);
      try {
        const code = makeCode();
        const lobby = { code, hostId: socket.id, players: new Set([socket.id]), createdAt: Date.now() };
        lobbies.set(code, lobby);
        socketLobby.set(socket.id, code);
        socket.join(code);
        if (typeof callback === 'function') callback({ ok: true, lobby: lobbySummary(lobby) });
      } catch (error) {
        if (typeof callback === 'function') callback({ ok: false, error: error.message });
      }
    });

    socket.on('join-lobby', (data = {}, callback) => {
      const code = String(data.code || '').toUpperCase().replace(/[^A-Z]/g, '');
      const lobby = lobbies.get(code);
      if (!lobby) {
        if (typeof callback === 'function') callback({ ok: false, error: 'Lobby not found. Check the four-letter code.' });
        return;
      }
      if (socketLobby.has(socket.id)) removeSocketFromLobby(socket);
      if (lobby.players.size >= MAX_PLAYERS_PER_LOBBY) {
        if (typeof callback === 'function') callback({ ok: false, error: 'This lobby is full.' });
        return;
      }
      lobby.players.add(socket.id);
      socketLobby.set(socket.id, code);
      socket.join(code);
      if (typeof callback === 'function') callback({ ok: true, lobby: lobbySummary(lobby) });
      publishLobby(lobby);
    });

    socket.on('game-event', packet => {
      const code = socketLobby.get(socket.id);
      if (!code || !packet || typeof packet.event !== 'string') return;
      // Relay the game's lobby/match messages to everyone else in this room.
      socket.to(code).emit('game-event', {
        event: packet.event.slice(0, 40),
        data: packet.data,
        peer: socket.id
      });
    });

    socket.on('leave-lobby', callback => {
      removeSocketFromLobby(socket);
      if (typeof callback === 'function') callback({ ok: true });
    });

    socket.on('disconnect', () => removeSocketFromLobby(socket, 'A player disconnected.'));
  });

  return { app, httpServer, io, lobbies };
}

function startServer(options = {}) {
  const instance = createServer(options);
  const port = options.port ?? Number(process.env.PORT || 3000);
  const host = options.host || '0.0.0.0';
  return new Promise((resolve, reject) => {
    instance.httpServer.once('error', reject);
    instance.httpServer.listen(port, host, () => {
      instance.httpServer.removeListener('error', reject);
      resolve({ ...instance, port: instance.httpServer.address().port });
    });
  });
}

if (require.main === module) {
  startServer().then(({ port }) => {
    console.log(`Street Soccer 3D server listening on port ${port}`);
  }).catch(error => {
    console.error('Could not start server:', error);
    process.exitCode = 1;
  });
}

module.exports = { createServer, startServer };
