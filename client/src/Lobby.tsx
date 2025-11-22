import { useState } from 'react';
import { socket } from './socket';

interface LobbyProps {
  onJoin: (roomId: string) => void;
  name: string;
  setName: (name: string) => void;
}

export default function Lobby({ onJoin, name, setName }: LobbyProps) {
  const [room, setRoom] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Paste room ID from clipboard
  const pasteRoomId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRoom(text.trim());
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  };

  const create = async () => {
    setIsLoading(true);
    const n = name.trim() || `Player${Math.floor(Math.random() * 999)}`;
    localStorage.setItem('name', n);
    socket.emit('room:create', { name: n, roomId: room.trim() || undefined }, (res: any) => {
      setIsLoading(false);
      if (res.ok) onJoin(res.roomId);
      else alert(res.error || 'Failed to create room');
    });
  };

  const join = async () => {
    if (!room.trim()) {
      alert('Please enter a room ID to join');
      return;
    }
    setIsLoading(true);
    const n = name.trim() || `Player${Math.floor(Math.random() * 999)}`;
    localStorage.setItem('name', n);
    socket.emit('room:join', { name: n, roomId: room.trim() }, (res: any) => {
      setIsLoading(false);
      if (res.ok) onJoin(res.roomId);
      else alert(res.error || 'Failed to join room');
    });
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <div className="lobby-header">
          <div className="logo">
            <span className="logo-icon">🎨</span>
            <h1>Sketch & Guess</h1>
          </div>
          <p className="subtitle">Draw, guess, and have fun with friends!</p>
        </div>

        <div className="lobby-form">
          <div className="input-group">
            <label htmlFor="playerName">Your Name</label>
            <input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="input-group">
            <label htmlFor="roomId">Room ID</label>
            <div className="input-with-inner-button">
              <input
                id="roomId"
                type="text"
                placeholder="Leave blank to create new room"
                value={room}
                onChange={e => setRoom(e.target.value)}
                maxLength={10}
              />
              <button
                type="button"
                className="paste-button-inner"
                onClick={pasteRoomId}
                title="Paste Room ID"
              >
                📋
              </button>
            </div>
          </div>

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={create}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Creating...' : '🎮 Create Room'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={join}
              disabled={isLoading || !room.trim()}
            >
              {isLoading ? '⏳ Joining...' : '🚪 Join Room'}
            </button>
          </div>
        </div>

        <div className="lobby-features">
          <h3>Game Features</h3>
          <div className="features-grid">
            <div className="feature">
              <span className="feature-icon">📱</span>
              <span>Responsive Design</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🖌️</span>
              <span>Brush Controls</span>
            </div>
            <div className="feature">
              <span className="feature-icon">↩️</span>
              <span>Undo Function</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Live Chat</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔍</span>
              <span>Smart Hints</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🛡️</span>
              <span>Private Room</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
