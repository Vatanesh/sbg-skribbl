import { useState } from 'react';
import Lobby from './Lobby';
import Room from './pages/Room';

export default function App() {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [name, setName] = useState(localStorage.getItem('name') || '');

    return roomId ? (
        <Room
            roomId={roomId}

            onLeave={() => setRoomId(null)}
        />
    ) : (
        <Lobby
            onJoin={(rid) => setRoomId(rid)}
            name={name}
            setName={setName}
        />
    );
}