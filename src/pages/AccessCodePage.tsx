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

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowRight, Layout, AlertCircle, Sparkles } from 'lucide-react';
import {
    isValidShareCode,
    normalizeShareCode,
    getStudentProgress,
    saveStudentProgress,
} from '../utils/shareCode';
import { logAppEvent } from '../services/appTelemetry';

const STUDENT_ALIAS_KEY = 'pasos-student-alias';

export default function AccessCodePage() {
    const [searchParams] = useSearchParams();
    const [code, setCode] = useState(() => searchParams.get('code') ?? '');
    const [studentAlias, setStudentAlias] = useState(() => localStorage.getItem(STUDENT_ALIAS_KEY) ?? '');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleAccessWithCode = useCallback(async (inputCode: string) => {
        const normalizedCode = normalizeShareCode(inputCode);

        if (!isValidShareCode(normalizedCode)) {
            setError('El código debe tener formato ABC-1234');
            logAppEvent({
                type: 'student_code_invalid',
                level: 'warning',
                message: 'Se intentó acceder con un código de alumno no válido.',
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        logAppEvent({
            type: 'student_code_access_started',
            level: 'info',
            message: 'Se inició el acceso de alumnado con código compartido.',
            metadata: { code: normalizedCode },
        });

        // Simulate a small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const normalizedAlias = studentAlias.trim();
        if (normalizedAlias) {
            localStorage.setItem(STUDENT_ALIAS_KEY, normalizedAlias);
        } else {
            localStorage.removeItem(STUDENT_ALIAS_KEY);
        }

        // Save/update student progress
        const existingProgress = getStudentProgress(normalizedCode);
        if (!existingProgress) {
            saveStudentProgress({
                shareCode: normalizedCode,
                completedTasks: [],
                lastAccess: new Date().toISOString(),
                alias: normalizedAlias || undefined,
            });
        } else {
            saveStudentProgress({
                ...existingProgress,
                lastAccess: new Date().toISOString(),
                alias: normalizedAlias || existingProgress.alias,
            });
        }

        // SharedBoardView will resolve the code locally or against the backend.
        setIsLoading(false);
        logAppEvent({
            type: 'student_code_access_success',
            level: 'info',
            message: 'El acceso del alumno continuó hacia el tablero compartido.',
            metadata: { code: normalizedCode, has_alias: Boolean(normalizedAlias) },
        });
        navigate(`/compartir/${normalizedCode}`);
    }, [navigate, studentAlias]);

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase();

        // Auto-format: add dash after 3 characters
        if (value.length === 3 && !value.includes('-')) {
            value = value + '-';
        }

        // Limit to 8 characters (ABC-1234)
        if (value.length <= 8) {
            setCode(value);
            setError(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAccessWithCode(code);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-lme-background to-[#0f1a2e] flex flex-col">
            {/* Header minimal */}
            <header className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center">
                        <Layout className="text-mint w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-ink">Pasos</h1>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="glass-panel p-8 rounded-2xl">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sky/10 flex items-center justify-center">
                                <KeyRound className="w-10 h-10 text-sky" />
                            </div>
                            <h2 className="text-2xl font-bold text-ink mb-2">
                                Accede a tu Tablero
                            </h2>
                            <p className="text-sub">
                                Introduce el código que te ha proporcionado tu profesor/a
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Code input */}
                            <div>
                                <label htmlFor="studentAlias" className="block text-sm font-medium text-sub mb-2">
                                    Alias del alumno/a (opcional)
                                </label>
                                <input
                                    type="text"
                                    id="studentAlias"
                                    value={studentAlias}
                                    onChange={(event) => setStudentAlias(event.target.value)}
                                    placeholder="Ej. Marta o Equipo Azul"
                                    className="mb-4 w-full rounded-xl border border-lme-border bg-lme-surface px-4 py-3 text-ink placeholder:text-sub/50 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
                                    autoComplete="nickname"
                                />

                                <label htmlFor="code" className="block text-sm font-medium text-sub mb-2">
                                    Código de Acceso
                                </label>
                                <input
                                    type="text"
                                    id="code"
                                    value={code}
                                    onChange={handleCodeChange}
                                    placeholder="ABC-1234"
                                    className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest
                                             bg-lme-surface border-2 border-lme-border rounded-xl
                                             focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky/20
                                             text-ink placeholder:text-sub/50 uppercase"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-lme-danger/10 border border-lme-danger/30 rounded-lg text-lme-danger text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={code.length < 8 || isLoading}
                                className="w-full py-4 px-6 rounded-xl font-bold text-lg
                                         bg-gradient-to-r from-sky to-mint text-bg0
                                         hover:opacity-90 transition-all
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-bg0/30 border-t-bg0 rounded-full animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        Acceder
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Helper text */}
                        <div className="mt-6 pt-6 border-t border-lme-border">
                            <div className="flex items-start gap-3 text-sm text-sub">
                                <Sparkles className="w-4 h-4 mt-0.5 text-mint flex-shrink-0" />
                                <p>
                                    El código te permite abrir un tablero compartido y marcar tu progreso personal.
                                    Si el tablero no vive en este navegador, Pasos intentará resolverlo desde el backend Pro.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back to main link */}
                    <div className="text-center mt-6">
                        <a
                            href="/"
                            className="text-sub hover:text-ink text-sm underline transition-colors"
                        >
                            ¿Eres profesor/a? Accede a la app completa
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
