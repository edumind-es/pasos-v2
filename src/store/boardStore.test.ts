import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './boardStore';

// Instantánea del estado inicial (incluye las acciones) para resetear entre tests
const initialState = useStore.getState();

function resetStore() {
    useStore.setState(initialState, true);
    localStorage.clear();
}

function loginTeacher() {
    return useStore.getState().login('Docente Test', 'teacher');
}

function createBoardWithTask(taskTitle = 'Tarea de prueba') {
    const store = useStore.getState();
    store.createBoard('Tablero de prueba');
    const board = useStore.getState().boards[useStore.getState().boards.length - 1];
    const firstColumn = board.columns[0];
    useStore.getState().addTask(firstColumn.id, taskTitle);
    const task = useStore.getState().boards.find(b => b.id === board.id)!.tasks[0];
    return { board, firstColumn, task };
}

describe('boardStore — sesión', () => {
    beforeEach(resetStore);

    it('login crea el usuario y lo deja como currentUser', () => {
        const user = loginTeacher();
        expect(user).not.toBeNull();
        expect(useStore.getState().currentUser?.username).toBe('Docente Test');
        expect(useStore.getState().currentUser?.role).toBe('teacher');
    });

    it('login con nombre vacío no crea sesión', () => {
        const user = useStore.getState().login('   ', 'teacher');
        expect(user).toBeNull();
        expect(useStore.getState().currentUser).toBeNull();
    });

    it('login reclama los tableros locales creados sin sesión (alias local-user)', () => {
        useStore.getState().createBoard('Tablero anónimo');
        expect(useStore.getState().boards[0].ownerId).toBe('local-user');
        const user = loginTeacher();
        expect(useStore.getState().boards[0].ownerId).toBe(user!.id);
    });

    it('logout limpia la sesión y el contexto pero conserva los tableros', () => {
        loginTeacher();
        useStore.getState().createBoard('Persistente');
        useStore.getState().logout();
        const state = useStore.getState();
        expect(state.currentUser).toBeNull();
        expect(state.activeBoardId).toBeNull();
        expect(state.currentOrganizationId).toBeNull();
        expect(state.boards).toHaveLength(1);
    });
});

describe('boardStore — tableros', () => {
    beforeEach(() => {
        resetStore();
        loginTeacher();
    });

    it('createBoard crea columnas por defecto y activa el tablero', () => {
        useStore.getState().createBoard('Mi tablero');
        const state = useStore.getState();
        expect(state.boards).toHaveLength(1);
        expect(state.activeBoardId).toBe(state.boards[0].id);
        expect(state.boards[0].columns.length).toBeGreaterThan(0);
        expect(state.boards[0].contextType).toBe('personal');
    });

    it('deleteBoard elimina el tablero y desactiva si era el activo', () => {
        useStore.getState().createBoard('A borrar');
        const boardId = useStore.getState().activeBoardId!;
        useStore.getState().deleteBoard(boardId);
        expect(useStore.getState().boards).toHaveLength(0);
        expect(useStore.getState().activeBoardId).toBeNull();
    });

    it('duplicateBoard copia columnas y tareas con ids nuevos', () => {
        const { board, task } = createBoardWithTask();
        useStore.getState().duplicateBoard(board.id);
        const boards = useStore.getState().boards;
        expect(boards).toHaveLength(2);
        const copy = boards[1];
        expect(copy.id).not.toBe(board.id);
        expect(copy.title).toBe(`${board.title} (copia)`);
        expect(copy.tasks).toHaveLength(1);
        expect(copy.tasks[0].id).not.toBe(task.id);
        // la tarea copiada apunta a la columna nueva, no a la original
        expect(copy.columns.some(c => c.id === copy.tasks[0].columnId)).toBe(true);
    });

    it('mergeBoardsForOwner actualiza los existentes y añade los nuevos', () => {
        const { board } = createBoardWithTask();
        const ownerId = useStore.getState().currentUser!.id;
        const updated = { ...board, title: 'Título remoto', ownerId };
        const brandNew = { ...board, id: 'remote-board-1', title: 'Nuevo remoto', ownerId };
        useStore.getState().mergeBoardsForOwner(ownerId, [updated, brandNew]);
        const boards = useStore.getState().boards;
        expect(boards).toHaveLength(2);
        expect(boards.find(b => b.id === board.id)?.title).toBe('Título remoto');
        expect(boards.find(b => b.id === 'remote-board-1')?.title).toBe('Nuevo remoto');
    });

    it('saveBoardAsTemplate + createBoardFromTemplate reasigna ids de columnas', () => {
        const { board } = createBoardWithTask();
        useStore.getState().saveBoardAsTemplate(board.id, { title: 'Plantilla test' });
        const template = useStore.getState().boardTemplates[0];
        expect(template.sourceBoardId).toBe(board.id);

        useStore.getState().createBoardFromTemplate(template, { title: 'Desde plantilla' });
        const created = useStore.getState().boards[useStore.getState().boards.length - 1];
        expect(created.title).toBe('Desde plantilla');
        expect(created.tasks).toHaveLength(1);
        expect(created.columns.map(c => c.id)).not.toContain(board.columns[0].id);
        expect(created.columns.some(c => c.id === created.tasks[0].columnId)).toBe(true);
    });
});

