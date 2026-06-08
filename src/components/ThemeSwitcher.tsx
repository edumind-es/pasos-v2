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
import { Palette } from 'lucide-react';
import { useStore } from '../store/boardStore';
import { themes, applyTheme, type ThemeName } from '../utils/themes';

export function ThemeSwitcher() {
    const { currentTheme, setTheme } = useStore();

    // Apply theme on mount and when it changes
    useEffect(() => {
        const theme = themes[currentTheme];
        applyTheme(theme);
    }, [currentTheme]);

    const handleThemeChange = (themeName: ThemeName) => {
        setTheme(themeName);
    };

    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-line hover:bg-white/5 transition-colors">
            <Palette className="w-4 h-4 text-lme-text-secondary" />
            <select
                value={currentTheme}
                onChange={(e) => handleThemeChange(e.target.value as ThemeName)}
                className="bg-transparent text-sm font-medium text-lme-text cursor-pointer focus:outline-none"
            >
                {Object.values(themes).map((theme) => (
                    <option key={theme.name} value={theme.name} className="bg-lme-surface text-lme-text">
                        {theme.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
