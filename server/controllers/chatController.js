const storage = require('../storage');
const gameManager = require('../utils/gameManager');

module.exports = (io, socket) => {
    const handleMessage = async ({ message }, cb) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const player = await storage.getPlayer(roomId, socket.id) || { name: 'Anon' };
        const meta = await storage.getRoom(roomId);

        const isDrawer = meta && meta.order && meta.order[meta.currentDrawerIndex] === socket.id;

        if (isDrawer && meta && meta.word) {
            return cb && cb({ ok: false, error: 'Drawers cannot send messages during their turn' });
        }

        const isCorrectGuess = meta && meta.word && message.trim().toLowerCase() === meta.word.toLowerCase();

        if (isCorrectGuess && !isDrawer) {
            if (!meta.correctGuessers) {
                meta.correctGuessers = [];
            }

            if (meta.correctGuessers.includes(socket.id)) {
                socket.emit('chat:message', {
                    from: player.name,
                    message: message,
                    isCorrectGuess: true,
                    senderId: socket.id,
                    timestamp: Date.now()
                });
                return cb && cb({ ok: true });
            }

            const points = Math.max(50, Math.floor(100 * (meta.timeLeft / 60)));

            const guesser = await storage.getPlayer(roomId, socket.id);
            if (guesser) {
                guesser.score = (guesser.score || 0) + points;
                await storage.setPlayer(roomId, socket.id, guesser);
            }

            const drawerId = meta.order[meta.currentDrawerIndex];
            const drawer = await storage.getPlayer(roomId, drawerId);
            if (drawer) {
                drawer.score = (drawer.score || 0) + Math.floor(points / 2);
                await storage.setPlayer(roomId, drawerId, drawer);
            }

            meta.correctGuessers.push(socket.id);
            await storage.setRoom(roomId, meta);

            socket.emit('chat:message', {
                from: player.name,
                message: message,
                isCorrectGuess: true,
                senderId: socket.id,
                timestamp: Date.now()
            });

            io.to(roomId).emit('system:message', `${player.name} guessed the word!`);
            io.to(roomId).emit('players:update', await gameManager.getPlayersList(roomId));

            const allPlayers = await gameManager.getPlayersList(roomId);
            const nonDrawerPlayers = allPlayers.filter(p => p.id !== drawerId);
            const allGuessedCorrectly = nonDrawerPlayers.every(p => meta.correctGuessers.includes(p.id));

            if (allGuessedCorrectly) {
                io.to(roomId).emit('system:message', `Everyone guessed the word! It was "${meta.word}"`);
                await gameManager.endTurn(io, roomId);
            }
        } else {
            const chatMessage = {
                from: player.name,
                message: message,
                senderId: socket.id,
                timestamp: Date.now()
            };

            io.to(roomId).emit('chat:message', chatMessage);
        }

        cb && cb({ ok: true });
    };

    socket.on('chat:message', handleMessage);
};
