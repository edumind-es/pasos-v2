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

import { useMemo, useEffect } from 'react';
import { useBoardViewState } from '../hooks/useBoardViewState';
import { Layout, Plus, User, Play, Download, Share2, Copy, Check, Sparkles, LogOut, Layers3, FileDown, Database, CalendarDays, CalendarRange, UserRoundPlus, FileText, Network, Building2, AlertCircle, ListChecks, RefreshCcw, ClipboardList, ArrowRight, Palette, GraduationCap } from 'lucide-react';
import { useBoardStore, useStore } from '../store/boardStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TaskModal from '../components/TaskModal';
import AIWizardModal from '../components/AIWizardModal';
import { BoardSwitcherButton } from '../components/BoardSwitcherButton';
import { ClassroomQuickCreate } from '../components/ClassroomQuickCreate';
import { EditableBoardTitle } from '../components/EditableBoardTitle';
import { TextActionDialog } from '../components/TextActionDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HeaderOverflowMenu } from '../components/HeaderOverflowMenu';
import { SidebarIconStrip, CLASSROOM_SIDEBAR_PANELS, ORG_SIDEBAR_PANELS, type SidebarPanelDef } from '../components/SidebarIconStrip';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragStartEvent, type DragOverEvent, defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { BoardColumn } from '../components/BoardColumn';
import { TaskCard } from '../components/TaskCard';
// ThemeSwitcher eliminado - Ahora solo usamos el tema profesional
import { BoardToolbar } from '../components/BoardToolbar';
import { useConfetti } from '../hooks/useConfetti';
import { AccessibilityControls } from '../components/AccessibilityControls';
import { generateShareCode, saveSharedBoard, getSharedBoards, type SharedBoard } from '../utils/shareCode';
import { BoardInsightsPanel } from '../components/BoardInsightsPanel';
import { BoardTemplateDialog } from '../components/BoardTemplateDialog';
import { StorageControlCenter } from '../components/StorageControlCenter';
import { WorkspaceContextBar } from '../components/WorkspaceContextBar';
import { CreateBoardDialog } from '../components/CreateBoardDialog';
import { LearnerReviewDialog } from '../components/LearnerReviewDialog';
import { BoardAssignmentsDialog } from '../components/BoardAssignmentsDialog';
import { BoardDocumentsPanel } from '../components/BoardDocumentsPanel';
import { TeamActivityPanel } from '../components/TeamActivityPanel';
import { TeamCoordinationPanel } from '../components/TeamCoordinationPanel';
import { TeamMeetingPanel } from '../components/TeamMeetingPanel';
import { downloadBoardReportHtml } from '../utils/boardReports';
import type { SupportedBoardType } from '../utils/boardPresets';
import { getWorkspaceModeFromPath, getWorkspaceSubPath, matchesWorkspaceContext } from '../utils/workspaceRoutes';
import {
    createRemoteShare,
    getBoardInsights,
    getApiErrorMessage,
    logoutProUser,
    syncRemoteBoard,
} from '../services/pasosApi';
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
        proSyncState,
        lastProSyncAt,
        lastProSyncError,
        createBoard,
        setActiveBoard,
        workspacePanelPreferences,
        setWorkspacePanelPreference,
        visualMode,
        setVisualMode,
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
    } = useBoardViewState();

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
    const columns = useMemo(() => currentBoard?.columns ?? [], [currentBoard]);
    const tasks = useMemo(() => currentBoard?.tasks ?? [], [currentBoard]);
    const isReadOnlyBoard = Boolean(isProUser && currentBoard?.remoteRole === 'viewer');
    const selectionMode = Boolean(activeBoardId && selectionBoardId === activeBoardId);
    const deletedForBoard = useMemo(() => {
        if (!activeBoardId) return [];
        return deletedTasks.filter(entry => entry.boardId === activeBoardId);
    }, [deletedTasks, activeBoardId]);
    const lastDeleted = deletedForBoard[deletedForBoard.length - 1];
    const selectedLearner = useMemo(() => (
        remoteInsights?.learners.find((learner) => learner.learner_key === selectedLearnerKey) ?? null
    ), [remoteInsights?.learners, selectedLearnerKey]);
    // Get existing share code for current board
    const existingShare = getSharedBoards().find(s => s.boardId === activeBoardId);

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
        if (!isProUser || !currentBoardId || !isClassroomWorkspace) {
            setRemoteInsights(null);
            setRemoteInsightsLoading(false);
            setRemoteInsightsError(null);
            setSelectedLearnerKey(null);
            return;
        }

        let cancelled = false;

        const loadInsights = async () => {
            setRemoteInsightsLoading(true);
            try {
                const payload = await getBoardInsights(currentBoardId);
                if (!cancelled) {
                    setRemoteInsights(payload);
                    setRemoteInsightsError(null);
                }
            } catch (error) {
                if (cancelled) return;
                const message = getApiErrorMessage(error, 'No se pudo cargar el seguimiento remoto del tablero.');
                setRemoteInsightsError(message);
                logAppEvent({
                    type: 'board_insights_load_failed',
                    level: 'warning',
                    message,
                    metadata: { board_id: currentBoardId },
                });
            } finally {
                if (!cancelled) {
                    setRemoteInsightsLoading(false);
                }
            }
        };

        void loadInsights();
        const timer = window.setInterval(() => {
            void loadInsights();
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [currentBoardId, isClassroomWorkspace, isProUser, shareCode, shareExpiresAt]);

    useEffect(() => {
        return () => {
            if (undoTimeoutRef.current) {
                window.clearTimeout(undoTimeoutRef.current);
            }
        };
    }, []);

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

    // Handle share button click
    const handleShare = async () => {
        setShowShareModal(true);
        setCodeCopied(false);
        setShareError(null);
        setShareExpiresAt(null);
        setShareCode(null);
        setIsSharing(true);

        try {
            if (!currentBoard || !activeBoardId) {
                setShareError('No hay un tablero activo para compartir.');
                return;
            }

            if (isProUser) {
                if (currentBoard.contextType === 'team' || currentBoard.contextType === 'organization') {
                    setShareError('Los tableros de equipo y claustro no admiten enlaces anonimos todavia. Usa este espacio como coordinacion interna.');
                    return;
                }
                const remoteBoard = await syncRemoteBoard(currentBoard);
                const remoteShare = await createRemoteShare(remoteBoard.id);
                const shared: SharedBoard = {
                    code: remoteShare.code,
                    boardId: remoteBoard.id,
                    boardTitle: remoteBoard.title,
                    createdAt: new Date().toISOString(),
                    expiresAt: remoteShare.expires_at,
                };
                saveSharedBoard(shared);
                setShareSource('pro');
                setShareCode(remoteShare.code);
                setShareExpiresAt(remoteShare.expires_at);
                logAppEvent({
                    type: 'board_share_created',
                    level: 'info',
                    message: 'Se generó un enlace sincronizado para compartir el tablero.',
                    metadata: { source: 'pro', board_id: remoteBoard.id, context_type: currentBoard.contextType ?? 'personal' },
                });
                return;
            }

            if (existingShare) {
                setShareSource('local');
                setShareCode(existingShare.code);
                setShareExpiresAt(existingShare.expiresAt ?? null);
                logAppEvent({
                    type: 'board_share_reused',
                    level: 'info',
                    message: 'Se reutilizó un enlace local ya existente para el tablero.',
                    metadata: { source: 'local', board_id: existingShare.boardId },
                });
                return;
            }

            const code = generateShareCode();
            const shared: SharedBoard = {
                code,
                boardId: activeBoardId,
                boardTitle: currentBoard.title,
                createdAt: new Date().toISOString()
            };
            saveSharedBoard(shared);
            setShareSource('local');
            setShareCode(code);
            logAppEvent({
                type: 'board_share_created',
                level: 'info',
                message: 'Se generó un enlace local para compartir el tablero.',
                metadata: { source: 'local', board_id: activeBoardId },
            });
        } catch (error) {
            const message = getApiErrorMessage(error, 'No se pudo generar el enlace compartido.');
            setShareError(message);
            logAppEvent({
                type: 'board_share_failed',
                level: 'error',
                message,
                metadata: { source: isProUser ? 'pro' : 'local' },
            });
        } finally {
            setIsSharing(false);
        }
    };

    // Copy code to clipboard
    const handleCopyCode = async () => {
        if (shareCode) {
            const shareUrl = `${window.location.origin}/codigo?code=${shareCode}`;
            await navigator.clipboard.writeText(shareUrl);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
            logAppEvent({
                type: 'share_link_copied',
                level: 'info',
                message: 'Se copió el enlace compartido al portapapeles.',
            });
        }
    };

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
        return (
            <div className="min-h-screen bg-lme-background px-4 py-6 text-lme-text sm:px-6 xl:px-8">
                <div className="mx-auto max-w-4xl">
                    <Link to="/" className="inline-flex items-center gap-2 text-sub transition-colors hover:text-ink">
                        <Layout className="h-4 w-4" />
                        Volver al panel de acceso
                    </Link>
                    <section className="mt-8 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-8">
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Claustro</p>
                        <h1 className="mt-2 text-3xl font-black text-ink">
                            Este espacio es para trabajo institucional Pro
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-sub">
                            Pasos Claustro permite gestionar organizaciones, equipos, coordinación y seguimiento
                            institucional. Requiere una cuenta Pro docente vinculada al servidor de tu centro.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 rounded-full bg-sky px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80"
                            >
                                Acceder con cuenta Pro
                            </Link>
                            <Link
                                to="/aula"
                                className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                            >
                                Ir a Pasos Aula
                            </Link>
                        </div>
                        <p className="mt-6 text-xs text-sub max-w-xl">
                            Si tu centro tiene Pasos Pro activo, el administrador puede facilitarte las credenciales
                            o la URL de acceso directo.
                        </p>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen text-lme-text flex flex-col font-sans ${compactEmbed ? 'pasos-board-embed' : ''}`}>
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
                        <div className="flex items-center bg-black/20 border border-line rounded-full p-0.5 shrink-0">
                            <Link
                                to="/aula"
                                className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-full transition-colors ${isClassroomWorkspace ? 'bg-sky/20 text-sky' : 'text-sub hover:text-ink'}`}
                            >
                                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden min-[380px]:inline">Aula</span>
                            </Link>
                            {isProUser && (
                                <Link
                                    to="/organizacion"
                                    className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-full transition-colors ${!isClassroomWorkspace ? 'bg-mint/20 text-mint' : 'text-sub hover:text-ink'}`}
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
                                className="flex items-center gap-1.5 px-2 sm:px-4 py-2 rounded-full border border-sky/30 bg-sky/10 text-sky hover:bg-sky/20 transition-colors text-sm font-medium"
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
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20 transition-colors text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Share2 className="w-4 h-4" />
                                Compartir
                            </button>
                        )}

                        {/* Menú de acciones secundarias */}
                        <HeaderOverflowMenu
                            items={[
                                { kind: 'action' as const, label: visualMode === 'eink' ? 'Modo EDUmind (color)' : 'Modo E-Ink', icon: <Palette className="w-4 h-4 text-sub" />, onClick: () => setVisualMode(visualMode === 'eink' ? 'edumind' : 'eink') },
                                { kind: 'separator' as const },
                                ...(isClassroomWorkspace ? [
                                    { kind: 'link' as const, label: 'Hoy', icon: <CalendarDays className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath('classroom', 'hoy') },
                                ] : []),
                                { kind: 'link' as const, label: 'Agenda', icon: <CalendarRange className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath(workspaceMode, 'agenda') },
                                { kind: 'link' as const, label: 'Cronograma', icon: <Network className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath(workspaceMode, 'timeline') },
                                ...(!isClassroomWorkspace ? [
                                    { kind: 'link' as const, label: 'Centro', icon: <Building2 className="w-4 h-4 text-sub" />, href: getWorkspaceSubPath('organization', 'centro') },
                                ] : []),
                                { kind: 'separator' as const },
                                { kind: 'action' as const, label: 'Documentos', icon: <FileText className="w-4 h-4 text-sub" />, onClick: () => setShowDocumentsPanel(true), disabled: !currentBoard },
                                { kind: 'action' as const, label: 'Plantillas', icon: <Layers3 className="w-4 h-4 text-sub" />, onClick: () => setShowTemplateLibrary(true) },
                                { kind: 'action' as const, label: 'Informe', icon: <FileDown className="w-4 h-4 text-sub" />, onClick: handlePedagogicalExport, disabled: !currentBoard },
                                { kind: 'action' as const, label: 'Backup JSON', icon: <Download className="w-4 h-4 text-sub" />, onClick: handleExport },
                                { kind: 'action' as const, label: 'IA / Magia', icon: <Sparkles className="w-4 h-4 text-sub" />, onClick: () => setShowAIWizard(true) },
                            ]}
                        />

                        {/* Badge error sync — solo texto en sm+ */}
                        {isProUser && lastProSyncError && (
                            <button
                                type="button"
                                title={lastProSyncError}
                                onClick={() => setShowUserMenu(true)}
                                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-full border border-lme-danger/40 bg-lme-danger/10 text-lme-danger/80 text-xs font-semibold transition-colors hover:bg-lme-danger/20"
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
                    <section className="mb-4 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-6">
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Aula</p>
                        <h2 className="mt-2 text-2xl font-black text-ink">Elige una plantilla para empezar</h2>
                        <p className="mt-2 text-sm leading-6 text-sub max-w-2xl">
                            Cada plantilla configura las columnas del Kanban para un tipo de trabajo pedagógico. Puedes editarlo después.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {([
                                {
                                    type: 'learning_sequence' as const,
                                    icon: <ListChecks className="w-5 h-5 text-sky" />,
                                    title: 'Secuencia de aprendizaje',
                                    desc: 'Pasos ordenados: Por hacer → En marcha → Listo',
                                    accent: 'border-sky/20 bg-sky/5 hover:border-sky/40',
                                },
                                {
                                    type: 'learning_routine' as const,
                                    icon: <RefreshCcw className="w-5 h-5 text-mint" />,
                                    title: 'Rutina visual',
                                    desc: 'Preparado → Ahora → Terminado. Ideal para rutinas diarias.',
                                    accent: 'border-mint/20 bg-mint/5 hover:border-mint/40',
                                },
                                {
                                    type: 'student_plan' as const,
                                    icon: <ClipboardList className="w-5 h-5 text-vio" />,
                                    title: 'Plan individual',
                                    desc: 'Organización personalizada para un alumno o grupo concreto.',
                                    accent: 'border-vio/20 bg-vio/5 hover:border-vio/40',
                                },
                            ]).map(({ type, icon, title, desc, accent }) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                        setCreateBoardPreset(type);
                                        setCreateBoardDialogOpen(true);
                                    }}
                                    className={`group text-left rounded-2xl border p-4 transition-all ${accent}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="rounded-xl bg-white/5 p-2">{icon}</div>
                                        <ArrowRight className="w-4 h-4 text-sub opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                    </div>
                                    <p className="mt-3 text-sm font-bold text-ink">{title}</p>
                                    <p className="mt-1 text-xs leading-5 text-sub">{desc}</p>
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => { setCreateBoardPreset(null); setCreateBoardDialogOpen(true); }}
                                className="text-sm font-medium text-sub hover:text-ink transition-colors underline underline-offset-2"
                            >
                                Crear tablero vacío
                            </button>
                            <Link to="/" className="text-sm font-medium text-sub hover:text-ink transition-colors">
                                Volver al panel de acceso
                            </Link>
                        </div>
                    </section>
                )}

                {!currentBoard && (!isClassroomWorkspace || !canCreateBoardInWorkspace) && (
                    <section className="mb-4 rounded-3xl border border-lme-border bg-lme-surface-alt/70 p-6">
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">
                            {isClassroomWorkspace ? 'Pasos Aula' : 'Pasos Claustro'}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-ink">
                            {isClassroomWorkspace
                                ? 'Todavía no hay un tablero activo en tu espacio de aula'
                                : 'Selecciona o crea una organización para empezar'}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-sub">
                            {isClassroomWorkspace
                                ? 'Crea tu primer tablero de aula desde este espacio y empezarás a ver la secuencia, la presentación y el seguimiento pedagógico.'
                                : 'El trabajo institucional vive en un espacio distinto. Primero elige una organización o un equipo y después crea el tablero correspondiente.'}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!canCreateBoardInWorkspace) return;
                                    setCreateBoardPreset(null);
                                    setCreateBoardDialogOpen(true);
                                }}
                                disabled={!canCreateBoardInWorkspace}
                                className="rounded-full bg-sky px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-sky/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isClassroomWorkspace ? 'Crear tablero de aula' : 'Crear tablero organizativo'}
                            </button>
                            <Link
                                to="/"
                                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white/5"
                            >
                                Volver al panel de acceso
                            </Link>
                        </div>
                    </section>
                )}

                {currentBoard && (
                    <div className={`flex items-start ${compactEmbed ? 'gap-4 flex-col' : 'flex-row'}`}>

                        {/* ── Área principal: Kanban — se oculta cuando hay panel activo ── */}
                        <div className={compactEmbed
                            ? ''
                            : `flex-1 min-w-0 overflow-x-auto transition-all duration-200${activeSidePanel ? ' hidden' : ''}`
                        }>
                            <section className={`rounded-2xl border border-lme-border bg-lme-surface-alt/65 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-5 xl:p-6 ${compactEmbed ? 'pasos-board-embed-shell' : ''}`}>
                                {!compactEmbed && (
                                    <div className="mb-3">
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sub">
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
                        {!compactEmbed && (() => {
                            const isTeamBoard = currentBoard.contextType === 'team' && isProUser && !isClassroomWorkspace;
                            const sidebarPanels: SidebarPanelDef[] = isClassroomWorkspace
                                ? CLASSROOM_SIDEBAR_PANELS.map((p) => ({ ...p, available: true }))
                                : ORG_SIDEBAR_PANELS.map((p) => ({
                                    ...p,
                                    available: p.key === 'workspace_context' || isTeamBoard,
                                }));

                            const activeDef = sidebarPanels.find((p) => p.key === activeSidePanel);

                            const renderPanelContent = () => {
                                if (!activeSidePanel) return null;
                                if (isClassroomWorkspace) {
                                    if (activeSidePanel === 'quick_create') {
                                        return (
                                            <ClassroomQuickCreate
                                                columns={columns}
                                                disabled={isReadOnlyBoard || !currentBoard}
                                                onCreate={handleQuickCreateTask}
                                            />
                                        );
                                    }
                                    return (
                                        <BoardInsightsPanel
                                            board={currentBoard}
                                            shareCode={shareCode ?? existingShare?.code ?? null}
                                            shareSource={shareCode ? shareSource : (existingShare ? 'local' : shareSource)}
                                            shareExpiresAt={shareExpiresAt ?? existingShare?.expiresAt ?? null}
                                            proSyncState={proSyncState}
                                            lastProSyncAt={lastProSyncAt}
                                            lastProSyncError={lastProSyncError}
                                            remoteInsights={remoteInsights}
                                            remoteInsightsLoading={remoteInsightsLoading}
                                            remoteInsightsError={remoteInsightsError}
                                            onSelectLearner={setSelectedLearnerKey}
                                            panelPreferences={{
                                                teacher_summary: workspacePanelPreferences.teacher_summary,
                                                teacher_share_sync: workspacePanelPreferences.teacher_share_sync,
                                                teacher_recent_activity: workspacePanelPreferences.teacher_recent_activity,
                                                teacher_learners: workspacePanelPreferences.teacher_learners,
                                            }}
                                            onUpdatePanelPreference={setWorkspacePanelPreference}
                                        />
                                    );
                                }
                                if (activeSidePanel === 'workspace_context') {
                                    return (
                                        <WorkspaceContextBar
                                            allowPersonalWorkspace={false}
                                            onRequestCreateBoard={(boardType) => {
                                                if (!canCreateBoardInWorkspace) return;
                                                setCreateBoardPreset(boardType ?? null);
                                                setCreateBoardDialogOpen(true);
                                            }}
                                        />
                                    );
                                }
                                if (activeSidePanel === 'team_coordination') return <TeamCoordinationPanel board={currentBoard} />;
                                if (activeSidePanel === 'team_meeting') return <TeamMeetingPanel board={currentBoard} readOnly={isReadOnlyBoard} />;
                                if (activeSidePanel === 'team_activity') return <TeamActivityPanel board={currentBoard} readOnly={isReadOnlyBoard} />;
                                return null;
                            };

                            return (
                                <>
                                    {/* Panel expandido */}
                                    {activeSidePanel && activeDef && (
                                        <aside className="pasos-sidebar hidden xl:flex flex-col flex-1 min-w-0 border-l border-lme-border/50 overflow-y-auto animate-in slide-in-from-right-4 duration-200" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
                                            <div className="flex items-center px-4 py-3 border-b border-lme-border/50 shrink-0">
                                                <div>
                                                    <p className="text-xs font-bold text-ink">{activeDef.label}</p>
                                                    <p className="text-[11px] text-sub mt-0.5 leading-4">{activeDef.help}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col gap-4">
                                                {renderPanelContent()}
                                            </div>
                                        </aside>
                                    )}
                                    {/* Tira de iconos */}
                                    <SidebarIconStrip
                                        panels={sidebarPanels}
                                        activePanel={activeSidePanel}
                                        onToggle={(key) => setActiveSidePanel(activeSidePanel === key ? null : key)}
                                        onShowKanban={() => setActiveSidePanel(null)}
                                    />
                                </>
                            );
                        })()}
                    </div>
                )}
            </main>

            {editingTask && (
                <TaskModal taskId={editingTask} onClose={() => setEditingTask(null)} readOnly={isReadOnlyBoard} />
            )}

            {/* Confetti animation */}
            {ConfettiComponent}

            {/* Undo Delete Toast */}
            {showUndo && lastDeleted && (
                <div className="fixed bottom-6 right-6 z-dropdown-backdrop bg-lme-surface-alt border border-lme-border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <div>
                        <p className="text-sm text-ink font-medium">Tarea eliminada</p>
                        <p className="text-xs text-sub truncate max-w-[220px]">{lastDeleted.task.title}</p>
                    </div>
                    <button
                        onClick={() => {
                            restoreDeletedTask(lastDeleted.task.id);
                            setShowUndo(false);
                            if (undoTimeoutRef.current) {
                                window.clearTimeout(undoTimeoutRef.current);
                                undoTimeoutRef.current = null;
                            }
                        }}
                        className="px-3 py-1.5 text-sm font-bold bg-mint/20 text-mint rounded-lg hover:bg-mint/30 transition-colors"
                    >
                        Deshacer
                    </button>
                </div>
            )}

            {/* Trash Modal */}
            {showTrash && (
                <div className="fixed inset-0 z-dropdown flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="glass-panel p-6 rounded-2xl max-w-lg w-full mx-4 animate-scale-in">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-ink">Papelera del tablero</h2>
                                <p className="text-xs text-sub">Recupera tareas eliminadas recientemente.</p>
                            </div>
                            <button onClick={() => setShowTrash(false)} className="text-sub hover:text-ink">
                                ✕
                            </button>
                        </div>

                        {deletedForBoard.length === 0 ? (
                            <div className="text-sm text-sub bg-black/20 p-4 rounded-xl text-center">
                                No hay tareas para recuperar.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {deletedForBoard.slice().reverse().map(entry => (
                                    <div
                                        key={entry.task.id}
                                        className="flex items-center justify-between gap-3 bg-lme-surface p-3 rounded-xl border border-lme-border"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm text-ink font-medium truncate">{entry.task.title}</p>
                                            <p className="text-xs text-sub">
                                                Eliminada: {new Date(entry.deletedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => restoreDeletedTask(entry.task.id)}
                                            className="px-3 py-1.5 text-xs font-bold bg-sky/20 text-sky rounded-lg hover:bg-sky/30 transition-colors"
                                        >
                                            Restaurar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowTrash(false)}
                            className="w-full mt-4 py-2 text-sub hover:text-ink text-sm transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-dropdown flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="glass-panel p-8 rounded-2xl max-w-md w-full mx-4 animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint/20 flex items-center justify-center">
                                <Share2 className="w-8 h-8 text-mint" />
                            </div>
                            <h2 className="text-xl font-bold text-ink mb-2">Compartir Tablero</h2>
                            <p className="text-sub text-sm">
                                {isSharing
                                    ? 'Preparando el enlace compartido...'
                                    : shareError
                                        ? 'No hemos podido generar el enlace compartido.'
                                        : shareSource === 'pro'
                                            ? 'Este enlace ya se resuelve mediante backend y funciona entre dispositivos.'
                                            : 'Beta local: este código solo debe considerarse operativo en el mismo navegador o dispositivo.'}
                            </p>
                        </div>

                        {/* Code display */}
                        <div className="bg-lme-surface rounded-xl p-4 mb-4">
                            <p className="text-xs text-sub mb-2 text-center">Código de acceso</p>
                            <div className="text-3xl font-mono font-bold text-mint text-center tracking-widest">
                                {isSharing ? '...' : shareCode ?? '----'}
                            </div>
                        </div>

                        {shareError && (
                            <div className="mb-4 p-3 rounded-lg border border-lme-danger/30 bg-lme-danger/10 text-sm text-lme-danger/80">
                                {shareError}
                            </div>
                        )}

                        {shareExpiresAt && (
                            <div className="mb-4 p-3 rounded-lg bg-black/20 text-xs text-sub">
                                Disponible hasta: {new Date(shareExpiresAt).toLocaleString()}
                            </div>
                        )}

                        {/* Copy button */}
                        <button
                            onClick={handleCopyCode}
                            disabled={!shareCode || isSharing || Boolean(shareError)}
                            className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                                      ${codeCopied
                                    ? 'bg-mint text-bg0'
                                    : 'bg-lme-surface border border-lme-border text-ink hover:bg-white/5'}
                                      disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {codeCopied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    ¡Enlace copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copiar enlace de acceso
                                </>
                            )}
                        </button>

                        {/* Direct URL */}
                        <div className="mt-4 p-3 bg-black/20 rounded-lg">
                            <p className="text-xs text-sub mb-1">
                                {shareSource === 'pro' ? 'Enlace de acceso sincronizado:' : 'Enlace de acceso beta local:'}
                            </p>
                            <p className="text-xs font-mono text-sky break-all">
                                {shareCode ? `${window.location.origin}/codigo?code=${shareCode}` : 'Pendiente de generar'}
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full mt-4 py-2 text-sub hover:text-ink text-sm transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
            {/* AI Wizard Modal */}
            {showAIWizard && (
                <AIWizardModal
                    onClose={() => setShowAIWizard(false)}
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
