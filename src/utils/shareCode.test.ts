import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearSharedBoards,
    clearStudentProgress,
    findSharedBoardByCode,
    getAllStudentProgress,
    normalizeShareCode,
    saveSharedBoard,
    saveStudentProgress,
    setTaskHelpRequest,
    syncStudentProgressFromRemote,
    toggleTaskCompletion,
    upsertStudentEvidence,
} from './shareCode';

describe('shareCode utilities', () => {
    beforeEach(() => {
        clearSharedBoards();
        clearStudentProgress();
    });

    it('normalizes codes and stores shared boards', () => {
        saveSharedBoard({
            code: 'ABC-1234',
            boardId: 'board-1',
            boardTitle: 'Mi tablero',
            createdAt: new Date().toISOString(),
        });

        expect(normalizeShareCode(' abc-1234 ')).toBe('ABC-1234');
        expect(findSharedBoardByCode('abc-1234')?.boardId).toBe('board-1');
    });

    it('persists and toggles student progress', () => {
        saveStudentProgress({
            shareCode: 'ABC-1234',
            completedTasks: ['task-1'],
            lastAccess: new Date().toISOString(),
            alias: 'Marta',
        });

        expect(getAllStudentProgress()).toHaveLength(1);
        expect(toggleTaskCompletion('ABC-1234', 'task-2')).toBe(true);
        expect(toggleTaskCompletion('ABC-1234', 'task-1')).toBe(false);

        const stored = getAllStudentProgress()[0];
        expect(stored.alias).toBe('Marta');
        expect(stored.completedTasks).toEqual(['task-2']);
    });

    it('stores help requests, evidence and remote feedback state', () => {
        setTaskHelpRequest('ABC-1234', 'task-1', true);
        upsertStudentEvidence('ABC-1234', {
            taskId: 'task-1',
            note: 'Foto subida',
            submittedAt: new Date().toISOString(),
        });
        syncStudentProgressFromRemote('ABC-1234', {
            learnerLabel: 'Leo',
            completedTaskIds: ['task-1'],
            helpTaskIds: ['task-2'],
            validatedTaskIds: ['task-1'],
            evidenceEntries: [
                {
                    task_id: 'task-1',
                    note: 'Foto subida',
                    url: null,
                    submitted_at: new Date().toISOString(),
                },
            ],
            feedbackEntries: [
                {
                    task_id: 'task-1',
                    message: 'Buen trabajo',
                    status: 'validated',
                    author_label: 'Docente',
                    created_at: new Date().toISOString(),
                },
            ],
            lastAccessAt: new Date().toISOString(),
        });

        const stored = getAllStudentProgress()[0];
        expect(stored.alias).toBe('Leo');
        expect(stored.helpTaskIds).toEqual(['task-2']);
        expect(stored.validatedTaskIds).toEqual(['task-1']);
        expect(stored.evidenceEntries?.[0]?.taskId).toBe('task-1');
        expect(stored.feedbackEntries?.[0]?.status).toBe('validated');
    });
});
