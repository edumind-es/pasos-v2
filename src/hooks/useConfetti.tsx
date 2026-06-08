import { useState } from 'react';
import { Confetti } from '../components/Confetti';

export function useConfetti() {
    const [showConfetti, setShowConfetti] = useState(false);

    const triggerConfetti = () => {
        setShowConfetti(true);
    };

    const ConfettiComponent = showConfetti ? (
        <Confetti onComplete={() => setShowConfetti(false)} />
    ) : null;

    return { triggerConfetti, ConfettiComponent };
}
