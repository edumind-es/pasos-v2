import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

/**
 * La etiqueta que pide escribir el nombre va en versalitas por CSS, asi que
 * una organizacion llamada "Personal" se lee en pantalla como "PERSONAL".
 * Cuando la comparacion distinguia mayusculas, quien escribia justo lo que
 * leia no conseguia activar el boton: la organizacion no habia forma de
 * eliminarla.
 */
function montar(name: string, onConfirm = vi.fn()) {
    render(
        <ConfirmDeleteDialog
            kind="organización"
            name={name}
            warning="Se archivará."
            onCancel={vi.fn()}
            onConfirm={onConfirm}
        />
    );
    return {
        onConfirm,
        caja: screen.getByPlaceholderText('Nombre exacto'),
        boton: screen.getByRole('button', { name: /eliminar definitivamente/i }),
    };
}

describe('ConfirmDeleteDialog', () => {
    it('arranca con el botón deshabilitado', () => {
        const { boton } = montar('Personal');
        expect(boton).toBeDisabled();
    });

    it('acepta el nombre tal cual', async () => {
        const { caja, boton } = montar('Personal');
        await userEvent.type(caja, 'Personal');
        expect(boton).toBeEnabled();
    });

    it('acepta el nombre en mayúsculas, que es como lo pinta la etiqueta', async () => {
        const { caja, boton } = montar('Personal');
        await userEvent.type(caja, 'PERSONAL');
        expect(boton).toBeEnabled();
    });

    it('tolera espacios sobrantes al copiar y pegar', async () => {
        const { caja, boton } = montar('CEIP Campolongo 2026');
        await userEvent.type(caja, '  ceip campolongo 2026  ');
        expect(boton).toBeEnabled();
    });

    it('sigue rechazando un nombre que no es el suyo', async () => {
        const { caja, boton } = montar('Personal');
        await userEvent.type(caja, 'Persona');
        expect(boton).toBeDisabled();
    });

    it('muestra el nombre real, sin forzarlo a mayúsculas', () => {
        montar('Personal');
        const etiqueta = screen.getByText('Personal', { selector: 'span' });
        expect(etiqueta.className).toContain('normal-case');
    });
});
