import { describe, expect, it } from 'vitest';
import {
    PasosApiError,
    getApiErrorMessage,
    mapRemoteBoardToLocalBoard,
    type ProBoardResponse,
} from './pasosApi';

describe('getApiErrorMessage', () => {
    it('devuelve el mensaje de un PasosApiError', () => {
        const error = new PasosApiError('Sesión caducada', 401, 'token_expired');
        expect(getApiErrorMessage(error, 'fallback')).toBe('Sesión caducada');
        expect(error.status).toBe(401);
        expect(error.code).toBe('token_expired');
    });

    it('devuelve el mensaje de un Error genérico', () => {
        expect(getApiErrorMessage(new Error('Fallo de red'), 'fallback')).toBe('Fallo de red');
    });

    it('usa el fallback para errores desconocidos o vacíos', () => {
        expect(getApiErrorMessage('cadena', 'fallback')).toBe('fallback');
        expect(getApiErrorMessage(new Error(''), 'fallback')).toBe('fallback');
        expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
    });
});

describe('mapRemoteBoardToLocalBoard', () => {
    const remoteBoard: ProBoardResponse = {
        id: 'board-1',
        title: 'Tablero remoto',
        owner_id: 'owner-remote',
        organization_id: null,
        team_id: null,
        context_type: null,
        board_type: null,
        role: 'owner',
        snapshot: {
            columns: [{ id: 'col-1', title: 'Por hacer', order: 0 }],
            tasks: [],
        },
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
    } as unknown as ProBoardResponse;

    it('mapea campos snake_case a camelCase con defaults seguros', () => {
        const board = mapRemoteBoardToLocalBoard(remoteBoard, 'fallback-owner');
        expect(board.id).toBe('board-1');
        expect(board.ownerId).toBe('owner-remote');
        expect(board.contextType).toBe('personal');
        expect(board.organizationId).toBeUndefined();
        expect(board.teamId).toBeUndefined();
        expect(board.columns).toHaveLength(1);
        expect(board.createdAt).toBe(Date.parse('2026-01-15T10:00:00Z'));
    });

    it('usa el ownerId de respaldo cuando el remoto no lo trae', () => {
        const board = mapRemoteBoardToLocalBoard(
            { ...remoteBoard, owner_id: '' } as ProBoardResponse,
            'fallback-owner',
        );
        expect(board.ownerId).toBe('fallback-owner');
    });

    it('usa Date.now como respaldo si la fecha remota es inválida', () => {
        const before = Date.now();
        const board = mapRemoteBoardToLocalBoard(
            { ...remoteBoard, created_at: 'no-es-fecha' } as ProBoardResponse,
            'fallback-owner',
        );
        expect(board.createdAt).toBeGreaterThanOrEqual(before);
    });
});
