
import { Player } from '../store/gameStore';

interface PlayerListProps {
  players: Player[];
  currentDrawerId?: string;
  currentUserId?: string;
}

function PlayerList({ players = [], currentDrawerId, currentUserId }: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="players card">
      <h3>Players ({players.length})</h3>
      <ul className="players-list">
        {sortedPlayers.map((p, index) => (
          <li
            key={p.id}
            className={`player-item ${p.id === currentDrawerId ? 'current-drawer' : ''
              } ${p.id === currentUserId ? 'current-user' : ''
              }`}
          >
            <div className="player-info">
              <span className="player-rank">#{index + 1}</span>
              <span className="player-name">
                {p.id === currentUserId && '👤 '}
                {p.id === currentDrawerId && '🎨 '}
                {p.name}
              </span>
            </div>
            <span className="player-score">{p.score || 0} pts</span>
          </li>
        ))}
      </ul>
      {players.length === 0 && (
        <div className="empty-state">
          ⏳ Waiting for players to join...
        </div>
      )}
    </div>
  );
}

export default PlayerList;
