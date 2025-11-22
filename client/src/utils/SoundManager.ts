export type SoundType =
    | 'correct-guess'
    | 'your-turn'
    | 'round-start'
    | 'timer-warning'
    | 'game-end'
    | 'player-join'
    | 'player-leave'
    | 'chat-message'
    | 'click'
    | 'timer';

interface SoundConfig {
    volume: number; // 0-100, max volume by default
    muted: boolean;
}

class SoundManager {
    private sounds: Map<SoundType, HTMLAudioElement> = new Map();
    private config: SoundConfig = {
        volume: 100,
        muted: false,
    };
    private activeSounds: Map<SoundType, Set<HTMLAudioElement>> = new Map();
    private initialized = false;

    constructor() {
        this.loadConfig();
    }

    /** Load user preferences from localStorage */
    private loadConfig(): void {
        try {
            const saved = localStorage.getItem('soundConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load sound config:', error);
        }
    }

    /** Save user preferences to localStorage */
    private saveConfig(): void {
        try {
            localStorage.setItem('soundConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Failed to save sound config:', error);
        }
    }

    /** Initialize and preload all sound files */
    public initialize(): void {
        if (this.initialized) return;
        const soundFiles: SoundType[] = [
            'correct-guess',
            'your-turn',
            'round-start',
            'timer-warning',
            'game-end',
            'player-join',
            'player-leave',
            'chat-message',
            'click',
            'timer',
        ];
        soundFiles.forEach((type) => {
            try {
                const audio = new Audio(`/sounds/${type}.mp3`);
                audio.preload = 'auto';
                audio.volume = this.config.volume / 100;
                this.sounds.set(type, audio);
            } catch (e) {
                console.warn(`Failed to load sound: ${type}`, e);
            }
        });
        this.initialized = true;
    }

    /** Play a sound effect */
    public play(soundType: SoundType): void {
        if (this.config.muted) return;
        const audio = this.sounds.get(soundType);
        if (!audio) {
            console.warn(`Sound not found: ${soundType}`);
            return;
        }
        try {
            const clone = audio.cloneNode() as HTMLAudioElement;
            clone.volume = this.config.volume / 100;

            // Track active sound
            if (!this.activeSounds.has(soundType)) {
                this.activeSounds.set(soundType, new Set());
            }
            this.activeSounds.get(soundType)?.add(clone);

            // Cleanup when done
            clone.onended = () => {
                this.activeSounds.get(soundType)?.delete(clone);
            };

            clone.play().catch((err) => {
                if (err.name !== 'NotAllowedError') {
                    console.warn(`Failed to play sound: ${soundType}`, err);
                }
                // Cleanup on error
                this.activeSounds.get(soundType)?.delete(clone);
            });
        } catch (err) {
            console.warn(`Error playing sound: ${soundType}`, err);
        }
    }

    /** Stop all instances of a specific sound type */
    public stop(soundType: SoundType): void {
        const active = this.activeSounds.get(soundType);
        if (active) {
            active.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            active.clear();
        }
    }

    /** Set volume (0-100) */
    public setVolume(volume: number): void {
        this.config.volume = Math.max(0, Math.min(100, volume));
        this.sounds.forEach((audio) => (audio.volume = this.config.volume / 100));
        this.saveConfig();
    }

    /** Get current volume */
    public getVolume(): number {
        return this.config.volume;
    }

    /** Toggle mute */
    public toggleMute(): boolean {
        this.config.muted = !this.config.muted;
        this.saveConfig();
        return this.config.muted;
    }

    /** Set mute */
    public setMuted(muted: boolean): void {
        this.config.muted = muted;
        this.saveConfig();
    }

    /** Get mute state */
    public isMuted(): boolean {
        return this.config.muted;
    }

    /** Cleanup all audio elements */
    public cleanup(): void {
        this.sounds.forEach((audio) => {
            audio.pause();
            audio.src = '';
        });

        // Stop all active clones
        this.activeSounds.forEach(set => {
            set.forEach(audio => audio.pause());
            set.clear();
        });
        this.activeSounds.clear();

        this.sounds.clear();
        this.initialized = false;
    }
}

export const soundManager = new SoundManager();
