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

import { useMemo, useEffect, useState, useRef } from 'react';
import { useBoardViewState } from '../hooks/useBoardViewState';
import { useShareBoard } from '../hooks/useShareBoard';
import { useBoardInsights } from '../hooks/useBoardInsights';
import { Plus, User, Play, Download, Share2, Sparkles, LogOut, Layers3, FileDown, Database, CalendarDays, CalendarRange, UserRoundPlus, FileText, Network, Building2, AlertCircle, GraduationCap } from 'lucide-react';
import { useBoardStore, useStore } from '../store/boardStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TaskModal from '../components/TaskModal';
import AIWizardModal from '../components/AIWizardModal';
import { dragCarriesFiles, pickSessionFile, readSessionFile, SessionFileError } from '../utils/sessionFile';
import { BoardSwitcherButton } from '../components/BoardSwitcherButton';
import { EditableBoardTitle } from '../components/EditableBoardTitle';
import { TextActionDialog } from '../components/TextActionDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HeaderOverflowMenu } from '../components/HeaderOverflowMenu';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragOverEvent, defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { BoardColumn } from '../components/BoardColumn';
import { TaskCard } from '../components/TaskCard';
import { BoardToolbar } from '../components/BoardToolbar';
import { useConfetti } from '../hooks/useConfetti';
import { AccessibilityControls } from '../components/AccessibilityControls';
import { BoardTemplateDialog } from '../components/BoardTemplateDialog';
import { StorageControlCenter } from '../components/StorageControlCenter';
import { WorkspaceContextBar } from '../components/WorkspaceContextBar';
import { CreateBoardDialog } from '../components/CreateBoardDialog';
import { LearnerReviewDialog } from '../components/LearnerReviewDialog';
import { BoardAssignmentsDialog } from '../components/BoardAssignmentsDialog';
import { BoardDocumentsPanel } from '../components/BoardDocumentsPanel';
import { BoardShareModal } from '../components/BoardShareModal';
import { BoardTrashModal, UndoDeleteToast } from '../components/BoardTrashModal';
import { BoardSidebar } from '../components/BoardSidebar';
import { ProWorkspaceGate, ClassroomTemplatePicker, EmptyWorkspaceNotice } from '../components/BoardEmptyStates';
import { downloadBoardReportHtml } from '../utils/boardReports';
import type { SupportedBoardType } from '../utils/boardPresets';
import { getWorkspaceModeFromPath, getWorkspaceSubPath, matchesWorkspaceContext } from '../utils/workspaceRoutes';
import { logoutProUser } from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

