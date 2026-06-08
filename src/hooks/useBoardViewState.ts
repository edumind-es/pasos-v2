import { useState, useRef } from 'react';
import type { Task } from '../store/boardStore';
import type { SupportedBoardType } from '../utils/boardPresets';
import type { ProBoardInsightsResponse } from '../services/pasosApi';

export interface ColumnDialogState {
    mode: 'create' | 'edit';
    value: string;
    columnId?: string;
}

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

    // Compartir tablero
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareCode, setShareCode] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSource, setShareSource] = useState<'local' | 'pro'>('local');
    const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);

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

    // Insights remotos Pro
    const [remoteInsights, setRemoteInsights] = useState<ProBoardInsightsResponse | null>(null);
    const [remoteInsightsLoading, setRemoteInsightsLoading] = useState(false);
    const [remoteInsightsError, setRemoteInsightsError] = useState<string | null>(null);
    const [selectedLearnerKey, setSelectedLearnerKey] = useState<string | null>(null);

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
        showShareModal, setShowShareModal,
        shareCode, setShareCode,
        codeCopied, setCodeCopied,
        isSharing, setIsSharing,
        shareError, setShareError,
        shareSource, setShareSource,
        shareExpiresAt, setShareExpiresAt,
        columnDialog, setColumnDialog,
        columnToDelete, setColumnToDelete,
        createBoardDialogOpen, setCreateBoardDialogOpen,
        createBoardPreset, setCreateBoardPreset,
        showAIWizard, setShowAIWizard,
        showTemplateLibrary, setShowTemplateLibrary,
        showStorageCenter, setShowStorageCenter,
        showAssignmentsDialog, setShowAssignmentsDialog,
        showDocumentsPanel, setShowDocumentsPanel,
        remoteInsights, setRemoteInsights,
        remoteInsightsLoading, setRemoteInsightsLoading,
        remoteInsightsError, setRemoteInsightsError,
        selectedLearnerKey, setSelectedLearnerKey,
    };
}
