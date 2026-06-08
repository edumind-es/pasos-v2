import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type Board } from '../store/boardStore';
import {
    completeSsoLogin,
    getApiErrorMessage,
    getCurrentProUser,
    listRemoteBoards,
    mapRemoteBoardToLocalBoard,
    syncRemoteBoard,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

function fingerprintBoard(board: Board): string {
    return JSON.stringify({
        title: board.title,
        columns: board.columns,
        tasks: board.tasks,
    });
}

export function ProSessionManager() {
    const {
        boards,
        currentUser,
        activeBoardId,
        lastProSyncAt,
        login,
        logout,
        mergeBoardsForOwner,
        setActiveBoard,
        setProSyncStatus,
    } = useStore();
    const [hydratedProUserId, setHydratedProUserId] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const syncedFingerprintsRef = useRef<Map<string, string>>(new Map());
    const embeddedRestoreAttemptedRef = useRef(false);

    const proBoards = useMemo(() => {
        if (!currentUser || currentUser.mode !== 'pro') return [];
        return boards.filter(board => {
            if (board.remoteRole) {
                return board.remoteRole !== 'viewer';
            }
            return board.ownerId === currentUser.id;
        });
    }, [boards, currentUser]);

    const proBoardEntries = useMemo(() => {
        return proBoards.map(board => ({
            board,
            fingerprint: fingerprintBoard(board),
        }));
    }, [proBoards]);

    const needsHydration = Boolean(
        currentUser
        && currentUser.mode === 'pro'
        && hydratedProUserId !== currentUser.id
    );

    useEffect(() => {
        if (currentUser || embeddedRestoreAttemptedRef.current || typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const isEmbedded = params.get('embed') === '1' || params.get('board') === '1' || window.self !== window.top;
        const hasPasosSessionCookie = document.cookie.split('; ').some(cookie => cookie.startsWith('pasos_csrf='));
        if (!isEmbedded || !hasPasosSessionCookie) {
            return;
        }

        embeddedRestoreAttemptedRef.current = true;
        let cancelled = false;

        void (async () => {
            try {
                const authResponse = await completeSsoLogin();
                if (cancelled) return;

                login(authResponse.user.display_name?.trim() || authResponse.user.email, 'teacher', {
                    mode: 'pro',
                    email: authResponse.user.email,
                    remoteId: authResponse.user.id,
                    workspaceCode: authResponse.user.workspace_code,
                });

                const remoteBoards = await listRemoteBoards();
                if (cancelled) return;

                const localBoards = remoteBoards.map(board => mapRemoteBoardToLocalBoard(board, authResponse.user.id));
                mergeBoardsForOwner(authResponse.user.id, localBoards);
                syncedFingerprintsRef.current = new Map(
                    localBoards.map(board => [board.id, fingerprintBoard(board)])
                );

                const nextState = useStore.getState();
                const activeBoard = nextState.boards.find(board => board.id === nextState.activeBoardId);
                if (!activeBoard || activeBoard.ownerId !== authResponse.user.id) {
                    const firstOwnedBoard = nextState.boards.find(board => board.ownerId === authResponse.user.id);
                    if (firstOwnedBoard) {
                        setActiveBoard(firstOwnedBoard.id);
                    }
                }

                setHydratedProUserId(authResponse.user.id);
                setSyncError(null);
                setProSyncStatus('idle', { at: new Date().toISOString(), error: null });
                logAppEvent({
                    type: 'pro_session_restored_from_board_embed',
                    level: 'info',
                    message: 'La sesion Pro se restauro automaticamente dentro de EDUmind Board.',
                    metadata: { board_count: localBoards.length },
                });
            } catch {
                if (!cancelled) {
                    setProSyncStatus('idle', { at: lastProSyncAt, error: null });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentUser, lastProSyncAt, login, mergeBoardsForOwner, setActiveBoard, setProSyncStatus]);

    useEffect(() => {
        if (!currentUser || currentUser.mode !== 'pro' || !needsHydration) {
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                const [remoteUser, remoteBoards] = await Promise.all([
                    getCurrentProUser(),
                    listRemoteBoards(),
                ]);
                if (cancelled) return;

                login(remoteUser.display_name?.trim() || remoteUser.email, 'teacher', {
                    mode: 'pro',
                    email: remoteUser.email,
                    remoteId: remoteUser.id,
                    workspaceCode: remoteUser.workspace_code,
                });

                const localBoards = remoteBoards.map(board => mapRemoteBoardToLocalBoard(board, remoteUser.id));
                mergeBoardsForOwner(remoteUser.id, localBoards);
                syncedFingerprintsRef.current = new Map(
                    localBoards.map(board => [board.id, fingerprintBoard(board)])
                );

                const nextState = useStore.getState();
                const activeBoard = nextState.boards.find(board => board.id === nextState.activeBoardId);
                if (!activeBoard || activeBoard.ownerId !== remoteUser.id) {
                    const firstOwnedBoard = nextState.boards.find(board => board.ownerId === remoteUser.id);
                    if (firstOwnedBoard) {
                        setActiveBoard(firstOwnedBoard.id);
                    }
                }

                setHydratedProUserId(remoteUser.id);
                setSyncError(null);
                setProSyncStatus('idle', { at: new Date().toISOString(), error: null });
                logAppEvent({
                    type: 'pro_session_restored',
                    level: 'info',
                    message: 'La sesión Pro se restauró y cargó los tableros remotos.',
                    metadata: { board_count: localBoards.length },
                });
            } catch (error) {
                if (cancelled) return;
                syncedFingerprintsRef.current.clear();
                const message = getApiErrorMessage(error, 'La sesion Pro no pudo restaurarse. Vuelve a iniciar sesion.');
                setSyncError(message);
                setProSyncStatus('error', { at: null, error: message });
                logAppEvent({
                    type: 'pro_session_restore_failed',
                    level: 'error',
                    message,
                });
                logout();
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentUser, login, logout, mergeBoardsForOwner, needsHydration, setActiveBoard, setProSyncStatus]);

    useEffect(() => {
        if (!currentUser || currentUser.mode !== 'pro' || hydratedProUserId !== currentUser.id) {
            return;
        }

        const pendingBoards = proBoardEntries.filter(({ board, fingerprint }) => (
            syncedFingerprintsRef.current.get(board.id) !== fingerprint
        ));

        if (pendingBoards.length === 0) {
            return;
        }

        let cancelled = false;
        setProSyncStatus('syncing', {
            at: lastProSyncAt,
            error: null,
        });
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    for (const { board, fingerprint } of pendingBoards) {
                        await syncRemoteBoard(board, {
                            preferCreate: !syncedFingerprintsRef.current.has(board.id),
                        });
                        if (cancelled) return;
                        syncedFingerprintsRef.current.set(board.id, fingerprint);
                    }
                    if (!cancelled) {
                        const syncedAt = new Date().toISOString();
                        setSyncError(null);
                        setProSyncStatus('idle', { at: syncedAt, error: null });
                        logAppEvent({
                            type: 'pro_board_sync_success',
                            level: 'info',
                            message: 'Los cambios del tablero se sincronizaron con Pasos Pro.',
                            metadata: { board_count: pendingBoards.length },
                        });
                    }
                } catch (error) {
                    if (cancelled) return;
                    const message = getApiErrorMessage(error, 'No se pudo sincronizar el tablero con Pasos Pro.');
                    setSyncError(message);
                    setProSyncStatus('error', { at: lastProSyncAt, error: message });
                    logAppEvent({
                        type: 'pro_board_sync_failed',
                        level: 'error',
                        message,
                        metadata: { board_count: pendingBoards.length },
                    });
                }
            })();
        }, 900);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [currentUser, hydratedProUserId, lastProSyncAt, proBoardEntries, setProSyncStatus]);

    const showHydrationBanner = Boolean(currentUser?.mode === 'pro' && needsHydration);
    const showSyncError = Boolean(currentUser?.mode === 'pro' && !needsHydration && syncError);
    const activeBoard = boards.find(board => board.id === activeBoardId);

    return (
        <>
            {showHydrationBanner && (
                <div className="fixed top-4 left-1/2 z-modal -translate-x-1/2 rounded-full border border-mint/30 bg-lme-surface-alt px-4 py-2 text-sm text-ink shadow-2xl">
                    Restaurando sesion Pro y cargando tableros remotos...
                </div>
            )}
            {showSyncError && activeBoard && (
                <div className="fixed top-4 left-1/2 z-modal -translate-x-1/2 rounded-full border border-lme-danger/30 bg-lme-surface-alt px-4 py-2 text-sm text-lme-danger/80 shadow-2xl">
                    {syncError}
                </div>
            )}
        </>
    );
}
