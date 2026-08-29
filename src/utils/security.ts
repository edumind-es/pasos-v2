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

/*
 * Utilidades de saneamiento y validación del frontend.
 *
 * Nota: aquí no hay cifrado. El cifrado en cliente con una clave incluida en
 * el bundle es solo decorativo; la protección real de los datos Pro la da el
 * backend (sesión httpOnly + CSRF). Se eliminó crypto-js por ese motivo.
 */

/**
 * Escapa texto para insertarlo en HTML sin riesgo de XSS
 */
export const sanitizeHTML = (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

/**
 * Valida el formato de una URL
 */
export const isValidURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Sanea una URL (solo permite http y https)
 */
export const sanitizeURL = (url: string): string | null => {
    if (!isValidURL(url)) return null;

    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
        return null;
    }

    return url;
};

/**
 * Genera un identificador aleatorio seguro (32 hex)
 */
export const generateSecureId = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
