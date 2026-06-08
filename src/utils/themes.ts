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

// Theme definitions for Pasos
// Ahora solo usamos el tema profesional - Los estilos E-Ink se controlan por separado
export type ThemeName = 'professional';

export interface Theme {
    name: ThemeName;
    label: string;
    colors: {
        background: string;
        surface: string;
        surfaceAlt: string;
        primary: string;
        primaryDark: string;
        secondary: string;
        text: string;
        textSecondary: string;
        border: string;
        mint: string;
        sky: string;
        sunset: string;
    };
    typography: {
        baseFontSize: string;
        headingScale: number;
        fontFamily: string;
    };
    spacing: {
        cardPadding: string;
        columnGap: string;
    };
    effects: {
        borderRadius: string;
        shadowIntensity: 'light' | 'medium' | 'strong';
    };
}

export const themes: Record<ThemeName, Theme> = {
    professional: {
        name: 'professional',
        label: 'Profesional',
        colors: {
            background: '#0a0612',
            surface: '#1a1625',
            surfaceAlt: '#252135',
            primary: '#00d9a3',
            primaryDark: '#00b386',
            secondary: '#00b4d8',
            text: '#e8e6f0',
            textSecondary: '#a8a6b8',
            border: '#3a3750',
            mint: '#00d9a3',
            sky: '#00b4d8',
            sunset: '#ff6b9d',
        },
        typography: {
            baseFontSize: '16px',
            headingScale: 1.25,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        spacing: {
            cardPadding: '1rem',
            columnGap: '1.5rem',
        },
        effects: {
            borderRadius: '1rem',
            shadowIntensity: 'medium',
        },
    },
};

// Apply theme to document
export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
        const cssVarName = `--lme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
    });

    root.style.setProperty('--base-font-size', theme.typography.baseFontSize);
    root.style.setProperty('--heading-scale', theme.typography.headingScale.toString());
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    root.style.setProperty('--card-padding', theme.spacing.cardPadding);
    root.style.setProperty('--column-gap', theme.spacing.columnGap);
    root.style.setProperty('--border-radius', theme.effects.borderRadius);

    // Update body class for theme-specific styles
    document.body.className = document.body.className
        .split(' ')
        .filter(c => !c.startsWith('theme-'))
        .concat(`theme-${theme.name}`)
        .join(' ');
};

// Get saved theme from localStorage - Ahora siempre retorna 'professional'
export const getSavedTheme = (): ThemeName => {
    return 'professional';
};

// Save theme to localStorage
export const saveTheme = (themeName: ThemeName) => {
    localStorage.setItem('pasos-theme', themeName);
};
