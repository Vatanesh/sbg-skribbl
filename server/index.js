const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const storage = require('./storage');

// Controllers
const roomController = require('./controllers/roomController');
const chatController = require('./controllers/chatController');
const drawController = require('./controllers/drawController');
const gameController = require('./controllers/gameController');

const app = express();
app.use(require('cors')());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Initialize storage
(async () => {
  const pubClient = await storage.init(REDIS_URL);

  // Configure Socket.IO Redis adapter if Redis is connected
  if (storage.isRedisConnected && pubClient) {
    const subClient = pubClient.duplicate();
    try {
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter configured');
    } catch (e) {
      console.warn('Could not configure redis adapter:', e.message);
    }
  }
})();

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  // Initialize controllers
  roomController(io, socket);
  chatController(io, socket);
  drawController(io, socket);
  gameController(io, socket);
});

app.get('/', (req, res) => res.json({ ok: true }));

server.listen(PORT, () => console.log('Server listening on', PORT));
