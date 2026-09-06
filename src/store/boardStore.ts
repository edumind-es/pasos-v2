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

/*
 * Store principal de Pasos, compuesto por slices:
 *   - sessionSlice   → usuarios y sesión
 *   - workspaceSlice → tema, sync Pro, contexto org/equipo, paneles
 *   - boardsSlice    → tableros, columnas, tareas, papelera, selección
 * Los tipos de dominio viven en ./types y se re-exportan desde aquí.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { normalizeWorkspacePanelPreferences } from './types';
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice';
import { createWorkspaceSlice, type WorkspaceSlice } from './slices/workspaceSlice';
import { createBoardsSlice, type BoardsSlice } from './slices/boardsSlice';

export * from './types';
export type { LoginOptions } from './slices/sessionSlice';
export type { CreateBoardOptions } from './slices/boardsSlice';

export type AppState = SessionSlice & WorkspaceSlice & BoardsSlice;

export const useStore = create<AppState>()(
    persist(
        (...storeArgs) => ({
            ...createSessionSlice(...storeArgs),
            ...createWorkspaceSlice(...storeArgs),
            ...createBoardsSlice(...storeArgs),
        }),
        {
            name: 'pasos-v2-storage',
            storage: createJSONStorage(() => localStorage),
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<AppState> | undefined) ?? {};
                return {
                    ...currentState,
                    ...persisted,
                    workspacePanelPreferences: normalizeWorkspacePanelPreferences(persisted.workspacePanelPreferences),
                };
            },
        }
    )
);

// Adaptador para componentes que trabajan sobre el tablero activo
export const useBoardStore = () => {
    const store = useStore();
    const activeBoard = store.activeBoardId
        ? store.boards.find(b => b.id === store.activeBoardId)
        : undefined;

    return {
        columns: activeBoard?.columns ?? [],
        tasks: activeBoard?.tasks ?? [],
        addColumn: store.addColumn,
        deleteColumn: store.deleteColumn,
        updateColumn: store.updateColumn,
        addTask: store.addTask,
        updateTask: store.updateTask,
        deleteTask: store.deleteTask,
        moveTask: store.moveTask,
        store
    };
};
