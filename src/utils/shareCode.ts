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

// Utilidades para generar y gestionar códigos de acceso a tableros

/**
 * Genera un código de acceso aleatorio de 8 caracteres
 * Formato: ABC-1234 (más fácil de leer/dictar)
 */
export function generateShareCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I y O para evitar confusión
    const numbers = '0123456789';

    let code = '';

    // 3 letras
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    code += '-';

    // 4 números
    for (let i = 0; i < 4; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return code;
}

/**
 * Valida el formato de un código de acceso
 */
export function isValidShareCode(code: string): boolean {
    const pattern = /^[A-Z]{3}-\d{4}$/;
    return pattern.test(code.toUpperCase().trim());
}

/**
 * Normaliza un código de acceso (mayúsculas, sin espacios)
 */
export function normalizeShareCode(code: string): string {
    return code.toUpperCase().trim().replace(/\s/g, '');
}

// Interfaz para tableros compartidos
export interface SharedBoard {
    code: string;
    boardId: string;
    boardTitle: string;
    createdAt: string;
    expiresAt?: string; // Opcional: fecha de expiración
}

// Almacenamiento local de códigos compartidos
export const SHARED_BOARDS_KEY = 'pasos-shared-boards';

/**
 * Obtiene todos los tableros compartidos
 */
