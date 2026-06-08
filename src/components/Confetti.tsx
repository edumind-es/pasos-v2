/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from 'react';

interface ConfettiPiece {
    id: number;
    left: string;
    color: string;
    delay: string;
    size: string;
    shape: 'round' | 'square';
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

function createConfettiPieces(): ConfettiPiece[] {
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 50; i++) {
        newPieces.push({
            id: i,
            left: `${Math.random() * 100}%`,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            delay: `${Math.random() * 0.5}s`,
            size: `${Math.random() * 8 + 6}px`,
            shape: Math.random() > 0.5 ? 'round' : 'square',
        });
    }

    return newPieces;
}

export function Confetti({ onComplete }: { onComplete?: () => void }) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>(() => createConfettiPieces());

    useEffect(() => {
        // Clean up after animation
        const timer = setTimeout(() => {
            setPieces([]);
            onComplete?.();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-top">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                        left: piece.left,
                        backgroundColor: piece.color,
                        width: piece.size,
                        height: piece.size,
                        animationDelay: piece.delay,
                        borderRadius: piece.shape === 'round' ? '50%' : '2px',
                    }}
                />
            ))}
        </div>
    );
}
