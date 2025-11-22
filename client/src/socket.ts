import { io, Socket } from "socket.io-client";
const SERVER: string = import.meta.env.VITE_SERVER || "http://localhost:3001";
export const socket: Socket = io(SERVER, { autoConnect: true });
