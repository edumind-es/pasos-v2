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

import { Palette } from 'lucide-react';
import { useStore } from '../store/boardStore';

export function VisualModeToggle() {
    const { visualMode, setVisualMode } = useStore();
    const isEink = visualMode === 'eink';
    const nextMode = isEink ? 'edumind' : 'eink';
    const label = isEink ? 'EDUmind' : 'E-Ink';
    const title = isEink
        ? 'Cambiar a modo EDUmind (color)'
        : 'Cambiar a modo E-Ink';

    return (
        <button
            onClick={() => setVisualMode(nextMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-line hover:bg-white/5 transition-colors text-sm font-medium"
            title={title}
            aria-label={title}
        >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
