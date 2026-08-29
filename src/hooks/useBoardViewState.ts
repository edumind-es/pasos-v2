import { useState, useRef } from 'react';
import type { Task } from '../store/boardStore';
import type { SupportedBoardType } from '../utils/boardPresets';

export interface ColumnDialogState {
    mode: 'create' | 'edit';
    value: string;
    columnId?: string;
}

/**
 * Estado de UI de la vista de tablero (menús, diálogos, DnD y filtros).
 * El estado de compartir vive en useShareBoard y el de seguimiento remoto
 * en useBoardInsights.
 */
export function useBoardViewState() {
    // Edición de tareas y DnD
    const [editingTask, setEditingTask] = useState<string | null>(null);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

    // Menús y UI general
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showTrash, setShowTrash] = useState(false);
    const [showUndo, setShowUndo] = useState(false);
    /** Panel del sidebar activo; null = todos colapsados (solo tira de iconos) */
    const [activeSidePanel, setActiveSidePanel] = useState<string | null>(null);

    // Selección múltiple
    const [selectionBoardId, setSelectionBoardId] = useState<string | null>(null);
    const undoTimeoutRef = useRef<number | null>(null);

    // Búsqueda y filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [filterColor, setFilterColor] = useState<string | null>(null);

    // Diálogos de columna
    const [columnDialog, setColumnDialog] = useState<ColumnDialogState | null>(null);
    const [columnToDelete, setColumnToDelete] = useState<{ id: string; title: string } | null>(null);

    // Diálogos de tablero
    const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
    const [createBoardPreset, setCreateBoardPreset] = useState<SupportedBoardType | null>(null);

    // Paneles y modales de herramientas
    const [showAIWizard, setShowAIWizard] = useState(false);
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
    const [showStorageCenter, setShowStorageCenter] = useState(false);
    const [showAssignmentsDialog, setShowAssignmentsDialog] = useState(false);
    const [showDocumentsPanel, setShowDocumentsPanel] = useState(false);

    return {
        editingTask, setEditingTask,
        activeDragTask, setActiveDragTask,
        targetColumnId, setTargetColumnId,
        showUserMenu, setShowUserMenu,
        showTrash, setShowTrash,
        showUndo, setShowUndo,
        activeSidePanel, setActiveSidePanel,
        selectionBoardId, setSelectionBoardId,
        undoTimeoutRef,
        searchQuery, setSearchQuery,
        filterColor, setFilterColor,
        columnDialog, setColumnDialog,
        columnToDelete, setColumnToDelete,
        createBoardDialogOpen, setCreateBoardDialogOpen,
        createBoardPreset, setCreateBoardPreset,
        showAIWizard, setShowAIWizard,
        showTemplateLibrary, setShowTemplateLibrary,
        showStorageCenter, setShowStorageCenter,
        showAssignmentsDialog, setShowAssignmentsDialog,
        showDocumentsPanel, setShowDocumentsPanel,
    };
}
