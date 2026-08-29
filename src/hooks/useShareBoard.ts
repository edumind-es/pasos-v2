import { useState } from 'react';
import type { Board } from '../store/boardStore';
import { generateShareCode, saveSharedBoard, getSharedBoards, type SharedBoard } from '../utils/shareCode';
import { createRemoteShare, getApiErrorMessage, syncRemoteBoard } from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

export type ShareSource = 'local' | 'pro';

/**
 * Estado y acciones para compartir un tablero con el alumnado.
 * En modo Pro sincroniza el tablero y genera un enlace de backend;
 * en modo local genera un código que solo funciona en el mismo navegador.
 */
export function useShareBoard(params: {
    currentBoard: Board | null;
    activeBoardId: string | null;
    isProUser: boolean;
}) {
    const { currentBoard, activeBoardId, isProUser } = params;

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareCode, setShareCode] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSource, setShareSource] = useState<ShareSource>('local');
    const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);

    // Enlace local ya generado para el tablero activo (si existe)
    const existingShare = getSharedBoards().find(s => s.boardId === activeBoardId);

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

    return {
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
    };
}
