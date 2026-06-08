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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout, ArrowLeft, User2, Info, PartyPopper } from 'lucide-react';
import { StudentTaskCard } from '../components/StudentTaskCard';
import { useStore } from '../store/boardStore';
import {
    findSharedBoardByCode,
    getStudentProgress,
    normalizeShareCode,
    setTaskHelpRequest,
    syncStudentProgressFromRemote,
    toggleTaskCompletion,
    upsertStudentEvidence,
    type SharedBoard
} from '../utils/shareCode';
import { AccessibilityControls } from '../components/AccessibilityControls';
import { StudentTaskDialog } from '../components/StudentTaskDialog';
import {
    getApiErrorMessage,
    mapRemoteBoardToLocalBoard,
    recordRemoteShareActivity,
    resolveRemoteShare,
    type ShareActivityPayload,
    type ProShareResolveResponse,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

const SHARE_LEARNER_KEY_PREFIX = 'pasos-share-learner';
const STUDENT_ALIAS_KEY = 'pasos-student-alias';

function getOrCreateLearnerKey(code: string): string {
    const storageKey = `${SHARE_LEARNER_KEY_PREFIX}:${code}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(storageKey, created);
    return created;
}

function getStoredLearnerAlias(): string | undefined {
    const value = localStorage.getItem(STUDENT_ALIAS_KEY)?.trim();
    return value ? value : undefined;
}

export default function SharedBoardView() {
    const { code } = useParams<{ code: string }>();
    const normalizedCode = code ? normalizeShareCode(code) : null;
    const { boards } = useStore();
    const [progressVersion, setProgressVersion] = useState(0);
    const [remoteShare, setRemoteShare] = useState<ProShareResolveResponse | null>(null);
    const [remoteError, setRemoteError] = useState<string | null>(null);
    const [remoteProgressError, setRemoteProgressError] = useState<string | null>(null);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const accessReportedRef = useRef<Set<string>>(new Set());

    const localSharedBoard: SharedBoard | null = useMemo(() => {
        if (!normalizedCode) return null;
        return findSharedBoardByCode(normalizedCode);
    }, [normalizedCode]);

    const localBoard = useMemo(() => {
        if (!localSharedBoard) return null;
        return boards.find(item => item.id === localSharedBoard.boardId) ?? null;
    }, [boards, localSharedBoard]);

    useEffect(() => {
        if (!normalizedCode || (localSharedBoard && localBoard)) {
            return;
        }

        let cancelled = false;

        resolveRemoteShare(normalizedCode)
            .then((payload) => {
                if (cancelled) return;
                setRemoteShare(payload);
                setRemoteError(null);
                logAppEvent({
                    type: 'shared_board_resolved_remote',
                    level: 'info',
                    message: 'El tablero compartido se resolvió desde Pasos Pro.',
                    metadata: { code: normalizedCode },
                });
            })
            .catch((error) => {
                if (cancelled) return;
                setRemoteShare(null);
                const message = getApiErrorMessage(error, 'No se pudo resolver el tablero compartido.');
                setRemoteError(message);
                logAppEvent({
                    type: 'shared_board_resolve_failed',
                    level: 'error',
                    message,
                    metadata: { code: normalizedCode },
                });
            })
            .finally(() => {
                if (cancelled) return;
            });

        return () => {
            cancelled = true;
        };
    }, [localBoard, localSharedBoard, normalizedCode]);

    const sharedBoard = useMemo<SharedBoard | null>(() => {
        if (localSharedBoard) return localSharedBoard;
        if (!remoteShare) return null;
        return {
            code: remoteShare.code,
            boardId: remoteShare.board.id,
            boardTitle: remoteShare.board.title,
            createdAt: remoteShare.board.created_at,
            expiresAt: remoteShare.expires_at,
        };
    }, [localSharedBoard, remoteShare]);

    const board = useMemo(() => {
        if (localBoard) return localBoard;
        if (!remoteShare) return null;
        return mapRemoteBoardToLocalBoard(remoteShare.board, 'remote-share');
    }, [localBoard, remoteShare]);

    const progress = useMemo(() => {
        void progressVersion;
        if (!normalizedCode) return null;
        return getStudentProgress(normalizedCode);
    }, [normalizedCode, progressVersion]);
    const learnerKey = useMemo(() => (
        normalizedCode ? getOrCreateLearnerKey(normalizedCode) : null
    ), [normalizedCode]);
    const learnerAlias = progress?.alias?.trim() || getStoredLearnerAlias();

    const isResolvingRemote = Boolean(normalizedCode && (!localSharedBoard || !localBoard) && !remoteShare && !remoteError);

    const error = !isResolvingRemote && !sharedBoard
        ? (remoteError || 'Este codigo no es valido o ha expirado.')
        : !isResolvingRemote && !board
            ? 'El tablero compartido no esta disponible en este navegador ni en el backend Pro.'
            : null;

    const applyRemoteProgress = useCallback((payload: {
        learner_label: string | null;
        completed_task_ids: string[];
        help_task_ids: string[];
        validated_task_ids: string[];
        evidence_entries: Array<{ task_id: string; note: string | null; url: string | null; submitted_at: string }>;
        feedback_entries: Array<{ task_id: string; message: string; status: 'comment' | 'needs_revision' | 'validated'; author_label: string | null; created_at: string }>;
        last_access_at: string;
    }) => {
        if (!normalizedCode) return;
        syncStudentProgressFromRemote(normalizedCode, {
            learnerLabel: payload.learner_label ?? undefined,
            completedTaskIds: payload.completed_task_ids,
            helpTaskIds: payload.help_task_ids,
            validatedTaskIds: payload.validated_task_ids,
            evidenceEntries: payload.evidence_entries,
            feedbackEntries: payload.feedback_entries,
            lastAccessAt: payload.last_access_at,
        });
        setProgressVersion((value) => value + 1);
    }, [normalizedCode]);

    const handleToggleTask = (taskId: string) => {
        if (!normalizedCode) return;

        const nextCompleted = [...(progress?.completedTasks ?? [])];
        const currentIndex = nextCompleted.indexOf(taskId);
        if (currentIndex >= 0) {
            nextCompleted.splice(currentIndex, 1);
        } else {
            nextCompleted.push(taskId);
        }

        toggleTaskCompletion(normalizedCode, taskId);
        setProgressVersion(value => value + 1);

        if (remoteShare && learnerKey) {
            const eventType: ShareActivityPayload['event_type'] = nextCompleted.length === totalTasks && totalTasks > 0
                ? 'board_completed'
                : 'progress_updated';

            void recordRemoteShareActivity(normalizedCode, {
                learner_key: learnerKey,
                learner_label: learnerAlias,
                event_type: eventType,
                completed_task_ids: nextCompleted,
                help_task_ids: progress?.helpTaskIds ?? [],
                evidence_entries: (progress?.evidenceEntries ?? []).map((entry) => ({
                    task_id: entry.taskId,
                    note: entry.note,
                    url: entry.url,
                    submitted_at: entry.submittedAt,
                })),
                last_access_at: new Date().toISOString(),
            }).then((payload) => {
                applyRemoteProgress(payload);
                setRemoteProgressError(null);
                logAppEvent({
                    type: eventType === 'board_completed' ? 'student_remote_board_completed' : 'student_remote_progress_synced',
                    level: 'info',
                    message: eventType === 'board_completed'
                        ? 'El progreso del alumno quedó completado en Pasos Pro.'
                        : 'El progreso del alumno se sincronizó con Pasos Pro.',
                    metadata: { code: normalizedCode },
                });
            }).catch((error) => {
                const message = getApiErrorMessage(error, 'No se pudo sincronizar el progreso del alumno.');
                setRemoteProgressError(message);
                logAppEvent({
                    type: 'student_remote_progress_failed',
                    level: 'error',
                    message,
                    metadata: { code: normalizedCode },
                });
            });
        }
    };

    const handleToggleHelp = (taskId: string) => {
        if (!normalizedCode) return;
        const nextNeedsHelp = !(progress?.helpTaskIds ?? []).includes(taskId);
        const nextProgress = setTaskHelpRequest(normalizedCode, taskId, nextNeedsHelp);
        setProgressVersion((value) => value + 1);

        if (remoteShare && learnerKey) {
            void recordRemoteShareActivity(normalizedCode, {
                learner_key: learnerKey,
                learner_label: learnerAlias,
                event_type: 'progress_updated',
                completed_task_ids: nextProgress.completedTasks,
                help_task_ids: nextProgress.helpTaskIds,
                evidence_entries: (nextProgress.evidenceEntries ?? []).map((entry) => ({
                    task_id: entry.taskId,
                    note: entry.note,
                    url: entry.url,
                    submitted_at: entry.submittedAt,
                })),
                last_access_at: new Date().toISOString(),
            }).then((payload) => {
                applyRemoteProgress(payload);
                setRemoteProgressError(null);
            }).catch((error) => {
                const message = getApiErrorMessage(error, 'No se pudo registrar la solicitud de ayuda.');
                setRemoteProgressError(message);
            });
        }
    };

    const handleSaveEvidence = (taskId: string, payload: { note?: string; url?: string }) => {
        if (!normalizedCode) return;
        if (!payload.note && !payload.url) return;
        const nextProgress = upsertStudentEvidence(normalizedCode, {
            taskId,
            note: payload.note,
            url: payload.url,
            submittedAt: new Date().toISOString(),
        });
        setProgressVersion((value) => value + 1);

        if (remoteShare && learnerKey) {
            void recordRemoteShareActivity(normalizedCode, {
                learner_key: learnerKey,
                learner_label: learnerAlias,
                event_type: 'progress_updated',
                completed_task_ids: nextProgress.completedTasks,
                help_task_ids: nextProgress.helpTaskIds ?? [],
                evidence_entries: (nextProgress.evidenceEntries ?? []).map((entry) => ({
                    task_id: entry.taskId,
                    note: entry.note,
                    url: entry.url,
                    submitted_at: entry.submittedAt,
                })),
                last_access_at: new Date().toISOString(),
            }).then((response) => {
                applyRemoteProgress(response);
                setRemoteProgressError(null);
            }).catch((error) => {
                const message = getApiErrorMessage(error, 'No se pudo sincronizar la evidencia del alumno.');
                setRemoteProgressError(message);
            });
        }
    };

    const isTaskCompleted = (taskId: string): boolean => {
        return progress?.completedTasks.includes(taskId) || false;
    };

    const isTaskHelpRequested = (taskId: string): boolean => {
        return progress?.helpTaskIds?.includes(taskId) || false;
    };

    const isTaskValidated = (taskId: string): boolean => {
        return progress?.validatedTaskIds?.includes(taskId) || false;
    };

    const getTaskEvidence = (taskId: string) => {
        return progress?.evidenceEntries?.find((entry) => entry.taskId === taskId);
    };

    const getTaskFeedback = (taskId: string) => {
        return (progress?.feedbackEntries ?? []).filter((entry) => entry.taskId === taskId);
    };

    // Calculate progress stats
    const columns = board?.columns ?? [];
    const tasks = board?.tasks ?? [];
    const totalTasks = tasks.length;
    const completedCount = progress?.completedTasks.length || 0;
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    useEffect(() => {
        if (!normalizedCode || !remoteShare || !learnerKey || !board) {
            return;
        }

        const accessKey = `${normalizedCode}:${learnerKey}`;
        if (accessReportedRef.current.has(accessKey)) {
            return;
        }

        accessReportedRef.current.add(accessKey);

        void recordRemoteShareActivity(normalizedCode, {
            learner_key: learnerKey,
            learner_label: learnerAlias,
            event_type: 'accessed',
            completed_task_ids: progress?.completedTasks ?? [],
            last_access_at: new Date().toISOString(),
        }).then((payload) => {
            applyRemoteProgress(payload);
            setRemoteProgressError(null);
            logAppEvent({
                type: 'student_remote_access_synced',
                level: 'info',
                message: 'El acceso del alumno quedó registrado en Pasos Pro.',
                metadata: { code: normalizedCode },
            });
        }).catch((error) => {
            const message = getApiErrorMessage(error, 'No se pudo registrar el acceso del alumno en Pasos Pro.');
            setRemoteProgressError(message);
            logAppEvent({
                type: 'student_remote_access_failed',
                level: 'error',
                message,
                metadata: { code: normalizedCode },
            });
        });
    }, [applyRemoteProgress, board, learnerAlias, learnerKey, normalizedCode, progress?.completedTasks, remoteShare]);

    if (!normalizedCode) {
        return <Navigate to="/codigo" replace />;
    }

    if (isResolvingRemote && !board) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-lme-background to-[#0f1a2e] flex flex-col items-center justify-center p-6">
                <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
                    <div className="w-14 h-14 rounded-full border-2 border-mint/30 border-t-mint animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-ink mb-2">Buscando tablero</h2>
                    <p className="text-sub">Estamos comprobando si este codigo existe en tu navegador o en Pasos Pro.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-lme-background to-[#0f1a2e] flex flex-col items-center justify-center p-6">
                <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
                    <Info className="w-16 h-16 text-sub mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-ink mb-2">Código no válido</h2>
                    <p className="text-sub mb-6">{error}</p>
                    <Link
                        to="/codigo"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-sky rounded-lg text-bg0 font-bold hover:bg-sky/80 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a intentar
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-lme-background to-[#0f1a2e] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-sticky glass-panel border-b border-lme-border/50 px-4 py-4 sm:px-6">
                <div className="max-w-[1400px] mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            to="/codigo"
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            title="Cambiar código"
                        >
                            <ArrowLeft className="w-5 h-5 text-sub" />
                        </Link>
                        <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center">
                            <Layout className="text-mint w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-ink truncate">
                                {sharedBoard?.boardTitle || 'Tablero'}
                            </h1>
                            <p className="text-xs text-sub">
                                Código: <span className="font-mono">{normalizedCode}</span>
                                {learnerAlias && <span> · Alumno: <span className="text-ink">{learnerAlias}</span></span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        {/* Progress indicator */}
                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-lme-border">
                            <div className="text-sm">
                                <span className="font-bold text-mint">{completedCount}</span>
                                <span className="text-sub">/{totalTasks}</span>
                            </div>
                            <div className="w-24 h-2 bg-lme-surface rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-mint to-sky transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-xs text-sub">{progressPercent}%</span>
                        </div>

                        {/* Accessibility */}
                        <AccessibilityControls />

                        {/* Student avatar */}
                        <div className="w-10 h-10 rounded-full bg-vio/20 flex items-center justify-center border border-vio/30">
                            <User2 className="w-5 h-5 text-vio" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile progress bar */}
            <div className="sm:hidden px-6 py-3 bg-lme-surface/50">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-mint">{completedCount}/{totalTasks}</span>
                    <div className="flex-1 h-2 bg-lme-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-mint to-sky transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-sm text-sub">{progressPercent}%</span>
                </div>
            </div>

            {remoteProgressError && (
                <div className="px-4 pt-4 sm:px-6">
                    <div className="mx-auto max-w-[1400px] rounded-xl border border-lme-warning/30 bg-lme-warning/10 p-3 text-sm text-lme-warning/85">
                        {remoteProgressError}
                    </div>
                </div>
            )}

            {/* Main content - Board columns */}
            <main className="flex-1 overflow-x-auto p-4 sm:p-6">
                <div className="flex min-w-full gap-4 sm:min-w-max sm:gap-6">
                    {columns.map(column => {
                        const columnTasks = tasks.filter(t => t.columnId === column.id);

                        return (
                            <div key={column.id} className="w-[min(20rem,calc(100vw-3rem))] sm:w-80 flex-shrink-0">
                                {/* Column header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-lg font-bold text-ink">{column.title}</h2>
                                    <span className="text-sm text-sub px-2 py-0.5 bg-white/5 rounded-full">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                {/* Tasks */}
                                <div className="space-y-3">
                                    {columnTasks.length === 0 ? (
                                        <div className="p-6 border-2 border-dashed border-lme-border rounded-xl text-center text-sub text-sm">
                                            Sin tareas
                                        </div>
                                    ) : (
                                        columnTasks.map(task => (
                                            <StudentTaskCard
                                                key={task.id}
                                                task={task}
                                                isCompleted={isTaskCompleted(task.id)}
                                                needsHelp={isTaskHelpRequested(task.id)}
                                                feedbackCount={getTaskFeedback(task.id).length}
                                                onToggle={() => handleToggleTask(task.id)}
                                                onOpenDetails={() => setActiveTaskId(task.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {board && activeTaskId && (
                <StudentTaskDialog
                    key={activeTaskId}
                    task={board.tasks.find((task) => task.id === activeTaskId) ?? board.tasks[0]!}
                    isCompleted={isTaskCompleted(activeTaskId)}
                    needsHelp={isTaskHelpRequested(activeTaskId)}
                    isValidated={isTaskValidated(activeTaskId)}
                    evidenceEntry={getTaskEvidence(activeTaskId)}
                    feedbackEntries={getTaskFeedback(activeTaskId)}
                    onClose={() => setActiveTaskId(null)}
                    onToggleComplete={() => handleToggleTask(activeTaskId)}
                    onToggleHelp={() => handleToggleHelp(activeTaskId)}
                    onSaveEvidence={(payload) => handleSaveEvidence(activeTaskId, payload)}
                />
            )}

            {/* Celebración al completar */}
            {progressPercent === 100 && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-modal backdrop-blur-sm">
                    <div className="glass-panel p-8 rounded-2xl text-center max-w-sm mx-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-4 border border-mint/30">
                            <PartyPopper className="w-8 h-8 text-mint" />
                        </div>
                        <h2 className="text-2xl font-bold text-ink mb-2">¡Completado!</h2>
                        <p className="text-sub leading-6">Has terminado todas las tareas. ¡Buen trabajo!</p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-2.5 bg-mint/20 text-mint font-semibold rounded-full border border-mint/30 hover:bg-mint/30 transition-colors text-sm"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
