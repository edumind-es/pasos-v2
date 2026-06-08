import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, beforeEach } from 'vitest';
import { BoardTemplateDialog } from './BoardTemplateDialog';
import { useStore, type Board } from '../store/boardStore';

const board: Board = {
    id: 'board-1',
    title: 'Tablero base',
    ownerId: 'teacher-1',
    createdAt: Date.now(),
    columns: [
        { id: 'todo', title: 'Por hacer', order: 0 },
        { id: 'done', title: 'Terminado', order: 1 },
    ],
    tasks: [
        {
            id: 'task-1',
            columnId: 'todo',
            title: 'Tarea inicial',
            labels: ['rutina'],
            createdAt: Date.now(),
        },
    ],
};

function resetStore() {
    useStore.setState({
        users: [],
        boards: [board],
        boardTemplates: [],
        deletedTasks: [],
        currentUser: { id: 'teacher-1', username: 'Docente', role: 'teacher', mode: 'pro' },
        activeBoardId: 'board-1',
        currentTheme: 'professional',
        visualMode: 'eink',
        selectedTaskIds: [],
        proSyncState: 'idle',
        lastProSyncAt: null,
        lastProSyncError: null,
    });
}

describe('BoardTemplateDialog', () => {
    beforeEach(() => {
        resetStore();
    });

    it('creates a board from a built-in template', async () => {
        const user = userEvent.setup();
        render(<BoardTemplateDialog currentBoard={board} onClose={() => undefined} />);

        await user.click(screen.getAllByRole('button', { name: 'Crear tablero' })[0]!);

        expect(useStore.getState().boards.length).toBeGreaterThan(1);
    });

    it('has no obvious accessibility violations', async () => {
        const { container } = render(<BoardTemplateDialog currentBoard={board} onClose={() => undefined} />);
        const results = await axe(container);
        expect(results.violations).toHaveLength(0);
    });
});
