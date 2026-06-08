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

import { v4 as uuidv4 } from 'uuid';
import type { Board, Column, Task } from '../store/boardStore';

// Helper to determine input type
type InputType = 'json' | 'markdown' | 'text';

export interface ParseResult {
    board: Partial<Board>;
    error?: string;
}

const DEFAULT_COLUMNS = [
    { title: 'Por hacer', order: 0 },
    { title: 'En proceso', order: 1 },
    { title: 'Terminado', order: 2 },
];

export function detectInputType(input: string): InputType {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'json';
    if (trimmed.includes('# ') || trimmed.includes('- [ ]') || /^\s*-\s/m.test(trimmed)) return 'markdown';
    if (trimmed.includes('•')) return 'markdown';
    // Detects structured plain text: short header lines followed by longer task lines
    if (hasStructuredSections(trimmed)) return 'markdown';
    return 'text';
}

/**
 * Detecta si el texto tiene secciones estructuradas sin marcadores markdown.
 * Patrón: línea corta (encabezado de columna) seguida de líneas de tarea más largas.
 * Ejemplo: "PENDIENTE\nTarea uno\nTarea dos\nEN PROCESO\nTarea tres"
 */
function hasStructuredSections(text: string): boolean {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 3) return false;
    let headerCount = 0;
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const next = lines[i + 1];
        // Header candidate: short line (< 40 chars), no trailing period/comma,
        // not starting with a number, followed by a longer task line
        const isHeader = line.length < 40
            && !/[.,;:!?]$/.test(line)
            && !/^\d+\./.test(line)
            && next.length > line.length;
        if (isHeader) headerCount++;
    }
    return headerCount >= 2;
}

export function parseInputToBoard(input: string, title: string = 'Nuevo Tablero Importado'): ParseResult {
    const type = detectInputType(input);

    try {
        if (type === 'json') {
            const parsed = JSON.parse(input);
            // Basic validation
            if (!parsed.columns && !parsed.tasks) {
                return { board: {}, error: 'JSON inválido: Faltan columnas o tareas' };
            }
            return { board: parsed };
        }

        if (type === 'markdown') {
            return parseMarkdown(input, title);
        }

        return parsePlainText(input, title);

    } catch (e) {
        return { board: {}, error: 'Error al procesar el contenido: ' + (e as Error).message };
    }
}

function parsePlainText(text: string, title: string): ParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const boardId = uuidv4();

    // Create default columns
    const columns: Column[] = DEFAULT_COLUMNS.map(c => ({
        id: uuidv4(),
        title: c.title,
        order: c.order
    }));

    // Add all lines as tasks in the first column
    const firstColId = columns[0].id;
    const tasks: Task[] = lines.map(line => ({
        id: uuidv4(),
        columnId: firstColId,
        title: line,
        labels: [],
        createdAt: Date.now()
    }));

    return {
        board: {
            id: boardId,
            title,
            columns,
            tasks,
            createdAt: Date.now()
        }
    };
}

function parseMarkdown(md: string, title: string): ParseResult {
    const lines = md.split('\n');
    const boardId = uuidv4();

    // Default structure (cleared if we detect custom structure)
    let columns: Column[] = DEFAULT_COLUMNS.map(c => ({
        id: uuidv4(),
        title: c.title,
        order: c.order
    }));

    const tasks: Task[] = [];
    let currentColumnId = columns[0].id; // Default to first column

    // State to track if we found custom columns
    let hasCustomColumns = false;

    // Parser for:
    // 1. Explicit Headers: # Title, ## Column
    // 2. Implicit Headers: Text followed by bullet points
    // 3. Bullets: -, *, •

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('# ')) {
            // Main title, ignore
            continue;
        }

        // 1. Explicit Headers (##)
        if (trimmed.startsWith('## ')) {
            if (!hasCustomColumns) {
                columns = [];
                hasCustomColumns = true;
            }

            const colTitle = trimmed.substring(2).trim();
            let col = columns.find(c => c.title.toLowerCase() === colTitle.toLowerCase());
            if (!col) {
                const order = columns.length;
                col = { id: uuidv4(), title: colTitle, order };
                columns.push(col);
            }
            currentColumnId = col.id;
            continue;
        }

        // 2. Bullets
        // Supports -, *, and •
        const bulletMatch = trimmed.match(/^([-*•])\s+(?:\[.\].*\s)?(.*)/);
        if (bulletMatch) {
            const taskTitle = bulletMatch[2];

            // If we have NO columns (e.g. cleared defaults but no H2 yet), create a generic one
            if (columns.length === 0) {
                const col = { id: uuidv4(), title: 'Lista', order: 0 };
                columns.push(col);
                currentColumnId = col.id;
            }

            tasks.push({
                id: uuidv4(),
                columnId: currentColumnId,
                title: taskTitle,
                labels: [],
                createdAt: Date.now()
            });
            continue;
        }

        // 3. Implicit Headers (Permissive Mode)
        // If it's NOT a bullet, and the line is short without trailing punctuation,
        // treat it as a column header. Otherwise treat it as a plain-text task.
        if (!trimmed.startsWith('# ') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
            const isLikelyHeader = trimmed.length < 40 && !/[.,;!?]$/.test(trimmed) && !/^\d+\./.test(trimmed);

            if (isLikelyHeader) {
                if (!hasCustomColumns && tasks.length === 0) {
                    columns = [];
                    hasCustomColumns = true;
                }
                const colTitle = trimmed;
                let col = columns.find(c => c.title.toLowerCase() === colTitle.toLowerCase());
                if (!col) {
                    col = { id: uuidv4(), title: colTitle, order: columns.length };
                    columns.push(col);
                }
                currentColumnId = col.id;
            } else {
                // Línea larga sin bullet → tarea de texto plano bajo la columna actual
                if (columns.length === 0) {
                    const col = { id: uuidv4(), title: 'Lista', order: 0 };
                    columns.push(col);
                    currentColumnId = col.id;
                }
                tasks.push({
                    id: uuidv4(),
                    columnId: currentColumnId,
                    title: trimmed,
                    labels: [],
                    createdAt: Date.now()
                });
            }
            continue;
        }
    }

    return {
        board: {
            id: boardId,
            title,
            columns,
            tasks,
            createdAt: Date.now()
        }
    };
}
