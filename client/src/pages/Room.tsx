import { useEffect, useState, useCallback } from 'react';
import { socket } from '../socket';
import DrawingBoard from '../components/DrawingBoard';
import BrushControls from '../components/BrushControls';
import PlayerList from '../components/PlayerList';
import Chat from '../components/Chat';
import Leaderboard from '../components/Leaderboard';
import { useGameSocket } from '../hooks/useGameSocket';

interface RoomProps {
  roomId: string;
  onLeave: () => void;
}

export default function Room({ roomId, onLeave }: RoomProps) {
  const [configRounds, setConfigRounds] = useState(3);
  const [configDuration, setConfigDuration] = useState(60);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const {
    players,
    messages,
    isDrawer,
    wordMask,
    wordPlain,
    timeLeft,
    currentRound,
    maxRounds,
    gameStarted,
    drawerName,
    isLoading,
    roundStarting,
    wordOptions,
    showWordChoice,
    wordSelectionTimeLeft,
    handleWordChoice,
    sendStart,
    sendMessage,
    handleLeave
  } = useGameSocket({ roomId, onLeave });

  // Copy room ID to clipboard
  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  }, [roomId]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current player info
  const isHost = players.length > 0 && players[0].id === socket.id;

  // Toggle leaderboard with Tab key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowLeaderboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-show leaderboard when game ends
  useEffect(() => {
    if (!gameStarted && messages.some(m => m.text === 'Game ended!')) {
      setShowLeaderboard(true);
    } else if (gameStarted) {
      setShowLeaderboard(false);
    }
  }, [gameStarted, messages]);

  return (
    <div className="room-wrap">
      <header className="room-header">
        <div className="room-info">
          <div className="room-id-section">
            <div className="room-title">Room: {roomId}</div>
            <button
              className="copy-button"
              onClick={copyRoomId}
              title="Copy Room ID"
            >
              📋
            </button>
          </div>
          {gameStarted && (
            <div className="game-info">
              <span className="round-info">Round {currentRound}/{maxRounds}</span>
              {drawerName && <span className="drawer-info">Drawer: {drawerName}</span>}
            </div>
          )}
        </div>
        <div className="controls">
          <div className={`timer ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          {isHost && !gameStarted && (
            <div className="game-config">
              <div className="config-group">
                <label htmlFor="rounds">Rounds:</label>
                <select
                  id="rounds"
                  value={configRounds}
                  onChange={e => setConfigRounds(parseInt(e.target.value))}
                  className="config-select"
                >
                  <option value={2}>2 Rounds</option>
                  <option value={3}>3 Rounds</option>
                  <option value={4}>4 Rounds</option>
                  <option value={5}>5 Rounds</option>
                </select>
              </div>
              <div className="config-group">
                <label htmlFor="duration">Draw Time:</label>
                <select
                  id="duration"
                  value={configDuration}
                  onChange={e => setConfigDuration(parseInt(e.target.value))}
                  className="config-select"
                >
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                  <option value={120}>2 minutes</option>
                </select>
              </div>
            </div>
          )}
          {isHost && !gameStarted && (
            <button
              onClick={() => sendStart(configRounds, configDuration)}
              disabled={isLoading || players.length < 2}
              className="btn btn-primary"
            >
              {isLoading ? '⏳ Starting...' : players.length < 2 ? 'Need 2+ Players' : '🎮 Start Game'}
            </button>
          )}
          <button
            onClick={handleLeave}
            className="btn btn-secondary"
          >
            🚪 Leave
          </button>
        </div>
      </header>

      {roundStarting && (
        <div className="round-overlay">
          <div className="round-announcement">
            <h2>Round {currentRound}</h2>
            <p>{isDrawer ? 'Get ready to draw!' : `${drawerName} is drawing`}</p>
          </div>
        </div>
      )}

      {showWordChoice && (
        <div className="word-choice-overlay">
          <div className="word-choice-popup">
            <div className="word-choice-header">
              <h3>🎨 Choose your word</h3>
              <p>Pick a word to draw for this round</p>
              {wordSelectionTimeLeft > 0 && (
                <div className={`word-timer ${wordSelectionTimeLeft <= 2 ? 'timer-warning' : ''}`}>
                  ⏰ {wordSelectionTimeLeft}s remaining
                </div>
              )}
            </div>
            <div className="word-options">
              {wordOptions.map((word) => (
                <button
                  key={word}
                  className="word-option-btn"
                  onClick={() => handleWordChoice(word)}
                >
                  {word}
                </button>
              ))}
            </div>
            <div className="word-choice-footer">
              <p>Choose wisely! Others will try to guess your drawing.</p>
            </div>
          </div>
        </div>
      )}

      <div className="room-main">
        <div className="left-col">
          <div className="canvas-wrap card">
            {/* Canvas Header with Word Display */}
            <div className="canvas-header">
              {isDrawer && wordPlain ? (
                <div className="word-display drawer-word">
                  <div className="word-label">📝 Your word:</div>
                  <div className="word-text">{wordPlain}</div>
                  <div className="word-length">{wordPlain.length} letters</div>
                </div>
              ) : wordMask ? (
                <div className="word-display guess-word">
                  <div className="word-label">🔍 Guess the word:</div>
                  <div className="word-mask-display">
                    {wordMask.split('').map((char, i) => (
                      <span key={i} className={`word-char ${char !== '_' && char !== ' ' ? 'revealed' : ''}`}>
                        {char === ' ' ? '\u00A0\u00A0' : char}
                      </span>
                    ))}
                  </div>
                  <div className="word-length">{wordMask.replace(/\s/g, '').length} letters</div>
                </div>
              ) : !gameStarted ? (
                <div className="word-display waiting-word">
                  <div className="word-label">
                    {isHost ? '👑 You are the host' : '⏳ Waiting for host'}
                  </div>
                  <div className="word-text">
                    {isHost ? 'Click Start Game when ready!' : 'Game will start soon...'}
                  </div>
                </div>
              ) : (
                <div className="word-display waiting-word">
                  <div className="word-label">🎨 Game in progress</div>
                  <div className="word-text">Get ready for the next round!</div>
                </div>
              )}
            </div>

            <DrawingBoard roomId={roomId} isDrawer={isDrawer} />
            <BrushControls roomId={roomId} isDrawer={isDrawer} />
            <Leaderboard
              players={players}
              currentUserId={socket.id}
              isVisible={showLeaderboard}
            />
            {!showLeaderboard && (
              <div className="leaderboard-hint">
                Press <kbd>Tab</kbd> to view leaderboard
              </div>
            )}
          </div>
        </div>
        <div className="right-col">
          <PlayerList
            players={players}
            currentDrawerId={isDrawer ? socket.id : undefined}
            currentUserId={socket.id}
          />
          <Chat
            messages={messages}
            onSendMessage={sendMessage}
            isDisabled={isDrawer}
            isDrawer={isDrawer}
          />
        </div>
      </div>
    </div>
  );
}
