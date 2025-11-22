const storage = require('../storage');

module.exports = (io, socket) => {
    const handleStroke = async ({ roomId, stroke }) => {
        await storage.addStroke(roomId, stroke);
        socket.to(roomId).emit('stroke', stroke);
    };

    const handleStrokeUpdate = async ({ roomId, stroke }) => {
        const updated = await storage.updateStroke(roomId, stroke);
        if (updated) {
            io.to(roomId).emit('stroke:update', stroke);
        }
    };

    const handleUndo = async ({ roomId, strokeId }) => {
        const strokes = await storage.getStrokes(roomId);
        const filtered = strokes.filter(s => s.id !== strokeId);

        await storage.delStrokes(roomId);
        for (const s of filtered) {
            await storage.addStroke(roomId, s);
        }

        socket.to(roomId).emit('undo', { strokeId });
    };

    const handleClear = async ({ roomId }) => {
        await storage.delStrokes(roomId);
        socket.to(roomId).emit('clear');
    };

    socket.on('stroke', handleStroke);
    socket.on('stroke:update', handleStrokeUpdate);
    socket.on('undo', handleUndo);
    socket.on('clear', handleClear);
};
