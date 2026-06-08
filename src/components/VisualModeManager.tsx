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

import { useEffect } from 'react';
import { useStore } from '../store/boardStore';

type EinkMode = 'normal' | 'night' | 'dark';

const applyEinkMode = (mode: EinkMode) => {
    const html = document.documentElement;
    html.classList.remove('eink-night', 'eink-dark');

    if (mode === 'night') {
        html.classList.add('eink-night');
    } else if (mode === 'dark') {
        html.classList.add('eink-dark');
    }
};

export function VisualModeManager() {
    const { visualMode } = useStore();

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;

        if (visualMode === 'eink') {
            html.classList.add('eink');
            body.classList.add('eink-body');

            const savedMode = (localStorage.getItem('eink-mode') as EinkMode | null) ?? 'normal';
            applyEinkMode(savedMode);
        } else {
            html.classList.remove('eink', 'eink-night', 'eink-dark');
            body.classList.remove('eink-body');
        }
    }, [visualMode]);

    return null;
}
