import { useEffect, useCallback } from 'react';
import { soundManager, SoundType } from '../utils/SoundManager';

/**
 * Custom hook for managing sound effects in components
 * Provides only the playSound method after removing volume controls.
 */
export function useSoundEffects() {
    // Initialize sound manager on mount
    useEffect(() => {
        soundManager.initialize();
    }, []);

    /** Play a sound effect */
    const playSound = useCallback((soundType: SoundType) => {
        soundManager.play(soundType);
    }, []);

    /** Stop a sound effect */
    const stopSound = useCallback((soundType: SoundType) => {
        soundManager.stop(soundType);
    }, []);

    return { playSound, stopSound };
}
