/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

/**
 * Lectura de archivos de sesión arrastrados a la app. Todo ocurre en el
 * navegador: el archivo no se sube a ningún servidor.
 */

/** Extensiones admitidas al arrastrar una sesión. */
export const SESSION_FILE_EXTENSIONS = ['.md', '.markdown', '.txt', '.text'] as const;

/** Tope de tamaño: una sesión de aula nunca pesa esto. */
export const SESSION_FILE_MAX_BYTES = 512 * 1024;

export const SESSION_FILE_ACCEPT = SESSION_FILE_EXTENSIONS.join(',');

export interface SessionFileResult {
    content: string;
    fileName: string;
}

export class SessionFileError extends Error {}

function hasAcceptedExtension(name: string): boolean {
    const lower = name.toLowerCase();
    return SESSION_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/** ¿El arrastre trae archivos (y no texto suelto o una tarjeta del tablero)? */
export function dragCarriesFiles(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    if (dataTransfer.types?.includes?.('Files')) return true;
    return Array.from(dataTransfer.items ?? []).some(item => item.kind === 'file');
}

/**
 * Lee el archivo y devuelve su texto. Lanza `SessionFileError` con un mensaje
 * en castellano si el archivo no sirve (extensión, tamaño o contenido vacío).
 */
export async function readSessionFile(file: File): Promise<SessionFileResult> {
    if (!hasAcceptedExtension(file.name)) {
        throw new SessionFileError(
            `«${file.name}» no es un archivo de texto. Admitimos ${SESSION_FILE_EXTENSIONS.join(', ')}.`,
        );
    }
    if (file.size > SESSION_FILE_MAX_BYTES) {
        throw new SessionFileError('El archivo es demasiado grande (máximo 512 KB).');
    }

    let content: string;
    try {
        content = await file.text();
    } catch {
        throw new SessionFileError('No se pudo leer el archivo.');
    }

    if (!content.trim()) {
        throw new SessionFileError('El archivo está vacío.');
    }

    return { content, fileName: file.name };
}

/** Toma el primer archivo admisible de un arrastre, si lo hay. */
export function pickSessionFile(dataTransfer: DataTransfer | null): File | null {
    const files = Array.from(dataTransfer?.files ?? []);
    if (files.length === 0) return null;
    return files.find(file => hasAcceptedExtension(file.name)) ?? files[0];
}
