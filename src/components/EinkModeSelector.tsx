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

import { useState, useEffect } from 'react';
import { useStore } from '../store/boardStore';

type EinkMode = 'normal' | 'night' | 'dark';

export function EinkModeSelector() {
    const { visualMode } = useStore();
    const [mode, setMode] = useState<EinkMode>(() => {
        const savedMode = localStorage.getItem('eink-mode');
        return savedMode === 'night' || savedMode === 'dark' || savedMode === 'normal'
            ? savedMode
            : 'normal';
    });

    const applyMode = (newMode: EinkMode) => {
        const html = document.documentElement;
        html.classList.remove('eink-night', 'eink-dark');

        if (newMode === 'night') {
            html.classList.add('eink-night');
        } else if (newMode === 'dark') {
            html.classList.add('eink-dark');
        }

        localStorage.setItem('eink-mode', newMode);
    };

    useEffect(() => {
        if (visualMode === 'eink') {
            applyMode(mode);
        }
    }, [mode, visualMode]);

    if (visualMode !== 'eink') {
        return null;
    }

    const handleModeChange = (newMode: EinkMode) => {
        setMode(newMode);
        applyMode(newMode);
    };

    return (
        <div className="eink-mode-selector">
            <button
                onClick={() => handleModeChange('normal')}
                className={mode === 'normal' ? 'active' : ''}
                title="Modo Día"
                aria-label="Modo Día"
            >
                Día
            </button>
            <span className="separator">|</span>
            <button
                onClick={() => handleModeChange('night')}
                className={mode === 'night' ? 'active' : ''}
                title="Modo Noche (menos luz azul)"
                aria-label="Modo Noche"
            >
                Noche
            </button>
            <span className="separator">|</span>
            <button
                onClick={() => handleModeChange('dark')}
                className={mode === 'dark' ? 'active' : ''}
                title="Modo Oscuro"
                aria-label="Modo Oscuro"
            >
                Oscuro
            </button>
        </div>
    );
}

export default EinkModeSelector;
