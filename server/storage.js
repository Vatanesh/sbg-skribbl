const { createClient } = require('redis');

class Storage {
    constructor() {
        this.isRedisConnected = false;
        this.memory = {
            rooms: new Map(),
            players: new Map(),
            strokes: new Map()
        };
        this.pubClient = null;
    }

    async init(redisUrl) {
        this.pubClient = createClient({ url: redisUrl });
        this.pubClient.on('error', (err) => {
            console.error('Redis Client Error', err);
            this.isRedisConnected = false;
        });

        try {
            await this.pubClient.connect();
            this.isRedisConnected = true;
            console.log('✅ Connected to Redis successfully');
        } catch (err) {
            console.error('❌ Redis connection failed, using in-memory storage:', err.message);
            this.isRedisConnected = false;
        }
        return this.pubClient;
    }

    getPubClient() {
        return this.pubClient;
    }

    // Room Meta
    async setRoom(roomId, data) {
        if (this.isRedisConnected) {
            return await this.pubClient.set(`room:${roomId}:meta`, JSON.stringify(data));
        }
        this.memory.rooms.set(roomId, data);
        return 'OK';
    }

    async getRoom(roomId) {
        if (this.isRedisConnected) {
            const data = await this.pubClient.get(`room:${roomId}:meta`);
            return data ? JSON.parse(data) : null;
        }
        return this.memory.rooms.get(roomId) || null;
    }

    async delRoom(roomId) {
        if (this.isRedisConnected) {
            return await this.pubClient.del(`room:${roomId}:meta`);
        }
        return this.memory.rooms.delete(roomId);
    }

    // Players
    async setPlayer(roomId, playerId, data) {
        if (this.isRedisConnected) {
            return await this.pubClient.hSet(`room:${roomId}:players`, playerId, JSON.stringify(data));
        }
        const roomPlayers = this.memory.players.get(roomId) || new Map();
        roomPlayers.set(playerId, data);
        this.memory.players.set(roomId, roomPlayers);
        return 1;
    }

    async getPlayer(roomId, playerId) {
        if (this.isRedisConnected) {
            const data = await this.pubClient.hGet(`room:${roomId}:players`, playerId);
            return data ? JSON.parse(data) : null;
        }
        const roomPlayers = this.memory.players.get(roomId) || new Map();
        return roomPlayers.get(playerId) || null;
    }

    async getAllPlayers(roomId) {
        if (this.isRedisConnected) {
            const data = await this.pubClient.hGetAll(`room:${roomId}:players`);
            return Object.values(data || {}).map(s => JSON.parse(s));
        }
        const roomPlayers = this.memory.players.get(roomId) || new Map();
        return Array.from(roomPlayers.values());
    }

    async delPlayer(roomId, playerId) {
        if (this.isRedisConnected) {
            return await this.pubClient.hDel(`room:${roomId}:players`, playerId);
        }
        const roomPlayers = this.memory.players.get(roomId) || new Map();
        const res = roomPlayers.delete(playerId);
        if (roomPlayers.size === 0) this.memory.players.delete(roomId);
        return res ? 1 : 0;
    }

    async delAllPlayers(roomId) {
        if (this.isRedisConnected) {
            return await this.pubClient.del(`room:${roomId}:players`);
        }
        return this.memory.players.delete(roomId);
    }

    // Strokes
    async addStroke(roomId, stroke) {
        if (this.isRedisConnected) {
            return await this.pubClient.rPush(`room:${roomId}:strokes`, JSON.stringify(stroke));
        }
        const strokes = this.memory.strokes.get(roomId) || [];
        strokes.push(stroke);
        this.memory.strokes.set(roomId, strokes);
        return strokes.length;
    }

    async getStrokes(roomId) {
        if (this.isRedisConnected) {
            const data = await this.pubClient.lRange(`room:${roomId}:strokes`, 0, -1);
            return data.map(s => JSON.parse(s));
        }
        return this.memory.strokes.get(roomId) || [];
    }

    async updateStroke(roomId, stroke) {
        // For update, we need to find and replace.
        // Redis lists aren't great for random access updates by ID without scanning.
        // Since we only have a few strokes usually, we can read all, update, and write back.
        // Or use a better data structure, but for now let's stick to the list for compatibility.

        const strokes = await this.getStrokes(roomId);
        const index = strokes.findIndex(s => s.id === stroke.id);
        if (index !== -1) {
            strokes[index] = stroke;

            if (this.isRedisConnected) {
                await this.pubClient.del(`room:${roomId}:strokes`);
                if (strokes.length > 0) {
                    // rPush accepts multiple arguments in newer redis clients, but let's be safe
                    for (const s of strokes) {
                        await this.pubClient.rPush(`room:${roomId}:strokes`, JSON.stringify(s));
                    }
                }
            } else {
                this.memory.strokes.set(roomId, strokes);
            }
            return true;
        }
        return false;
    }

    async delStrokes(roomId) {
        if (this.isRedisConnected) {
            return await this.pubClient.del(`room:${roomId}:strokes`);
        }
        return this.memory.strokes.delete(roomId);
    }
}

module.exports = new Storage();
