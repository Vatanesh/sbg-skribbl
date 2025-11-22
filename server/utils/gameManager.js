const storage = require('../storage');
const fs = require('fs');
const path = require('path');

const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, '../words.json'), 'utf8'));

class GameManager {
    constructor() {
        this.timers = new Map();
    }

    async getPlayersList(roomId) {
        const players = await storage.getAllPlayers(roomId);
        return players.map(p => ({ name: p.name, score: p.score || 0, id: p.id }));
    }

    maskWord(word, revealed = []) {
        return [...word].map((ch, i) => ch === ' ' ? ' ' : (revealed.includes(i) ? ch : '_')).join('');
    }

    revealOne(word, revealed) {
        const candidates = [];
        for (let i = 0; i < word.length; i++) {
            if (word[i] !== ' ' && !revealed.includes(i)) candidates.push(i);
        }
        if (!candidates.length) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    async startNextTurn(io, roomId) {
        const meta = await storage.getRoom(roomId);
        if (!meta) return;

        const players = await storage.getAllPlayers(roomId);
        const order = players.map(p => p.id);
        if (!order.length) return;

        const previousDrawerIndex = meta.currentDrawerIndex !== undefined ? meta.currentDrawerIndex : -1;
        meta.currentDrawerIndex = (previousDrawerIndex + 1) % order.length;

        if (!meta.started) {
            if (order.length < 2) {
                console.log('⚠️ Not enough players to start game:', order.length);
                return;
            }
            meta.round = 1;
            console.log('🎮 Starting game - Round 1');
        } else if (previousDrawerIndex === order.length - 1 && meta.currentDrawerIndex === 0) {
            meta.round = (meta.round || 1) + 1;
            console.log('🔄 Round completed! Now starting round:', meta.round);
        }

        console.log('👤 Current drawer index:', meta.currentDrawerIndex, 'of', order.length, 'players');
        console.log('🎯 Round:', meta.round, '/', meta.maxRounds);

        if (meta.round > (meta.maxRounds || 3)) {
            console.log('🏁 Game should end! Round', meta.round, '>', meta.maxRounds);
            io.to(roomId).emit('game:end', { players: await this.getPlayersList(roomId) });
            meta.started = false;
            meta.round = 0;
            meta.currentDrawerIndex = -1;
            await storage.setRoom(roomId, meta);
            return;
        }

        meta.order = order;
        const drawer = order[meta.currentDrawerIndex];

        const wordOptions = [];
        const usedIndices = new Set();
        while (wordOptions.length < 3) {
            const randomIndex = Math.floor(Math.random() * WORDS.length);
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                wordOptions.push(WORDS[randomIndex]);
            }
        }

        meta.timeLeft = meta.turnDuration || 60;
        meta.started = true;
        meta.correctGuessers = [];

        console.log('⏱️ Turn starting with duration:', meta.timeLeft, 'seconds');

        await storage.setRoom(roomId, meta);

        io.to(roomId).emit('clear');
        await storage.delStrokes(roomId);

        io.to(roomId).emit('turn:start', { drawer, time: meta.timeLeft, round: meta.round, maxRounds: meta.maxRounds });
        io.to(drawer).emit('word:options', { options: wordOptions });
    }

    async endTurn(io, roomId) {
        const m = await storage.getRoom(roomId);
        if (!m) return;

        if (this.timers.has(roomId)) {
            clearInterval(this.timers.get(roomId));
            this.timers.delete(roomId);
        }

        io.to(roomId).emit('clear');
        await storage.delStrokes(roomId);

        io.to(roomId).emit('turn:end', { word: m.word });
        m.word = null;
        m.revealed = [];
        m.correctGuessers = [];

        await storage.setRoom(roomId, m);
        setTimeout(() => this.startNextTurn(io, roomId), 2000);
    }

    async handleWordSelection(io, roomId, word) {
        const meta = await storage.getRoom(roomId);
        if (!meta) return;

        meta.word = word;
        meta.revealed = [];
        await storage.setRoom(roomId, meta);

        io.to(roomId).emit('word:mask', { mask: this.maskWord(meta.word, meta.revealed), time: meta.timeLeft });

        if (this.timers.has(roomId)) {
            clearInterval(this.timers.get(roomId));
            this.timers.delete(roomId);
        }

        const id = setInterval(async () => {
            const m = await storage.getRoom(roomId);
            if (!m) { clearInterval(id); return; }

            m.timeLeft -= 1;
            await storage.setRoom(roomId, m);
            io.to(roomId).emit('timer:update', m.timeLeft);

            const totalDuration = m.turnDuration || 60;
            const firstReveal = Math.floor(totalDuration * 2 / 3);
            const secondReveal = Math.floor(totalDuration / 3);

            if (m.timeLeft === firstReveal || m.timeLeft === secondReveal) {
                const idx = this.revealOne(m.word, m.revealed);
                if (idx !== null) {
                    m.revealed.push(idx);
                    await storage.setRoom(roomId, m);
                    io.to(roomId).emit('word:mask', { mask: this.maskWord(m.word, m.revealed), time: m.timeLeft });
                }
            }

            if (m.timeLeft <= 0) {
                clearInterval(id);
                io.to(roomId).emit('clear');
                await storage.delStrokes(roomId);

                io.to(roomId).emit('turn:end', { word: m.word });
                m.word = null;
                m.revealed = [];
                m.correctGuessers = [];

                await storage.setRoom(roomId, m);
                setTimeout(() => this.startNextTurn(io, roomId), 2000);
            }
        }, 1000);

        this.timers.set(roomId, id);
    }

    async resetScores(io, roomId) {
        const players = await storage.getAllPlayers(roomId);
        for (const player of players) {
            player.score = 0;
            await storage.setPlayer(roomId, player.id, player);
        }
        io.to(roomId).emit('players:update', await this.getPlayersList(roomId));
    }

    cleanupRoom(roomId) {
        if (this.timers.has(roomId)) {
            clearInterval(this.timers.get(roomId));
            this.timers.delete(roomId);
        }
    }
}

module.exports = new GameManager();
