import { Player } from '../store/gameStore';

interface LeaderboardProps {
    players: Player[];
    currentUserId?: string;
    isVisible: boolean;
}

function Leaderboard({ players = [], currentUserId, isVisible }: LeaderboardProps) {
    if (!isVisible || players.length === 0) return null;

    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topPlayers = sortedPlayers.slice(0, 5); // Show top 5 players

    return (
        <div className="leaderboard-overlay">
            <div className="leaderboard-card">
                <div className="leaderboard-header">
                    <h3>🏆 Leaderboard</h3>
                </div>
                <div className="leaderboard-list">
                    {topPlayers.map((player, index) => (
                        <div
                            key={player.id}
                            className={`leaderboard-item ${player.id === currentUserId ? 'current-user' : ''}`}
                        >
                            <div className="rank">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>
                            <div className="player-name">
                                {player.id === currentUserId && '👤 '}
                                {player.name}
                            </div>
                            <div className="score">{player.score || 0}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;
