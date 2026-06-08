import type { Column } from '../store/boardStore';

export type SupportedBoardType =
    | 'learning_sequence'
    | 'learning_routine'
    | 'student_plan'
    | 'team_coordination'
    | 'meeting_followup'
    | 'department_project'
    | 'organization_project';

export const SUPPORTED_BOARD_TYPES: readonly SupportedBoardType[] = [
    'learning_sequence',
    'learning_routine',
    'student_plan',
    'team_coordination',
    'meeting_followup',
    'department_project',
    'organization_project',
];

export function isSupportedBoardType(value: string | null | undefined): value is SupportedBoardType {
    return Boolean(value && SUPPORTED_BOARD_TYPES.includes(value as SupportedBoardType));
}

export function getBoardTypeOptions(contextType: 'personal' | 'organization' | 'team') {
    if (contextType === 'team') {
        return [
            { value: 'team_coordination', label: 'Coordinación de equipo' },
            { value: 'meeting_followup', label: 'Seguimiento de reuniones' },
            { value: 'department_project', label: 'Proyecto de departamento' },
        ] as const;
    }

    if (contextType === 'organization') {
        return [
            { value: 'organization_project', label: 'Proyecto de centro' },
            { value: 'meeting_followup', label: 'Seguimiento organizativo' },
        ] as const;
    }

    return [
        { value: 'learning_sequence', label: 'Secuencia de aprendizaje' },
        { value: 'learning_routine', label: 'Rutina visual' },
        { value: 'student_plan', label: 'Plan individual' },
    ] as const;
}

export function getDefaultBoardType(contextType: 'personal' | 'organization' | 'team'): SupportedBoardType {
    return getBoardTypeOptions(contextType)[0].value;
}

export function getDefaultColumnsForBoardType(boardType: SupportedBoardType): Array<Pick<Column, 'title' | 'order'>> {
    switch (boardType) {
        case 'learning_routine':
            return [
                { title: 'Preparado', order: 0 },
                { title: 'Ahora', order: 1 },
                { title: 'Terminado', order: 2 },
            ];
        case 'student_plan':
            return [
                { title: 'Objetivos', order: 0 },
                { title: 'En marcha', order: 1 },
                { title: 'Validado', order: 2 },
            ];
        case 'team_coordination':
            return [
                { title: 'Pendiente', order: 0 },
                { title: 'En marcha', order: 1 },
                { title: 'Bloqueado', order: 2 },
                { title: 'Cerrado', order: 3 },
            ];
        case 'meeting_followup':
            return [
                { title: 'Agenda', order: 0 },
                { title: 'En curso', order: 1 },
                { title: 'Acordado', order: 2 },
                { title: 'Seguimiento', order: 3 },
            ];
        case 'department_project':
        case 'organization_project':
            return [
                { title: 'Planificado', order: 0 },
                { title: 'En marcha', order: 1 },
                { title: 'En riesgo', order: 2 },
                { title: 'Completado', order: 3 },
            ];
        case 'learning_sequence':
        default:
            return [
                { title: 'Por hacer', order: 0 },
                { title: 'En proceso', order: 1 },
                { title: 'Terminado', order: 2 },
            ];
    }
}