describe('boardStore — columnas y tareas', () => {
    beforeEach(() => {
        resetStore();
        loginTeacher();
    });

    it('addColumn añade al final con el orden correcto', () => {
        useStore.getState().createBoard('Tablero');
        const before = useStore.getState().boards[0].columns.length;
        useStore.getState().addColumn('Nueva columna');
        const columns = useStore.getState().boards[0].columns;
        expect(columns).toHaveLength(before + 1);
        expect(columns[columns.length - 1].title).toBe('Nueva columna');
        expect(columns[columns.length - 1].order).toBe(before);
    });

    it('deleteColumn elimina también sus tareas y su selección', () => {
        const { firstColumn, task } = createBoardWithTask();
        useStore.getState().toggleTaskSelection(task.id);
        useStore.getState().deleteColumn(firstColumn.id);
        const board = useStore.getState().boards[0];
        expect(board.columns.find(c => c.id === firstColumn.id)).toBeUndefined();
        expect(board.tasks).toHaveLength(0);
        expect(useStore.getState().selectedTaskIds).toHaveLength(0);
    });

    it('addTask y updateTask modifican el tablero activo', () => {
        const { board, task } = createBoardWithTask();
        useStore.getState().updateTask(task.id, { title: 'Renombrada', pedagogicalStatus: 'in_progress' });
        const updated = useStore.getState().boards.find(b => b.id === board.id)!.tasks[0];
        expect(updated.title).toBe('Renombrada');
        expect(updated.pedagogicalStatus).toBe('in_progress');
    });

    it('moveTask cambia la tarea de columna', () => {
        const { board, task } = createBoardWithTask();
        const targetColumn = board.columns[1];
        useStore.getState().moveTask(task.id, targetColumn.id);
        const moved = useStore.getState().boards.find(b => b.id === board.id)!.tasks[0];
        expect(moved.columnId).toBe(targetColumn.id);
    });

    it('deleteTask manda la tarea a la papelera y restoreLastDeletedTask la recupera', () => {
        const { board, task } = createBoardWithTask();
        useStore.getState().deleteTask(task.id);
        expect(useStore.getState().boards.find(b => b.id === board.id)!.tasks).toHaveLength(0);
        expect(useStore.getState().deletedTasks).toHaveLength(1);

        useStore.getState().restoreLastDeletedTask();
        expect(useStore.getState().boards.find(b => b.id === board.id)!.tasks).toHaveLength(1);
        expect(useStore.getState().deletedTasks).toHaveLength(0);
    });

    it('restoreDeletedTask recoloca en la primera columna si la original ya no existe', () => {
        const { board, firstColumn, task } = createBoardWithTask();
        useStore.getState().deleteTask(task.id);
        useStore.getState().deleteColumn(firstColumn.id);
        useStore.getState().restoreDeletedTask(task.id);
        const restored = useStore.getState().boards.find(b => b.id === board.id)!.tasks[0];
        expect(restored).toBeDefined();
        expect(restored.columnId).toBe(useStore.getState().boards[0].columns[0].id);
    });

    it('duplicateTask inserta la copia junto a la original y resetea el estado pedagógico', () => {
        const { board, task } = createBoardWithTask();
        useStore.getState().updateTask(task.id, { pedagogicalStatus: 'validated' });
        useStore.getState().duplicateTask(task.id);
        const tasks = useStore.getState().boards.find(b => b.id === board.id)!.tasks;
        expect(tasks).toHaveLength(2);
        expect(tasks[1].title).toBe(`Copia de ${task.title}`);
        expect(tasks[1].pedagogicalStatus).toBe('not_started');
    });
});

describe('boardStore — selección múltiple', () => {
    beforeEach(() => {
        resetStore();
        loginTeacher();
    });

    it('toggleTaskSelection añade y quita; clearTaskSelection vacía', () => {
        const { task } = createBoardWithTask();
        useStore.getState().toggleTaskSelection(task.id);
        expect(useStore.getState().selectedTaskIds).toEqual([task.id]);
        useStore.getState().toggleTaskSelection(task.id);
        expect(useStore.getState().selectedTaskIds).toEqual([]);
        useStore.getState().setSelectedTaskIds([task.id, 'otra']);
        useStore.getState().clearTaskSelection();
        expect(useStore.getState().selectedTaskIds).toEqual([]);
    });
});
