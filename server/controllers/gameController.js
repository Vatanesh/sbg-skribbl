const storage = require('../storage');
const gameManager = require('../utils/gameManager');

module.exports = (io, socket) => {
    const startGame = async (data, cb) => {
        const roomId = socket.data.roomId;
        if (!roomId) return cb && cb({ ok: false, error: 'not in room' });

        const meta = await storage.getRoom(roomId);
        if (!meta) return cb && cb({ ok: false, error: 'room not found' });

        console.log('🎮 Game start received:', data);

        meta.round = 0;
        meta.currentDrawerIndex = -1;
        meta.maxRounds = data?.maxRounds || 3;
        meta.turnDuration = data?.turnDuration || 60;
        meta.started = false;

        console.log('🎮 Game config set:', {
            maxRounds: meta.maxRounds,
            turnDuration: meta.turnDuration
        });

        await storage.setRoom(roomId, meta);
        await gameManager.resetScores(io, roomId);
        await gameManager.startNextTurn(io, roomId);
        cb && cb({ ok: true });
    };

    const selectWord = async ({ word }) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const meta = await storage.getRoom(roomId);
        if (!meta || !meta.order || meta.order[meta.currentDrawerIndex] !== socket.id) {
            return;
        }

        await gameManager.handleWordSelection(io, roomId, word);
    };

    socket.on('game:start', startGame);
    socket.on('word:select', selectWord);
};
