const { v4: uuidv4 } = require('uuid');
const storage = require('../storage');
const gameManager = require('../utils/gameManager');

module.exports = (io, socket) => {
    const handlePlayerLeave = async (roomId, socketId) => {
        console.log(`Player ${socketId} leaving room ${roomId}`);

        const player = await storage.getPlayer(roomId, socketId);
        const playerName = player?.name || 'Unknown';

        await storage.delPlayer(roomId, socketId);

        const remainingPlayers = await gameManager.getPlayersList(roomId);

        if (remainingPlayers.length === 0) {
            console.log(`Room ${roomId} is now empty, cleaning up...`);
            gameManager.cleanupRoom(roomId);
            await storage.delRoom(roomId);
            await storage.delAllPlayers(roomId);
            await storage.delStrokes(roomId);
            return;
        }

        io.to(roomId).emit('players:update', remainingPlayers);
        io.to(roomId).emit('system:message', `${playerName} left the room.`);

        const meta = await storage.getRoom(roomId);
        if (meta && meta.started && remainingPlayers.length < 2) {
            console.log(`Room ${roomId} has only 1 player left. Ending game.`);
            io.to(roomId).emit('system:message', 'Game ended because only one player is left.');
            io.to(roomId).emit('game:end', { players: remainingPlayers });

            meta.started = false;
            meta.round = 0;
            meta.currentDrawerIndex = -1;
            meta.word = null;
            meta.revealed = [];

            gameManager.cleanupRoom(roomId);

            await storage.setRoom(roomId, meta);
            await storage.delStrokes(roomId);
            io.to(roomId).emit('clear');
        }
    };

    const createRoom = async ({ name, roomId }, cb) => {
        const id = roomId || uuidv4().slice(0, 6);
        const meta = await storage.getRoom(id);
        if (!meta) {
            await storage.setRoom(id, {
                roomId: id,
                round: 0,
                currentDrawerIndex: 0,
                started: false,
                word: null,
                revealed: [],
                correctGuessers: [],
                timeLeft: 0,
                maxRounds: 3
            });
            await storage.delAllPlayers(id);
            await storage.delStrokes(id);
        }
        const player = { name: name || 'Player', id: socket.id, score: 0 };
        await storage.setPlayer(id, socket.id, player);
        socket.join(id);
        socket.data.roomId = id;
        io.to(id).emit('players:update', await gameManager.getPlayersList(id));
        io.to(id).emit('system:message', `${player.name} joined the room.`);
        cb && cb({ ok: true, roomId: id });
    };

    const joinRoom = async ({ name, roomId }, cb) => {
        const id = roomId;
        const meta = await storage.getRoom(id);
        if (!meta) return cb && cb({ ok: false, error: 'Room not found' });

        const player = { name: name || 'Player', id: socket.id, score: 0 };
        await storage.setPlayer(id, socket.id, player);
        socket.join(id);
        socket.data.roomId = id;

        const currentPlayers = await gameManager.getPlayersList(id);
        socket.emit('players:update', currentPlayers);

        if (meta.started && meta.word) {
            if (meta.order && meta.order[meta.currentDrawerIndex]) {
                const drawerId = meta.order[meta.currentDrawerIndex];
                socket.emit('turn:start', {
                    drawer: drawerId,
                    time: meta.timeLeft,
                    round: meta.round
                });

                if (drawerId !== socket.id) {
                    socket.emit('word:mask', {
                        mask: gameManager.maskWord(meta.word, meta.revealed),
                        time: meta.timeLeft
                    });
                }
            }
        }

        io.to(id).emit('players:update', currentPlayers);
        io.to(id).emit('system:message', `${player.name} joined the room.`);
        cb && cb({ ok: true, roomId: id });
    };

    const leaveRoom = async (_, cb) => {
        const roomId = socket.data.roomId;
        if (!roomId) return cb && cb({ ok: false, error: 'Not in a room' });

        await handlePlayerLeave(roomId, socket.id);

        socket.leave(roomId);
        socket.data.roomId = null;

        cb && cb({ ok: true });
    };

    const getRoomState = async (_, cb) => {
        const roomId = socket.data.roomId;
        if (!roomId) return cb && cb({ ok: false, error: 'Not in a room' });

        const meta = await storage.getRoom(roomId);
        const players = await gameManager.getPlayersList(roomId);

        const state = {
            players,
            gameStarted: meta?.started || false,
            currentRound: meta?.round || 0,
            maxRounds: meta?.maxRounds || 3,
            timeLeft: meta?.timeLeft || 0,
            wordMask: meta?.word ? gameManager.maskWord(meta.word, meta.revealed || []) : '',
            isDrawer: meta?.order && meta?.order[meta?.currentDrawerIndex || 0] === socket.id
        };

        if (state.isDrawer && meta?.word) {
            state.wordPlain = meta.word;
        }

        if (meta?.order && meta?.order[meta?.currentDrawerIndex]) {
            const drawerPlayer = players.find(p => p.id === meta.order[meta.currentDrawerIndex]);
            state.drawerName = drawerPlayer?.name || 'Unknown';
        }

        cb && cb(state);

        io.to(roomId).emit('room:state', {
            maxRounds: meta?.maxRounds || 3,
            currentRound: meta?.round || 0,
            gameStarted: meta?.started || false
        });
    };

    const disconnect = async () => {
        const roomId = socket.data.roomId;
        if (!roomId) return;
        await handlePlayerLeave(roomId, socket.id);
    };

    socket.on('room:create', createRoom);
    socket.on('room:join', joinRoom);
    socket.on('room:leave', leaveRoom);
    socket.on('room:getState', getRoomState);
    socket.on('disconnect', disconnect);
};