function BoardView() {
    const boardStore = useBoardStore();
    const { addTask, deleteTask, moveTask, addColumn, deleteColumn, updateColumn } = boardStore;
    const {
        boards,
        activeBoardId,
        currentUser,
        currentOrganizationId,
        currentTeamId,
        logout,
        updateBoardTitle,
        deletedTasks,
        restoreDeletedTask,
        selectedTaskIds,
        toggleTaskSelection,
        clearTaskSelection,
        setSelectedTaskIds,
        lastProSyncError,
        createBoard,
        setActiveBoard,
    } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { triggerConfetti, ConfettiComponent } = useConfetti();
    const {
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
    } = useBoardViewState();

    // ── Soltar un archivo de sesión (.md) sobre el tablero ──
    const [sessionDrop, setSessionDrop] = useState<{ content: string; fileName: string } | null>(null);
    const [fileDragging, setFileDragging] = useState(false);
    const [fileDropError, setFileDropError] = useState<string | null>(null);
    // Contador de entradas/salidas: sin él, pasar sobre un hijo apaga la capa.
    const dragDepthRef = useRef(0);

    const handleFileDragOver = (event: React.DragEvent) => {
        if (!dragCarriesFiles(event.dataTransfer)) return;
        event.preventDefault();
        setFileDragging(true);
    };

    const handleFileDragEnter = (event: React.DragEvent) => {
        if (!dragCarriesFiles(event.dataTransfer)) return;
        dragDepthRef.current += 1;
        setFileDragging(true);
    };

    const handleFileDragLeave = () => {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setFileDragging(false);
    };

    const handleFileDrop = async (event: React.DragEvent) => {
        if (!dragCarriesFiles(event.dataTransfer)) return;
        event.preventDefault();
        dragDepthRef.current = 0;
        setFileDragging(false);
        setFileDropError(null);
        const file = pickSessionFile(event.dataTransfer);
        if (!file) return;
        try {
            const { content, fileName } = await readSessionFile(file);
            setSessionDrop({ content, fileName });
            setShowAIWizard(true);
        } catch (e) {
            setFileDropError(e instanceof SessionFileError ? e.message : 'No se pudo leer el archivo.');
        }
    };

    const isProUser = currentUser?.mode === 'pro';
    const workspaceMode = getWorkspaceModeFromPath(location.pathname);
    const isClassroomWorkspace = workspaceMode === 'classroom';
    const isEmbedded = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('embed') === '1' || params.get('board') === '1';
    }, [location.search]);
    const compactEmbed = isEmbedded && isClassroomWorkspace;
    const effectiveOrganizationId = isClassroomWorkspace ? null : currentOrganizationId;
    const effectiveTeamId = isClassroomWorkspace ? null : currentTeamId;
    const allowPersonalWorkspace = isClassroomWorkspace;
    const canCreateBoardInWorkspace = isClassroomWorkspace || !isProUser || Boolean(effectiveOrganizationId || effectiveTeamId);
    const visibleBoards = useMemo(() => (
        boards.filter((board) => matchesWorkspaceContext(
            board,
            isProUser,
            currentUser?.id ?? null,
            effectiveOrganizationId,
            effectiveTeamId,
            allowPersonalWorkspace,
        ))
    ), [allowPersonalWorkspace, boards, currentUser?.id, effectiveOrganizationId, effectiveTeamId, isProUser]);
    const currentBoard = visibleBoards.find(b => b.id === activeBoardId) ?? null;
    const shareUnsupported = Boolean(
        isProUser
        && (!isClassroomWorkspace || currentBoard?.contextType === 'team' || currentBoard?.contextType === 'organization')
    );
    const currentBoardId = currentBoard?.id ?? null;

    const {
        showShareModal, setShowShareModal,
        shareCode,
        codeCopied,
        isSharing,
        shareError,
        shareSource,
        shareExpiresAt,
        existingShare,
        handleShare,
        handleCopyCode,
    } = useShareBoard({ currentBoard, activeBoardId, isProUser });

    const {
        remoteInsights, setRemoteInsights,
        remoteInsightsLoading,
        remoteInsightsError,
        setSelectedLearnerKey,
        selectedLearner,
    } = useBoardInsights({ isProUser, currentBoardId, isClassroomWorkspace, shareCode, shareExpiresAt });

    const columns = useMemo(() => currentBoard?.columns ?? [], [currentBoard]);
    const tasks = useMemo(() => currentBoard?.tasks ?? [], [currentBoard]);
    const isReadOnlyBoard = Boolean(isProUser && currentBoard?.remoteRole === 'viewer');
    const selectionMode = Boolean(activeBoardId && selectionBoardId === activeBoardId);
    const deletedForBoard = useMemo(() => {
        if (!activeBoardId) return [];
        return deletedTasks.filter(entry => entry.boardId === activeBoardId);
    }, [deletedTasks, activeBoardId]);
    const lastDeleted = deletedForBoard[deletedForBoard.length - 1];

    useEffect(() => {
        if (!compactEmbed || typeof window === 'undefined' || window.parent === window) {
            return;
        }

        window.parent.postMessage({
            type: 'board:ready',
            appId: 'pasos',
            status: 'ready',
            boardId: currentBoard?.id ?? null,
        }, '*');
        window.parent.postMessage({ type: 'board:state:request' }, '*');

        const postMetrics = () => {
            const viewportWidth = window.innerWidth;
            const preferredWidth = Math.max(1080, Math.min(1600, viewportWidth + 220));
            const preferredHeight = Math.max(680, Math.min(1400, document.documentElement.scrollHeight));
            window.parent.postMessage({
                type: 'board:embed:metrics',
                appId: 'pasos',
                width: preferredWidth,
                height: preferredHeight,
            }, '*');
        };

        const raf = window.requestAnimationFrame(postMetrics);
        const observer = new ResizeObserver(() => postMetrics());
        observer.observe(document.body);
        window.addEventListener('resize', postMetrics);

        return () => {
            window.cancelAnimationFrame(raf);
            observer.disconnect();
            window.removeEventListener('resize', postMetrics);
        };
    }, [compactEmbed, currentBoard?.id, columns.length, tasks.length]);

    useEffect(() => {
        const activeVisible = activeBoardId ? visibleBoards.some((board) => board.id === activeBoardId) : false;
        if (activeVisible) {
            return;
        }
        if (visibleBoards.length > 0) {
            setActiveBoard(visibleBoards[0].id);
            return;
        }
        if (activeBoardId) {
            setActiveBoard(null);
        }
    }, [activeBoardId, setActiveBoard, visibleBoards]);

    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) {
                window.clearTimeout(undoTimeoutRef.current);
            }
        };
    }, [undoTimeoutRef]);

    useEffect(() => {
        if (selectionBoardId && selectionBoardId !== activeBoardId) {
            clearTaskSelection();
        }
    }, [activeBoardId, clearTaskSelection, selectionBoardId]);

    useEffect(() => {
        const taskIds = new Set(tasks.map(task => task.id));
        const filtered = selectedTaskIds.filter(id => taskIds.has(id));
        if (filtered.length !== selectedTaskIds.length) {
            setSelectedTaskIds(filtered);
        }
    }, [tasks, selectedTaskIds, setSelectedTaskIds]);

    const handleLogout = async () => {
        if (currentUser?.mode === 'pro') {
            try {
                await logoutProUser();
            } catch {
                // Local logout must still succeed if the backend is unavailable.
            }
        }
        logout();
        setShowUserMenu(false);
        logAppEvent({
            type: 'user_logout',
            level: 'info',
            message: 'La sesión actual se cerró correctamente.',
            metadata: { mode: currentUser?.mode ?? 'identified' },
        });
        if (!isEmbedded) {
            navigate('/login', { replace: true });
        }
    };

    // Filter tasks based on search and color
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = !searchQuery ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesColor = !filterColor || task.color === filterColor;
            return matchesSearch && matchesColor;
        });
    }, [tasks, searchQuery, filterColor]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Prevent accidental drags
            }
        })
    );

    const handleAddTask = (columnId: string) => {
        if (isReadOnlyBoard) return;
        addTask(columnId, 'Nueva Tarea');
    };

    const handleQuickCreateTask = (columnId: string, title: string) => {
        if (isReadOnlyBoard || !currentBoard) return;
        addTask(columnId, title);
        logAppEvent({
            type: 'classroom_quick_task_created',
            level: 'info',
            message: 'Se creó una tarea rápida en Pasos Aula.',
            metadata: { board_id: currentBoard.id, column_id: columnId },
        });
    };

    const handleAddColumn = () => {
        if (isReadOnlyBoard) return;
        setColumnDialog({
            mode: 'create',
            value: '',
        });
    };

    const handleDeleteColumn = (id: string) => {
        if (isReadOnlyBoard) return;
        const column = columns.find(item => item.id === id);
        if (!column) return;
        setColumnToDelete({ id, title: column.title });
    };

    const handleEditColumn = (id: string, currentTitle: string) => {
        if (isReadOnlyBoard) return;
        setColumnDialog({
            mode: 'edit',
            value: currentTitle,
            columnId: id,
        });
    };

    // Export board to JSON
    const handleExport = () => {
        const data = JSON.stringify({ columns, tasks }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pasos-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    const handlePedagogicalExport = () => {
        if (!currentBoard) return;
        downloadBoardReportHtml(currentBoard, remoteInsights);
        logAppEvent({
            type: 'pedagogical_report_exported',
            level: 'info',
            message: 'Se exportó un informe pedagógico del tablero activo.',
            metadata: { board_id: currentBoard.id },
        });
    };

    const handleTaskClick = (taskId: string) => {
        if (selectionMode) {
            toggleTaskSelection(taskId);
            return;
        }
        setEditingTask(taskId);
    };

    const handleToggleSelectionMode = () => {
        if (!activeBoardId) return;

        if (selectionMode) {
            clearTaskSelection();
            setSelectionBoardId(null);
            return;
        }

        setSelectionBoardId(activeBoardId);
    };

    const showUndoToast = () => {
        setShowUndo(true);
        if (undoTimeoutRef.current) {
            window.clearTimeout(undoTimeoutRef.current);
        }
        undoTimeoutRef.current = window.setTimeout(() => {
            setShowUndo(false);
            undoTimeoutRef.current = null;
        }, 6000);
    };

    const submitColumnDialog = () => {
        if (isReadOnlyBoard) return;
        if (!columnDialog) return;
        const nextTitle = columnDialog.value.trim();
        if (!nextTitle) return;

        if (columnDialog.mode === 'create') {
            addColumn(nextTitle);
            logAppEvent({
                type: 'column_created',
                level: 'info',
                message: 'Se creó una nueva columna en el tablero.',
                metadata: { title: nextTitle },
            });
        } else if (columnDialog.columnId) {
            updateColumn(columnDialog.columnId, nextTitle);
            logAppEvent({
                type: 'column_renamed',
                level: 'info',
                message: 'Se actualizó el nombre de una columna.',
                metadata: { title: nextTitle },
            });
        }

        setColumnDialog(null);
    };

    const submitCreateBoard = (payload: {
        title: string;
        contextType: 'personal' | 'organization' | 'team';
        boardType: SupportedBoardType;
        organizationId: string | null;
        teamId: string | null;
    }) => {
        createBoard(payload.title, currentUser?.id, {
            contextType: payload.contextType,
            boardType: payload.boardType,
            organizationId: payload.organizationId,
            teamId: payload.teamId,
        });
        setCreateBoardDialogOpen(false);
        setCreateBoardPreset(null);
        logAppEvent({
            type: 'board_created',
            level: 'info',
            message: 'Se creó un nuevo tablero.',
            metadata: { title: payload.title, board_type: payload.boardType, context_type: payload.contextType },
        });
    };

    // Drag and Drop handlers
    const onDragStart = (event: DragStartEvent) => {
        if (selectionMode || isReadOnlyBoard) return;
        if (event.active.data.current?.type === 'Task') {
            setActiveDragTask(event.active.data.current.task);
            setTargetColumnId(null);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        if (selectionMode || isReadOnlyBoard) return;
        const { active, over } = event;
        if (!over) {
            setTargetColumnId(null);
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        const isOverTask = over.data.current?.type === 'Task';
        const isOverColumn = over.data.current?.type === 'Column';

        if (!isActiveTask) return;

        let newColumnId: string | null = null;

        // Task over Task - get the column from the task being hovered
        if (isActiveTask && isOverTask) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask) {
                newColumnId = overTask.columnId;
            }
        }

        // Task over Column
        if (isActiveTask && isOverColumn) {
            newColumnId = overId as string;
        }

        // Store the target column for visual feedback (if needed) and for dragEnd
        if (newColumnId) {
            setTargetColumnId(newColumnId);
        }
    };

    const onDragEnd = () => {
        if (selectionMode || isReadOnlyBoard) return;
        // Only move the task when drag ends
        if (activeDragTask && targetColumnId && activeDragTask.columnId !== targetColumnId) {
            moveTask(activeDragTask.id, targetColumnId);
        }

        setActiveDragTask(null);
        setTargetColumnId(null);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    if (!isClassroomWorkspace && !isProUser) {
        return <ProWorkspaceGate />;
    }

    return (
        <div
            className={`min-h-screen text-lme-text flex flex-col font-sans ${compactEmbed ? 'pasos-board-embed' : ''}`}
            onDragEnter={handleFileDragEnter}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
        >
            {fileDragging && (
                <div className="fixed inset-0 z-dropdown flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
                    <div className="rounded-2xl border-2 border-dashed border-vio bg-lme-surface-alt px-10 py-8 text-center shadow-2xl">
                        <p className="text-xl font-bold text-ink">Suelta aquí tu sesión</p>
                        <p className="text-sm text-sub mt-1">Archivo .md de la plantilla de sesión · se lee en tu dispositivo</p>
                    </div>
                </div>
            )}
            {fileDropError && (
                <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-dropdown max-w-md rounded-xl border border-lme-danger/40 bg-lme-surface-alt px-4 py-3 text-sm text-lme-danger shadow-2xl">
                    {fileDropError}
                    <button onClick={() => setFileDropError(null)} className="ml-3 font-bold" aria-label="Cerrar aviso">×</button>
                </div>
            )}
            {!compactEmbed && (
            <header className="sticky top-0 z-sticky glass-panel border-b-0 rounded-none border-b border-lme-border/50 px-4 py-4 sm:px-6">
                {/* ── Header: fila única, responsiva ── */}
                <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 min-w-0">
                    {/* IZQUIERDA: logo + tabs + breadcrumb */}
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                        {/* Logo */}
                        <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity" title="Inicio">
                            <img src="/icons/icon-192.png" alt="Pasos" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-sm" />
                        </Link>

                        {/* Tabs: Aula | Claustro */}
                        <div className="flex items-center bg-black/20 border border-line rounded-lg p-0.5 shrink-0">
                            <Link
                                to="/aula"
                                className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-lg transition-colors ${isClassroomWorkspace ? 'bg-sky/20 text-sky' : 'text-sub hover:text-ink'}`}
                            >
                                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden min-[380px]:inline">Aula</span>
                            </Link>
                            {isProUser && (
                                <Link
                                    to="/organizacion"
                                    className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-lg transition-colors ${!isClassroomWorkspace ? 'bg-mint/20 text-mint' : 'text-sub hover:text-ink'}`}
                                >
                                    <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span className="hidden min-[380px]:inline">Claustro</span>
                                </Link>
                            )}
                        </div>

                        {/* Breadcrumb: org/equipo clicable + título tablero */}
                        {currentBoard && (
                            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                                {/* En modo org: nombre del contexto clicable para abrir selector */}
                                {!isClassroomWorkspace && (
                                    <>
                                        <span className="text-sub text-xs sm:text-sm shrink-0">›</span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveSidePanel(activeSidePanel === 'workspace_context' ? null : 'workspace_context')}
                                            title="Cambiar organización o equipo"
                                            className={`text-xs font-semibold truncate max-w-[60px] sm:max-w-[100px] transition-colors shrink-0 ${activeSidePanel === 'workspace_context' ? 'text-mint' : 'text-sub hover:text-ink'}`}
                                        >
                                            {currentBoard.contextType === 'team' ? 'Equipo' : 'Org.'}
                                        </button>
                                    </>
                                )}
                                <span className="text-sub text-xs sm:text-sm shrink-0">›</span>
                                {isReadOnlyBoard ? (
                                    <span className="text-xs sm:text-sm text-sub font-medium truncate max-w-[80px] sm:max-w-[180px]">{currentBoard.title}</span>
                                ) : (
                                    <EditableBoardTitle
                                        key={currentBoard.id}
                                        board={currentBoard}
                                        onSave={(title) => updateBoardTitle(currentBoard.id, title)}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* DERECHA: acciones */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="relative">
                            <BoardSwitcherButton
                                visibleBoards={visibleBoards}
                                disabled={!canCreateBoardInWorkspace && visibleBoards.length === 0}
                                onCreateBoard={() => {
                                    if (!canCreateBoardInWorkspace) return;
                                    setCreateBoardPreset(null);
                                    setCreateBoardDialogOpen(true);
                                }}
                            />
                        </div>
                        <AccessibilityControls />

                        {/* Acciones primarias: etiquetas solo en sm+ */}
                        {isClassroomWorkspace && (
                            <Link
                                to={getWorkspaceSubPath('classroom', 'present')}
                                className="flex items-center gap-1.5 px-2 sm:px-4 py-2 rounded-lg bg-ink text-lme-background hover:bg-fisico transition-colors text-sm font-bold uppercase tracking-wide"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span className="hidden sm:inline">Presentar</span>
                            </Link>
                        )}
                        {isClassroomWorkspace && (
                            <button
                                type="button"
                                onClick={() => setShowAssignmentsDialog(true)}
                                disabled={!currentBoard || !isProUser || isReadOnlyBoard}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <UserRoundPlus className="w-4 h-4" />
                                Asignar
                            </button>
                        )}
                        {isClassroomWorkspace && (
                            <button
                                onClick={handleShare}
                                disabled={isReadOnlyBoard || shareUnsupported}
                                title={shareUnsupported ? 'Este espacio no admite enlaces anónimos de alumno' : undefined}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                        )}

                        {/* Menú de acciones secundarias */}
                        <HeaderOverflowMenu
                            items={[
                                { kind: 'heading' as const, label: 'Vistas' },
                                ...(isClassroomWorkspace ? [
                                    { kind: 'link' as const, label: 'Hoy', icon: <CalendarDays className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath('classroom', 'hoy') },
                                ] : []),
                                { kind: 'link' as const, label: 'Agenda', icon: <CalendarRange className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath(workspaceMode, 'agenda') },
                                { kind: 'link' as const, label: 'Cronograma', icon: <Network className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath(workspaceMode, 'timeline') },
                                ...(!isClassroomWorkspace ? [
                                    { kind: 'link' as const, label: 'Centro', icon: <Building2 className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath('organization', 'centro') },
                                ] : []),
                                { kind: 'separator' as const },
                                { kind: 'heading' as const, label: 'Herramientas' },
                                { kind: 'action' as const, label: 'Documentos', icon: <FileText className="w-4 h-4 text-sub" />, onClick: () => setShowDocumentsPanel(true), disabled: !currentBoard },
                                { kind: 'action' as const, label: 'Plantillas', icon: <Layers3 className="w-4 h-4 text-sub" />, onClick: () => setShowTemplateLibrary(true) },
                                { kind: 'action' as const, label: 'Asistente IA', icon: <Sparkles className="w-4 h-4 text-sub" />, onClick: () => setShowAIWizard(true) },
                                { kind: 'separator' as const },
                                { kind: 'heading' as const, label: 'Exportar' },
                                { kind: 'action' as const, label: 'Informe pedagógico', icon: <FileDown className="w-4 h-4 text-sub" />, onClick: handlePedagogicalExport, disabled: !currentBoard },
                                { kind: 'action' as const, label: 'Copia de seguridad (JSON)', icon: <Download className="w-4 h-4 text-sub" />, onClick: handleExport },
                            ]}
                        />

                        {/* Badge error sync — solo texto en sm+ */}
                        {isProUser && lastProSyncError && (
                            <button
                                type="button"
                                title={lastProSyncError}
                                onClick={() => setShowUserMenu(true)}
                                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg border border-lme-danger/40 bg-lme-danger/10 text-lme-danger/80 text-xs font-semibold transition-colors hover:bg-lme-danger/20"
                            >
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="hidden sm:inline">Sin sync</span>
                            </button>
                        )}

                        {/* Avatar y menú de usuario */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="w-10 h-10 rounded-full bg-lme-primary/20 flex items-center justify-center border border-lme-primary/30 hover:bg-lme-primary/30 transition-colors"
                                aria-haspopup="menu"
                                aria-expanded={showUserMenu}
                                title="Cuenta de usuario"
                            >
                                <User className="w-5 h-5 text-lme-primary" />
                            </button>
                            {showUserMenu && (
                                <>
                                    <div className="fixed inset-0 z-dropdown-backdrop" onClick={() => setShowUserMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-lme-surface-alt border border-lme-border rounded-xl shadow-2xl p-2 z-dropdown animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-3 py-2 border-b border-line/50">
                                            <p className="text-sm font-bold text-ink">
                                                {currentUser?.username ?? 'Usuario'}
                                            </p>
                                            <p className="text-xs text-sub">
                                                {currentUser?.role === 'teacher' ? 'Docente' : 'Alumno'}
                                            </p>
                                            {currentUser?.workspaceCode && (
                                                <p className="mt-1 text-[11px] font-mono tracking-[0.16em] text-mint">
                                                    {currentUser.workspaceCode}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowStorageCenter(true);
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-white/5 rounded-lg flex items-center gap-2 font-medium mt-1"
                                        >
                                            <Database className="w-4 h-4" />
                                            Centro de datos
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-3 py-2 text-sm text-lme-danger hover:bg-white/5 rounded-lg flex items-center gap-2 font-medium mt-1"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            )}

            <main className={`flex-1 p-4 sm:p-6 xl:p-8 ${compactEmbed ? 'overflow-x-auto pasos-board-embed-main' : ''}`}>
                {isReadOnlyBoard && (
                    <div className="mb-4 rounded-2xl border border-lme-warning/30 bg-lme-warning/10 p-4 text-sm text-lme-warning/85">
                        Estás en modo solo lectura para este tablero de equipo. Puedes consultarlo, pero no editarlo desde este perfil.
                    </div>
                )}

                {!isClassroomWorkspace && !currentBoard && (
                    <WorkspaceContextBar
                        allowPersonalWorkspace={false}
                        onRequestCreateBoard={(boardType) => {
                            if (!canCreateBoardInWorkspace) return;
                            setCreateBoardPreset(boardType ?? null);
                            setCreateBoardDialogOpen(true);
                        }}
                    />
                )}

                {!currentBoard && isClassroomWorkspace && canCreateBoardInWorkspace && (
                    <ClassroomTemplatePicker
                        onPickTemplate={(type) => {
                            setCreateBoardPreset(type);
                            setCreateBoardDialogOpen(true);
                        }}
                    />
                )}

                {!currentBoard && (!isClassroomWorkspace || !canCreateBoardInWorkspace) && (
                    <EmptyWorkspaceNotice
                        isClassroomWorkspace={isClassroomWorkspace}
                        canCreateBoard={canCreateBoardInWorkspace}
                        onCreateBoard={() => {
                            if (!canCreateBoardInWorkspace) return;
                            setCreateBoardPreset(null);
                            setCreateBoardDialogOpen(true);
                        }}
                    />
                )}

                {currentBoard && (
                    <div className={`flex items-start ${compactEmbed ? 'gap-4 flex-col' : 'flex-row'}`}>

                        {/* ── Área principal: Kanban — se oculta (en xl) cuando hay un panel
                            lateral activo para dejarle todo el ancho; la tira de iconos
                            conserva el botón «Kanban» para volver ── */}
                        <div className={compactEmbed
                            ? ''
                            : `flex-1 min-w-0 overflow-x-auto transition-all duration-200${activeSidePanel ? ' xl:hidden' : ''}`
                        }>
                            <section className={`rounded-2xl border border-lme-border bg-lme-surface-alt/65 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-5 xl:p-6 ${compactEmbed ? 'pasos-board-embed-shell' : ''}`}>
                                {!compactEmbed && (
                                    <div className="mb-3 border-b-2 border-ink pb-3">
                                        <p className="plate-mono font-semibold text-fisico">
                                            {isClassroomWorkspace ? 'Kanban de aula' : currentBoard.contextType === 'team' ? 'Kanban de equipo' : 'Kanban de organización'}
                                        </p>
                                        <h2 className="mt-1 text-xl font-black text-ink truncate">
                                            {currentBoard.title}
                                        </h2>
                                    </div>
                                )}

                                <div className={compactEmbed ? '' : 'mt-4'}>
                                    <BoardToolbar
                                        onSearch={setSearchQuery}
                                        onFilterColor={setFilterColor}
                                        activeFilter={filterColor}
                                        taskCount={filteredTasks.length}
                                        trashCount={deletedForBoard.length}
                                        onOpenTrash={() => setShowTrash(true)}
                                        selectionMode={isClassroomWorkspace ? selectionMode : false}
                                        selectedCount={selectedTaskIds.length}
                                        onToggleSelectionMode={isClassroomWorkspace ? handleToggleSelectionMode : undefined}
                                        onOpenSequence={isClassroomWorkspace ? () => navigate(getWorkspaceSubPath('classroom', 'secuencia')) : undefined}
                                        onClearSelection={isClassroomWorkspace ? clearTaskSelection : undefined}
                                    />
                                </div>

                                <div className={`${compactEmbed ? 'mt-3' : 'mt-4'} overflow-x-auto pb-2`}>
                                    <DndContext
                                        sensors={sensors}
                                        onDragStart={onDragStart}
                                        onDragOver={onDragOver}
                                        onDragEnd={onDragEnd}
                                    >
                                        <div className="h-full min-w-full flex items-start gap-4 sm:min-w-max sm:gap-6">
                                            {columns.map(col => {
                                                const colTasks = filteredTasks.filter(t => t.columnId === col.id);
                                                const isCompletedColumn = col.title.toLowerCase().includes('terminado') || col.title.toLowerCase().includes('hecho');
                                                return (
                                                    <BoardColumn
                                                        key={col.id}
                                                        column={col}
                                                        tasks={colTasks}
                                                        onAddTask={handleAddTask}
                                                        onDeleteColumn={handleDeleteColumn}
                                                        onEditColumn={handleEditColumn}
                                                        onDeleteTask={(taskId) => {
                                                            if (isCompletedColumn) triggerConfetti();
                                                            deleteTask(taskId);
                                                            showUndoToast();
                                                        }}
                                                        onTaskClick={handleTaskClick}
                                                        selectionMode={selectionMode}
                                                        selectedTaskIds={selectedTaskIds}
                                                        onToggleTaskSelect={toggleTaskSelection}
                                                        readOnly={isReadOnlyBoard}
                                                    />
                                                );
                                            })}

                                            {!isReadOnlyBoard && (
                                                <button onClick={handleAddColumn} className="w-[min(20rem,calc(100vw-3rem))] sm:w-80 h-16 rounded-xl border border-dashed border-line text-sub hover:text-ink hover:border-lme-primary hover:bg-lme-primary/5 transition-all flex items-center justify-center gap-2 font-medium">
                                                    <Plus className="w-5 h-5" />
                                                    Nueva Columna
                                                </button>
                                            )}
                                        </div>

                                        {createPortal(
                                            <DragOverlay dropAnimation={dropAnimation}>
                                                {activeDragTask && (
                                                    <TaskCard
                                                        task={activeDragTask}
                                                        onClick={() => { }}
                                                        onDelete={() => { }}
                                                    />
                                                )}
                                            </DragOverlay>,
                                            document.body
                                        )}
                                    </DndContext>
                                </div>
                            </section>
                        </div>

                        {/* ── Sidebar: panel expandido + tira de iconos ── */}
                        {!compactEmbed && (
                            <BoardSidebar
                                board={currentBoard}
                                isProUser={isProUser}
                                isClassroomWorkspace={isClassroomWorkspace}
                                isReadOnlyBoard={isReadOnlyBoard}
                                canCreateBoardInWorkspace={canCreateBoardInWorkspace}
                                columns={columns}
                                activePanel={activeSidePanel}
                                onChangePanel={setActiveSidePanel}
                                onQuickCreateTask={handleQuickCreateTask}
                                onRequestCreateBoard={(boardType) => {
                                    setCreateBoardPreset(boardType ?? null);
                                    setCreateBoardDialogOpen(true);
                                }}
                                onSelectLearner={setSelectedLearnerKey}
                                shareCode={shareCode}
                                shareSource={shareSource}
                                shareExpiresAt={shareExpiresAt}
                                existingShare={existingShare}
                                remoteInsights={remoteInsights}
                                remoteInsightsLoading={remoteInsightsLoading}
                                remoteInsightsError={remoteInsightsError}
                            />
                        )}
                    </div>
                )}
            </main>

            {editingTask && (
                <TaskModal taskId={editingTask} onClose={() => setEditingTask(null)} readOnly={isReadOnlyBoard} />
            )}

            {/* Confetti animation */}
            {ConfettiComponent}

            {/* Aviso de deshacer borrado */}
            {showUndo && lastDeleted && (
                <UndoDeleteToast
                    lastDeleted={lastDeleted}
                    onUndo={() => {
                        restoreDeletedTask(lastDeleted.task.id);
                        setShowUndo(false);
                        if (undoTimeoutRef.current) {
                            window.clearTimeout(undoTimeoutRef.current);
                            undoTimeoutRef.current = null;
                        }
                    }}
                />
            )}

            {/* Papelera del tablero */}
            {showTrash && (
                <BoardTrashModal
                    entries={deletedForBoard}
                    onRestore={restoreDeletedTask}
                    onClose={() => setShowTrash(false)}
                />
            )}

            {/* Modal de compartir */}
            {showShareModal && (
                <BoardShareModal
                    isSharing={isSharing}
                    shareCode={shareCode}
                    shareError={shareError}
                    shareSource={shareSource}
                    shareExpiresAt={shareExpiresAt}
                    codeCopied={codeCopied}
                    onCopy={handleCopyCode}
                    onClose={() => setShowShareModal(false)}
                />
            )}
            {/* AI Wizard Modal */}
            {showAIWizard && (
                <AIWizardModal
                    onClose={() => { setShowAIWizard(false); setSessionDrop(null); }}
                    initialInput={sessionDrop?.content}
                    initialFileName={sessionDrop?.fileName}
                    workspaceContext={{
                        organizationId: currentBoard?.organizationId ?? effectiveOrganizationId,
                        teamId: currentBoard?.teamId ?? effectiveTeamId,
                        contextType: currentBoard?.contextType ?? (effectiveTeamId ? 'team' : effectiveOrganizationId ? 'organization' : 'personal'),
                        boardType: currentBoard?.boardType ?? (effectiveTeamId ? 'team_coordination' : effectiveOrganizationId ? 'organization_project' : 'learning_sequence'),
                    }}
                />
            )}

            {showTemplateLibrary && (
                <BoardTemplateDialog
                    currentBoard={currentBoard ?? null}
                    onClose={() => setShowTemplateLibrary(false)}
                />
            )}

            {showStorageCenter && (
                <StorageControlCenter onClose={() => setShowStorageCenter(false)} />
            )}

            {showDocumentsPanel && (
                <BoardDocumentsPanel
                    board={currentBoard}
                    isProUser={isProUser}
                    readOnly={isReadOnlyBoard}
                    onClose={() => setShowDocumentsPanel(false)}
                />
            )}

            {currentBoard && showAssignmentsDialog && (
                <BoardAssignmentsDialog
                    boardId={currentBoard.id}
                    boardTitle={currentBoard.title}
                    learners={remoteInsights?.learners}
                    onClose={() => setShowAssignmentsDialog(false)}
                />
            )}

            {currentBoard && selectedLearner && (
                <LearnerReviewDialog
                    board={currentBoard}
                    learner={selectedLearner}
                    onClose={() => setSelectedLearnerKey(null)}
                    onSaved={(updatedLearner) => {
                        setRemoteInsights((current) => {
                            if (!current) return current;
                            return {
                                ...current,
                                learners: current.learners.map((learner) => (
                                    learner.learner_key === updatedLearner.learner_key ? updatedLearner : learner
                                )),
                            };
                        });
                    }}
                />
            )}

            {columnDialog && (
                <TextActionDialog
                    title={columnDialog.mode === 'create' ? 'Nueva columna' : 'Renombrar columna'}
                    description={columnDialog.mode === 'create'
                        ? 'Escribe un nombre claro para la nueva columna del tablero.'
                        : 'Actualiza el nombre de la columna para reflejar mejor su función.'}
                    value={columnDialog.value}
                    confirmLabel={columnDialog.mode === 'create' ? 'Crear columna' : 'Guardar nombre'}
                    onValueChange={(value) => setColumnDialog({ ...columnDialog, value })}
                    onClose={() => setColumnDialog(null)}
                    onConfirm={submitColumnDialog}
                />
            )}

            {createBoardDialogOpen && (
                <CreateBoardDialog
                    isProUser={isProUser}
                    currentOrganizationId={effectiveOrganizationId}
                    currentTeamId={effectiveTeamId}
                    initialBoardType={createBoardPreset}
                    onClose={() => {
                        setCreateBoardDialogOpen(false);
                        setCreateBoardPreset(null);
                    }}
                    onConfirm={submitCreateBoard}
                />
            )}

            {columnToDelete && (
                <ConfirmDialog
                    title="Eliminar columna"
                    description={`Se eliminará la columna "${columnToDelete.title}" y sus tareas asociadas. Esta acción puede deshacerse desde la papelera del tablero.`}
                    confirmLabel="Eliminar columna"
                    onClose={() => setColumnToDelete(null)}
                    onConfirm={() => {
                        deleteColumn(columnToDelete.id);
                        logAppEvent({
                            type: 'column_deleted',
                            level: 'warning',
                            message: 'Se eliminó una columna del tablero.',
                            metadata: { title: columnToDelete.title },
                        });
                        setColumnToDelete(null);
                    }}
                />
            )}
        </div>
    );
}

export default BoardView;
