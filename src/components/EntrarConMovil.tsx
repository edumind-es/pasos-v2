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

// «Entrar con el móvil»: el ordenador del aula enseña un QR y el docente lo
// aprueba desde su teléfono. En la pantalla compartida no se teclea nada.
import { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import {
    consultarEntradaMovil,
    iniciarEntradaMovil,
    PasosApiError,
    type EntradaMovil,
} from '../services/pasosApi';

/** Cada cuánto se pregunta al backend si el móvil ya aprobó (lo que marca Authentik). */
const INTERVALO_MS = 5000;

type Fase =
    | { tipo: 'cargando' }
    | { tipo: 'qr'; entrada: EntradaMovil; qr: string; caducaEn: number }
    | { tipo: 'fin'; mensaje: string };

export function EntrarConMovilDialog({ onClose, onAprobada }: { onClose: () => void; onAprobada: () => void }) {
    const [fase, setFase] = useState<Fase>({ tipo: 'cargando' });
    const [ahora, setAhora] = useState(() => Date.now());
    // En una ref para que un redibujado del padre no reinicie el sondeo.
    const onAprobadaRef = useRef(onAprobada);
    onAprobadaRef.current = onAprobada;
    const cerrarRef = useRef<HTMLButtonElement>(null);

    async function generarQr() {
        setFase({ tipo: 'cargando' });
        try {
            const entrada = await iniciarEntradaMovil();
            const { default: QRCode } = await import('qrcode');
            const qr = await QRCode.toDataURL(entrada.enlace, {
                width: 360,
                margin: 2,
                color: { dark: '#111111', light: '#ffffff' },
            });
            const t = Date.now();
            setAhora(t);
            setFase({ tipo: 'qr', entrada, qr, caducaEn: t + entrada.caduca_en * 1000 });
        } catch (error) {
            setFase({
                tipo: 'fin',
                mensaje:
                    error instanceof PasosApiError && error.status === 429
                        ? 'Se han pedido demasiados QR en la última hora. Espera un poco o entra con EDUmind SSO.'
                        : 'No se pudo generar el QR. Comprueba la conexión e inténtalo otra vez.',
            });
        }
    }

    // Al abrir se genera el QR una sola vez; nunca se renueva solo
    // (Authentik admite 20 solicitudes por hora desde el servidor).
    useEffect(() => {
        void generarQr();
        cerrarRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (fase.tipo !== 'qr') return;
        let activo = true;
        const reloj = window.setInterval(() => setAhora(Date.now()), 1000);
        const sondeo = window.setInterval(async () => {
            try {
                const estado = await consultarEntradaMovil();
                if (!activo || estado === 'pendiente') return;
                if (estado === 'aprobada') onAprobadaRef.current();
                else setFase({
                    tipo: 'fin',
                    mensaje: estado === 'rechazada' ? 'Se rechazó la entrada desde el móvil.' : 'El QR ha caducado.',
                });
            } catch {
                // Un fallo de red suelto no corta la espera: se reintenta en el siguiente turno.
            }
        }, INTERVALO_MS);
        return () => { activo = false; window.clearInterval(reloj); window.clearInterval(sondeo); };
    }, [fase]);

    const restante = fase.tipo === 'qr' ? Math.max(0, Math.ceil((fase.caducaEn - ahora) / 1000)) : 0;

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="entrar-movil-titulo"
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md rounded-3xl border border-lme-border/50 bg-lme-surface p-6 text-center shadow-2xl"
            >
                <button
                    ref={cerrarRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="absolute right-4 top-4 rounded-xl p-2 text-sub hover:bg-white/5"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 id="entrar-movil-titulo" className="mb-4 text-lg font-bold text-ink">Entrar con el móvil</h2>

                {fase.tipo === 'cargando' && <p role="status" className="text-sm text-sub">Generando el QR…</p>}

                {fase.tipo === 'qr' && (
                    <div className="flex flex-col items-center gap-2">
                        {/* El QR siempre sobre blanco: en tema oscuro algunos móviles no lo leen invertido. */}
                        <img
                            src={fase.qr}
                            alt="Código QR para entrar desde el móvil"
                            width={360}
                            height={360}
                            className="w-full max-w-[360px] rounded-xl bg-white"
                        />
                        <p className="mt-1 text-base text-ink">
                            Escanéalo con la cámara del móvil y pulsa <strong>Autorizar</strong>.
                        </p>
                        <p role="status" aria-live="polite" className="text-sm text-sub">
                            Esperando la aprobación · caduca en {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}
                        </p>
                        <p className="text-xs text-sub">
                            Sin cámara: abre <strong>auth.edumind.es/device</strong> y escribe {fase.entrada.codigo}
                        </p>
                    </div>
                )}

                {fase.tipo === 'fin' && (
                    <div className="flex flex-col gap-3">
                        <p role="alert" className="text-sm text-sub">{fase.mensaje}</p>
                        <button
                            type="button"
                            onClick={() => void generarQr()}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mint py-3 font-bold text-bg0 hover:bg-mint/90"
                        >
                            <Smartphone className="h-5 w-5" />
                            Generar otro QR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
