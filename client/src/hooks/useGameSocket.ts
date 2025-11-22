import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../socket';
import { useGameStore, Player } from '../store/gameStore';
import { Message } from '../components/Chat';
import { useSoundEffects } from './useSoundEffects';

interface GameConfig {
    maxRounds: number;
    turnDuration: number;
}

interface UseGameSocketProps {
    roomId: string;
    onLeave: () => void;
}

export function useGameSocket({ roomId, onLeave }: UseGameSocketProps) {
    const { playSound, stopSound } = useSoundEffects();
    const [players, setPlayers] = useState<Player[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isDrawer, setIsDrawer] = useState(false);
    const [wordMask, setWordMask] = useState('');
    const [wordPlain, setWordPlain] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [maxRounds, setMaxRounds] = useState(3);
    const [gameStarted, setGameStarted] = useState(false);
    const [drawerName, setDrawerName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [roundStarting, setRoundStarting] = useState(false);
    const [wordOptions, setWordOptions] = useState<string[]>([]);
    const [showWordChoice, setShowWordChoice] = useState(false);
    const [wordSelectionTimeLeft, setWordSelectionTimeLeft] = useState(0);

    const {
        setGameStatus,
        setGameStarted: setStoreGameStarted,
        setMyTurn,
        setRoundInfo,
        resetGame
    } = useGameStore();

    // Refs for mutable state accessed in socket listeners
    const playersRef = useRef(players);
    const maxRoundsRef = useRef(maxRounds);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    useEffect(() => {
        maxRoundsRef.current = maxRounds;
    }, [maxRounds]);

    const addSystemMessage = useCallback((text: string) => {
        setMessages(m => [...m, { system: true, text, timestamp: Date.now() }]);
    }, []);

    // Word selection timer
    useEffect(() => {
        if (wordSelectionTimeLeft > 0 && showWordChoice) {
            const timer = setTimeout(() => {
                setWordSelectionTimeLeft(prev => {
                    const newTime = prev - 1;
                    if (newTime === 0 && wordOptions.length > 0) {
                        // Time's up! Auto-select random word
                        const randomWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
                        handleWordChoice(randomWord);
                        addSystemMessage(`Time's up! Auto-selected: ${randomWord}`);
                    }
                    return newTime;
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [wordSelectionTimeLeft, showWordChoice, wordOptions, addSystemMessage]);

    const handleWordChoice = useCallback((selectedWord: string) => {
        socket.emit('word:select', { word: selectedWord });
        setWordPlain(selectedWord);
        setShowWordChoice(false);
        setWordOptions([]);
        setWordSelectionTimeLeft(0); // Reset timer
        addSystemMessage(`You chose to draw: ${selectedWord}`);
    }, [addSystemMessage]);

    useEffect(() => {
        console.log('Setting up socket listeners for room:', roomId);

        // Socket event listeners
        socket.on('players:update', (p: Player[]) => {
            console.log('Players updated:', p, 'Current socket ID:', socket.id);

            // Play sounds for joins/leaves
            if (playersRef.current.length > 0) {
                const currentIds = new Set(playersRef.current.map(pl => pl.id));
                const newIds = new Set(p.map(pl => pl.id));

                const joined = p.filter(pl => !currentIds.has(pl.id));
                const left = playersRef.current.filter(pl => !newIds.has(pl.id));

                const othersJoined = joined.filter(pl => pl.id !== socket.id);

                if (othersJoined.length > 0) {
                    playSound('player-join');
                }
                if (left.length > 0) {
                    playSound('player-leave');
                }
            }

            setPlayers(p);
        });

        socket.on('room:state', (state: any) => {
            if (state.maxRounds) setMaxRounds(state.maxRounds);
            if (state.currentRound !== undefined) setCurrentRound(state.currentRound);
            if (state.gameStarted !== undefined) setGameStarted(state.gameStarted);
        });

        socket.on('system:message', (text: string) => {
            addSystemMessage(text);
        });

        socket.on('chat:message', (msg: Message) => {
            setMessages(m => [...m, { ...msg, timestamp: Date.now() }]);
        });

        socket.on('word:choose', ({ word }: { word: string }) => {
            setIsDrawer(true);
            setWordPlain(word);
            setMyTurn(true);
            addSystemMessage(`You are drawing: ${word}`);
        });

        socket.on('word:options', ({ options }: { options: string[] }) => {
            setWordOptions(options);
            setShowWordChoice(true);
            setIsDrawer(true);
            setMyTurn(true);
            setWordSelectionTimeLeft(5); // Start 5-second timer
        });

        socket.on('word:mask', ({ mask, time }: { mask: string; time?: number }) => {
            setWordMask(mask);
            if (time !== undefined) setTimeLeft(time);
        });

        socket.on('turn:start', ({ drawer, time, round, maxRounds: gameMaxRounds }: { drawer: string; time?: number; round?: number; maxRounds?: number }) => {
            setRoundStarting(true);
            setTimeout(() => setRoundStarting(false), 2000);

            const drawerPlayer = playersRef.current.find(p => p.id === drawer);
            setDrawerName(drawerPlayer?.name || 'Unknown');

            setIsDrawer(drawer === socket.id);
            setWordPlain(null);
            setTimeLeft(time || 60);
            setCurrentRound(round || 1);
            if (gameMaxRounds) setMaxRounds(gameMaxRounds);
            setGameStarted(true);

            setMyTurn(drawer === socket.id);
            setStoreGameStarted(true);
            setGameStatus('playing');
            setRoundInfo(round || 1, gameMaxRounds || maxRoundsRef.current);

            playSound('round-start');
            if (drawer === socket.id) {
                playSound('your-turn');
                addSystemMessage('It\'s your turn to draw!');
            } else {
                addSystemMessage(`${drawerPlayer?.name || 'Someone'} is drawing`);
            }
        });

        socket.on('timer:update', (t: number) => {
            setTimeLeft(t);
            if (t <= 10 && t > 0) {
                playSound('timer');
            } else if (t === 0) {
                stopSound('timer');
            }
        });

        socket.on('turn:end', ({ word }: { word: string }) => {
            stopSound('timer');
            setMessages(m => [...m, {
                system: true,
                text: `Turn ended. The word was: "${word}"`,
                timestamp: Date.now()
            }]);
            setWordMask('');
            setWordPlain(null);
            setIsDrawer(false);
            setMyTurn(false);
        });

        socket.on('clear', () => {
            useGameStore.getState().clearStrokes();
        });

        socket.on('game:end', ({ players: finalPlayers }: { players: Player[] }) => {
            addSystemMessage('Game ended!');
            stopSound('timer');
            playSound('game-end');

            const sortedPlayers = [...finalPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
            addSystemMessage(`Final Scores: ${sortedPlayers.map((p, i) =>
                `${i + 1}. ${p.name}: ${p.score || 0} points`
            ).join(', ')}`);

            setPlayers(finalPlayers);
            setGameStarted(false);
            setGameStatus('ended');
            setStoreGameStarted(false);
            resetGame();
        });

        console.log('Requesting initial game state...');
        socket.emit('room:getState', {}, (state: any) => {
            if (state?.players) {
                console.log('Received initial players:', state.players);
                setPlayers(state.players);
            }
            if (state?.gameStarted) {
                setGameStarted(state.gameStarted);
                if (state.currentRound) setCurrentRound(state.currentRound);
                if (state.timeLeft) setTimeLeft(state.timeLeft);
                if (state.wordMask) setWordMask(state.wordMask);
                if (state.drawerName) setDrawerName(state.drawerName);
                if (state.isDrawer !== undefined) setIsDrawer(state.isDrawer);
            }
        });

        return () => {
            socket.off('players:update');
            socket.off('system:message');
            socket.off('chat:message');
            socket.off('word:choose');
            socket.off('word:options');
            socket.off('word:mask');
            socket.off('turn:start');
            socket.off('timer:update');
            socket.off('turn:end');
            socket.off('clear');
            socket.off('game:end');
        };
    }, [addSystemMessage, setGameStatus, setStoreGameStarted, setMyTurn, setRoundInfo, resetGame, playSound, stopSound, roomId]);

    const sendStart = useCallback(async (configRounds: number, configDuration: number) => {
        if (players.length < 2) {
            alert('Need at least 2 players to start the game');
            return;
        }
        setIsLoading(true);

        const gameConfig: GameConfig = {
            maxRounds: configRounds,
            turnDuration: configDuration
        };

        console.log('🎮 Sending game config:', gameConfig);

        socket.emit('game:start', gameConfig, (res: any) => {
            setIsLoading(false);
            if (!res?.ok) {
                alert(res?.error || 'Failed to start game');
            }
        });
    }, [players.length]);

    const sendMessage = useCallback((text: string) => {
        socket.emit('chat:message', { message: text });
    }, []);

    const handleLeave = useCallback(() => {
        if (gameStarted && !confirm('Are you sure you want to leave the game?')) {
            return;
        }

        socket.emit('room:leave', {}, () => {
            resetGame();
            onLeave();
        });
    }, [gameStarted, resetGame, onLeave]);

    return {
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
        handleLeave,
        addSystemMessage
    };
}
