import { useEffect, useMemo, useState } from 'react';
import { getBoardInsights, getApiErrorMessage, type ProBoardInsightsResponse } from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

const INSIGHTS_POLL_INTERVAL_MS = 15000;

/**
 * Seguimiento remoto del tablero (insights Pro): carga inicial y refresco
 * periódico mientras el tablero de aula esté activo con cuenta Pro.
 */
export function useBoardInsights(params: {
    isProUser: boolean;
    currentBoardId: string | null;
    isClassroomWorkspace: boolean;
    shareCode: string | null;
    shareExpiresAt: string | null;
}) {
    const { isProUser, currentBoardId, isClassroomWorkspace, shareCode, shareExpiresAt } = params;

    const [remoteInsights, setRemoteInsights] = useState<ProBoardInsightsResponse | null>(null);
    const [remoteInsightsLoading, setRemoteInsightsLoading] = useState(false);
    const [remoteInsightsError, setRemoteInsightsError] = useState<string | null>(null);
    const [selectedLearnerKey, setSelectedLearnerKey] = useState<string | null>(null);

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
        }, INSIGHTS_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [currentBoardId, isClassroomWorkspace, isProUser, shareCode, shareExpiresAt]);

    const selectedLearner = useMemo(() => (
        remoteInsights?.learners.find((learner) => learner.learner_key === selectedLearnerKey) ?? null
    ), [remoteInsights?.learners, selectedLearnerKey]);

    return {
        remoteInsights, setRemoteInsights,
        remoteInsightsLoading,
        remoteInsightsError,
        selectedLearnerKey, setSelectedLearnerKey,
        selectedLearner,
    };
}
