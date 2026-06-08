export interface TaskColorOption {
    value: string;
    label: string;
    einkLabel: string;
}

export const TASK_COLOR_OPTIONS: TaskColorOption[] = [
    { value: '#FF6B6B', label: 'Rojo', einkLabel: 'Etiqueta roja' },
    { value: '#4ECDC4', label: 'Turquesa', einkLabel: 'Etiqueta turquesa' },
    { value: '#45B7D1', label: 'Azul', einkLabel: 'Etiqueta azul' },
    { value: '#96CEB4', label: 'Menta', einkLabel: 'Etiqueta menta' },
    { value: '#FFEEAD', label: 'Amarillo', einkLabel: 'Etiqueta amarilla' },
    { value: '#D4A5A5', label: 'Rosa', einkLabel: 'Etiqueta rosa' },
    { value: '#9B59B6', label: 'Morado', einkLabel: 'Etiqueta morada' },
];

export function getTaskColorLabel(color?: string | null): string | null {
    if (!color) return null;
    return TASK_COLOR_OPTIONS.find((option) => option.value.toLowerCase() === color.toLowerCase())?.label ?? 'Color personalizado';
}

export function getTaskColorEinkLabel(color?: string | null): string | null {
    if (!color) return null;
    return TASK_COLOR_OPTIONS.find((option) => option.value.toLowerCase() === color.toLowerCase())?.einkLabel ?? 'Etiqueta con color';
}