export function getSharedBoards(): SharedBoard[] {
    try {
        const stored = localStorage.getItem(SHARED_BOARDS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function clearSharedBoards(): void {
    localStorage.removeItem(SHARED_BOARDS_KEY);
}

/**
 * Guarda un tablero compartido
 */
export function saveSharedBoard(shared: SharedBoard): void {
    const boards = getSharedBoards();
    // Evitar duplicados
    const existing = boards.findIndex(b => b.boardId === shared.boardId);
    if (existing >= 0) {
        boards[existing] = shared;
    } else {
        boards.push(shared);
    }
    localStorage.setItem(SHARED_BOARDS_KEY, JSON.stringify(boards));
}

/**
 * Elimina un tablero compartido
 */
export function removeSharedBoard(code: string): void {
    const boards = getSharedBoards().filter(b => b.code !== code);
    localStorage.setItem(SHARED_BOARDS_KEY, JSON.stringify(boards));
}

/**
 * Busca un tablero compartido por código
 */
export function findSharedBoardByCode(code: string): SharedBoard | null {
    const normalizedCode = normalizeShareCode(code);
    const boards = getSharedBoards();
    return boards.find(b => b.code === normalizedCode) || null;
}

// Progreso del estudiante
export interface StudentProgress {
    shareCode: string;
    completedTasks: string[]; // IDs de tareas completadas
    lastAccess: string;
    alias?: string; // Alias opcional del estudiante
    helpTaskIds?: string[];
    validatedTaskIds?: string[];
    evidenceEntries?: StudentEvidenceEntry[];
    feedbackEntries?: StudentFeedbackEntry[];
}

export interface StudentEvidenceEntry {
    taskId: string;
    note?: string;
    url?: string;
    submittedAt: string;
}

export interface StudentFeedbackEntry {
    taskId: string;
    message: string;
    status: 'comment' | 'needs_revision' | 'validated';
    authorLabel?: string;
    createdAt: string;
}

export const STUDENT_PROGRESS_KEY = 'pasos-student-progress';

/**
 * Obtiene el progreso del estudiante para un código
 */
export function getStudentProgress(shareCode: string): StudentProgress | null {
    try {
        const stored = localStorage.getItem(STUDENT_PROGRESS_KEY);
        const all: StudentProgress[] = stored ? JSON.parse(stored) : [];
        return normalizeStudentProgress(all.find(p => p.shareCode === shareCode) || null);
    } catch {
        return null;
    }
}

export function getAllStudentProgress(): StudentProgress[] {
    try {
        const stored = localStorage.getItem(STUDENT_PROGRESS_KEY);
        return stored ? (JSON.parse(stored) as StudentProgress[]).map(progress => normalizeStudentProgress(progress)!).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function normalizeStudentProgress(progress: StudentProgress | null): StudentProgress | null {
    if (!progress) return null;
    return {
        ...progress,
        helpTaskIds: progress.helpTaskIds ?? [],
        validatedTaskIds: progress.validatedTaskIds ?? [],
        evidenceEntries: progress.evidenceEntries ?? [],
        feedbackEntries: progress.feedbackEntries ?? [],
    };
}

/**
 * Guarda el progreso del estudiante
 */
export function saveStudentProgress(progress: StudentProgress): void {
    try {
        const stored = localStorage.getItem(STUDENT_PROGRESS_KEY);
        const all: StudentProgress[] = stored ? JSON.parse(stored) : [];
        const normalized = normalizeStudentProgress(progress)!;
        const existing = all.findIndex(p => p.shareCode === progress.shareCode);
        if (existing >= 0) {
            all[existing] = normalized;
        } else {
            all.push(normalized);
        }
        localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('Error saving student progress:', e);
    }
}

export function clearStudentProgress(): void {
    localStorage.removeItem(STUDENT_PROGRESS_KEY);
}

/**
 * Marca una tarea como completada/no completada para el estudiante
 */
export function toggleTaskCompletion(shareCode: string, taskId: string): boolean {
    const progress = getStudentProgress(shareCode) || {
        shareCode,
        completedTasks: [],
        helpTaskIds: [],
        validatedTaskIds: [],
        evidenceEntries: [],
        feedbackEntries: [],
        lastAccess: new Date().toISOString()
    };

    const index = progress.completedTasks.indexOf(taskId);
    if (index >= 0) {
        progress.completedTasks.splice(index, 1);
    } else {
        progress.completedTasks.push(taskId);
    }

    progress.lastAccess = new Date().toISOString();
    saveStudentProgress(progress);

    return index < 0; // Retorna true si se marcó como completada
}

export function setTaskHelpRequest(shareCode: string, taskId: string, needsHelp: boolean): StudentProgress {
    const progress = getStudentProgress(shareCode) || {
        shareCode,
        completedTasks: [],
        helpTaskIds: [],
        validatedTaskIds: [],
        evidenceEntries: [],
        feedbackEntries: [],
        lastAccess: new Date().toISOString(),
    };

    const nextHelpTaskIds = new Set(progress.helpTaskIds ?? []);
    if (needsHelp) {
        nextHelpTaskIds.add(taskId);
    } else {
        nextHelpTaskIds.delete(taskId);
    }

    const nextProgress = {
        ...progress,
        helpTaskIds: [...nextHelpTaskIds],
        lastAccess: new Date().toISOString(),
    };
    saveStudentProgress(nextProgress);
    return nextProgress;
}

export function upsertStudentEvidence(
    shareCode: string,
    evidence: StudentEvidenceEntry,
): StudentProgress {
    const progress = getStudentProgress(shareCode) || {
        shareCode,
        completedTasks: [],
        helpTaskIds: [],
        validatedTaskIds: [],
        evidenceEntries: [],
        feedbackEntries: [],
        lastAccess: new Date().toISOString(),
    };

    const evidenceEntries = (progress.evidenceEntries ?? []).filter((entry) => entry.taskId !== evidence.taskId);
    evidenceEntries.push(evidence);

    const nextProgress = {
        ...progress,
        evidenceEntries,
        lastAccess: new Date().toISOString(),
    };
    saveStudentProgress(nextProgress);
    return nextProgress;
}

export function syncStudentProgressFromRemote(
    shareCode: string,
    payload: {
        learnerLabel?: string | null;
        completedTaskIds: string[];
        helpTaskIds: string[];
        validatedTaskIds: string[];
        evidenceEntries: Array<{ task_id: string; note: string | null; url: string | null; submitted_at: string }>;
        feedbackEntries: Array<{ task_id: string; message: string; status: 'comment' | 'needs_revision' | 'validated'; author_label: string | null; created_at: string }>;
        lastAccessAt: string;
    },
): StudentProgress {
    const current = getStudentProgress(shareCode) || {
        shareCode,
        completedTasks: [],
        helpTaskIds: [],
        validatedTaskIds: [],
        evidenceEntries: [],
        feedbackEntries: [],
        lastAccess: payload.lastAccessAt,
    };

    const nextProgress: StudentProgress = {
        ...current,
        shareCode,
        alias: payload.learnerLabel ?? current.alias,
        completedTasks: payload.completedTaskIds,
        helpTaskIds: payload.helpTaskIds,
        validatedTaskIds: payload.validatedTaskIds,
        evidenceEntries: payload.evidenceEntries.map((entry) => ({
            taskId: entry.task_id,
            note: entry.note ?? undefined,
            url: entry.url ?? undefined,
            submittedAt: entry.submitted_at,
        })),
        feedbackEntries: payload.feedbackEntries.map((entry) => ({
            taskId: entry.task_id,
            message: entry.message,
            status: entry.status,
            authorLabel: entry.author_label ?? undefined,
            createdAt: entry.created_at,
        })),
        lastAccess: payload.lastAccessAt,
    };
    saveStudentProgress(nextProgress);
    return nextProgress;
}
