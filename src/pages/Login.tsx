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

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, ArrowRight, Shield, GraduationCap, Zap, AlertTriangle, Info, CheckCircle, KeyRound } from 'lucide-react';
import { useStore, type UserRole } from '../store/boardStore';
import { generateSecureId } from '../utils/security';
import {
    completeSsoLogin,
    getApiErrorMessage,
    listRemoteBoards,
    loginProUser,
    mapRemoteBoardToLocalBoard,
    registerProUser,
    startSsoLogin,
    type ProAuthTokenResponse,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, login, createBoard, setActiveBoard, mergeBoardsForOwner } = useStore();

    const [mode, setMode] = useState<'express' | 'identified' | 'pro'>('express');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [showWarning, setShowWarning] = useState(true);
    const [proIntent, setProIntent] = useState<'login' | 'register'>('login');
    const [proEmail, setProEmail] = useState('');
    const [proPassword, setProPassword] = useState('');
    const [proDisplayName, setProDisplayName] = useState('');
    const [proError, setProError] = useState<string | null>(null);
    const [proLoading, setProLoading] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        const params = new URLSearchParams(location.search);
        const nextPath = params.get('next') ?? '/';
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.startsWith('/api/')
            ? nextPath
            : '/';
        navigate(safeNext, { replace: true });
    }, [currentUser, location.search, navigate]);

    const finishProAccess = async (
        authResponse: ProAuthTokenResponse,
        eventType: 'pro_login_success' | 'pro_register_success' | 'pro_sso_login_success',
        targetPath = '/',
    ) => {
        const displayName = authResponse.user.display_name?.trim() || authResponse.user.email;
        const user = login(displayName, 'teacher', {
            mode: 'pro',
            email: authResponse.user.email,
            remoteId: authResponse.user.id,
            workspaceCode: authResponse.user.workspace_code,
        });

        const remoteBoards = await listRemoteBoards();
        const localBoards = remoteBoards.map(board => mapRemoteBoardToLocalBoard(board, authResponse.user.id));
        mergeBoardsForOwner(authResponse.user.id, localBoards);

        const currentBoards = useStore.getState().boards;
        const userBoards = currentBoards.filter(board => board.ownerId === authResponse.user.id);

        if (userBoards.length === 0) {
            createBoard('Mi Primer Tablero', user?.id ?? authResponse.user.id);
        } else {
            setActiveBoard(userBoards[0].id);
        }

        logAppEvent({
            type: eventType,
            level: 'info',
            message: eventType === 'pro_register_success'
                ? 'Se creó y activó una cuenta Pro.'
                : eventType === 'pro_sso_login_success'
                    ? 'Se inició una sesión Pro mediante SSO.'
                    : 'Se inició una sesión Pro correctamente.',
        });
        navigate(targetPath);
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('sso') !== '1') return;

        let cancelled = false;
        const nextPath = params.get('next') ?? '/';
        const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.startsWith('/api/')
            ? nextPath
            : '/';

        setMode('pro');
        setProLoading(true);
        setProError(null);

        completeSsoLogin()
            .then(async (authResponse) => {
                if (!cancelled) {
                    await finishProAccess(authResponse, 'pro_sso_login_success', safeNext);
                }
            })
            .catch((error) => {
                if (cancelled) return;
                const message = getApiErrorMessage(error, 'No se pudo completar el acceso SSO.');
                setProError(message);
                logAppEvent({
                    type: 'pro_sso_login_failed',
                    level: 'error',
                    message,
                });
            })
            .finally(() => {
                if (!cancelled) setProLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [location.search]);

    const activateWorkspace = (userId: string | undefined, emptyBoardTitle: string) => {
        window.setTimeout(() => {
            const currentBoards = useStore.getState().boards;
            const userBoards = userId ? currentBoards.filter(board => board.ownerId === userId) : [];

            if (userBoards.length === 0) {
                createBoard(emptyBoardTitle, userId);
            } else {
                setActiveBoard(userBoards[0].id);
            }

            navigate('/');
        }, 100);
    };

    const handleExpressAccess = () => {
        // Generate anonymous user ID
        const anonymousId = `usuario-${generateSecureId().substring(0, 8)}`;
        const user = login(anonymousId, 'student', { mode: 'express' });
        logAppEvent({
            type: 'express_login_success',
            level: 'info',
            message: 'Se inició una sesión Express en este navegador.',
        });
        activateWorkspace(user?.id, 'Mi Tablero Temporal');
    };

    const handleIdentifiedLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            const user = login(username.trim(), role, { mode: 'identified' });
            logAppEvent({
                type: 'identified_login_success',
                level: 'info',
                message: 'Se abrió una sesión local identificada.',
                metadata: { role },
            });
            activateWorkspace(user?.id, 'Mi Primer Tablero');
        }
    };

    const handleProAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setProLoading(true);
        setProError(null);

        try {
            const authResponse = proIntent === 'register'
                ? await registerProUser({
                    email: proEmail.trim(),
                    displayName: proDisplayName.trim() || undefined,
                    password: proPassword,
                })
                : await loginProUser({
                    email: proEmail.trim(),
                    password: proPassword,
                });

            await finishProAccess(authResponse, proIntent === 'register' ? 'pro_register_success' : 'pro_login_success');
        } catch (error) {
            const message = getApiErrorMessage(error, 'No se pudo iniciar la sesion Pro. Revisa la conexion con el backend.');
            setProError(message);
            logAppEvent({
                type: proIntent === 'register' ? 'pro_register_failed' : 'pro_login_failed',
                level: 'error',
                message,
            });
        } finally {
            setProLoading(false);
        }
    };

    const handleSsoAccess = () => {
        const params = new URLSearchParams(location.search);
        const nextPath = params.get('next');
        const embedded = params.get('embed') === '1' || params.get('board') === '1';
        const embeddedNext = embedded ? '/aula?embed=1&board=1' : '/';
        const safeNext = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.startsWith('/api/')
            ? nextPath
            : embeddedNext;

        setProError(null);
        setProLoading(true);
        void startSsoLogin(safeNext);
    };

    return (
        <div className="min-h-screen flex flex-col bg-lme-background animate-in fade-in duration-300">

            {/* ── Hero superior: ambos logos + título centrados ── */}
            <header className="flex flex-col items-center justify-center pt-8 pb-6 px-6 text-center">
                {/* Logos lado a lado — sin separador para evitar artefactos visuales */}
                <div className="flex items-center gap-3 mb-4">
                    <img
                        src="/icons/icon-192.png"
                        alt="Pasos"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-xl"
                    />
                    <img
                        src="/icons/edumind_logo.png"
                        alt="EDUmind"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-xl"
                    />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">PASOS</h1>
                <p className="text-sm text-sub mt-1">Kanban educativo · EDUmind® · Luis Vilela Acuña</p>
            </header>

            {/* ── Tarjeta contenedora: centrada vertical y horizontalmente ── */}
            <main className="flex-1 flex items-center justify-center px-4 pb-8">
                <div className="w-full max-w-4xl rounded-3xl border border-lme-border/50 bg-lme-surface-alt/60 overflow-hidden shadow-2xl shadow-black/20">
                    {/* items-stretch: ambas columnas igualan la altura de la más alta */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">

                        {/* ── Columna izquierda: Acceso docente Pro ── */}
                        <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-lme-border/40 order-2 lg:order-1 flex flex-col justify-center">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sub mb-5">Acceso docente</p>

                            {/* SSO — acción principal */}
                            <button
                                type="button"
                                onClick={handleSsoAccess}
                                disabled={proLoading}
                                className="w-full py-3.5 bg-mint text-bg0 font-bold rounded-2xl flex items-center justify-center gap-2.5 hover:bg-mint/90 transition-colors disabled:opacity-60 shadow-md shadow-mint/20 mb-5"
                            >
                                <KeyRound className="w-5 h-5" />
                                {proLoading ? 'Conectando…' : 'Entrar con EDUmind SSO'}
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex-1 border-t border-lme-border/50" />
                                <span className="text-[11px] text-sub">o con email / contraseña</span>
                                <div className="flex-1 border-t border-lme-border/50" />
                            </div>

                            {/* Formulario Pro */}
                            <form onSubmit={handleProAccess} className="space-y-3">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setProIntent('login')}
                                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${proIntent === 'login' ? 'bg-mint/20 border-mint text-mint' : 'bg-black/20 border-line text-sub hover:bg-white/5'}`}>
                                        Iniciar sesión
                                    </button>
                                    <button type="button" onClick={() => setProIntent('register')}
                                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${proIntent === 'register' ? 'bg-sky/20 border-sky text-sky' : 'bg-black/20 border-line text-sub hover:bg-white/5'}`}>
                                        Crear cuenta
                                    </button>
                                </div>

                                {proIntent === 'register' && (
                                    <div>
                                        <label className="text-xs text-sub font-semibold mb-1.5 block">Nombre visible</label>
                                        <input type="text" value={proDisplayName} onChange={e => setProDisplayName(e.target.value)}
                                            className="w-full bg-black/20 border border-line rounded-xl py-2.5 px-4 text-ink focus:border-mint focus:outline-none"
                                            placeholder="Ej. Profe Luis" maxLength={80} />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-sub font-semibold mb-1.5 block">Email</label>
                                    <input type="email" value={proEmail} onChange={e => setProEmail(e.target.value)} required
                                        className="w-full bg-black/20 border border-line rounded-xl py-2.5 px-4 text-ink focus:border-mint focus:outline-none"
                                        placeholder="tu@centro.es" />
                                </div>

                                <div>
                                    <label className="text-xs text-sub font-semibold mb-1.5 block">Contraseña</label>
                                    <input type="password" value={proPassword} onChange={e => setProPassword(e.target.value)} required minLength={12}
                                        className="w-full bg-black/20 border border-line rounded-xl py-2.5 px-4 text-ink focus:border-mint focus:outline-none"
                                        placeholder="Mínimo 12 caracteres" />
                                </div>

                                {proError && (
                                    <div className="rounded-xl border border-lme-danger/30 bg-lme-danger/10 p-3 text-xs text-lme-danger/80">
                                        {proError}
                                    </div>
                                )}

                                <button type="submit" disabled={proLoading}
                                    className="w-full py-3 bg-gradient-to-r from-mint to-sky text-bg0 font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60">
                                    {proLoading ? 'Conectando…' : proIntent === 'register' ? 'Crear cuenta Pro' : 'Iniciar sesión Pro'}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        </div>

                        {/* ── Columna derecha: Accesos rápidos sin cuenta ── */}
                        <div className="p-6 sm:p-8 order-1 lg:order-2 flex flex-col">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sub mb-5">Acceso directo · sin cuenta</p>

                            {/* grid-rows-2 + h-full en cards para ocupar todo el espacio disponible */}
                            <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1">
                                {/* Express */}
                                <button type="button" onClick={handleExpressAccess}
                                    className="group relative p-4 rounded-2xl border border-line bg-black/10 hover:border-sky/40 hover:bg-sky/5 transition-all text-left h-full flex flex-col">
                                    <div className="w-9 h-9 rounded-xl bg-sky/10 flex items-center justify-center mb-3">
                                        <Zap className="w-4 h-4 text-sky" />
                                    </div>
                                    <p className="font-bold text-ink text-sm leading-tight">Entrar sin registro</p>
                                    <p className="text-xs text-sub mt-1 leading-4">Rápido y temporal.</p>
                                    <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-sub opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {/* Identificado / Con nombre */}
                                <button type="button" onClick={() => setMode(mode === 'identified' ? 'express' : 'identified')}
                                    className={`group relative p-4 rounded-2xl border transition-all text-left h-full flex flex-col ${mode === 'identified' ? 'border-mint/50 bg-mint/5' : 'border-line bg-black/10 hover:border-mint/40 hover:bg-mint/5'}`}>
                                    <div className="w-9 h-9 rounded-xl bg-mint/10 flex items-center justify-center mb-3">
                                        <User className="w-4 h-4 text-mint" />
                                    </div>
                                    <p className="font-bold text-ink text-sm leading-tight">Acceso con nombre</p>
                                    <p className="text-xs text-sub mt-1 leading-4">Persistente en el navegador.</p>
                                    <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-sub opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {/* Código de alumno */}
                                <a href="/codigo"
                                    className="group relative p-4 rounded-2xl border border-line bg-black/10 hover:border-vio/40 hover:bg-vio/5 transition-all flex flex-col">
                                    <div className="w-9 h-9 rounded-xl bg-vio/10 flex items-center justify-center mb-3">
                                        <KeyRound className="w-4 h-4 text-vio" />
                                    </div>
                                    <p className="font-bold text-ink text-sm leading-tight">Código de alumno</p>
                                    <p className="text-xs text-sub mt-1 leading-4">Tablero de tu docente.</p>
                                    <ArrowRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-sub opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>

                                {/* EDUmind info */}
                                <div className="p-4 rounded-2xl border border-lme-border/30 bg-black/5 flex flex-col h-full">
                                    <img src="/icons/edumind_logo.png" alt="EDUmind" className="w-8 h-8 rounded-xl mb-3" />
                                    <p className="font-bold text-ink text-xs">EDUmind Pro</p>
                                    <p className="text-[11px] text-sub mt-1 leading-4">Sincroniza entre equipos y dispositivos del centro.</p>
                                </div>
                            </div>

                            {/* Formulario identificado */}
                            {mode === 'identified' && (
                                <form onSubmit={handleIdentifiedLogin} className="mt-4 p-4 rounded-2xl border border-mint/30 bg-mint/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setRole('teacher')} aria-pressed={role === 'teacher'}
                                            className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-1.5 text-sm font-semibold transition-all ${role === 'teacher' ? 'bg-mint/20 border-mint text-mint' : 'bg-black/20 border-line text-sub hover:bg-white/5'}`}>
                                            <Shield className="w-4 h-4" /> Docente
                                        </button>
                                        <button type="button" onClick={() => setRole('student')} aria-pressed={role === 'student'}
                                            className={`flex-1 py-2 rounded-xl border flex items-center justify-center gap-1.5 text-sm font-semibold transition-all ${role === 'student' ? 'bg-sky/20 border-sky text-sky' : 'bg-black/20 border-line text-sub hover:bg-white/5'}`}>
                                            <GraduationCap className="w-4 h-4" /> Alumno
                                        </button>
                                    </div>
                                    <div>
                                        <label className="text-xs text-sub font-semibold mb-1.5 block">Tu nombre</label>
                                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus
                                            className="w-full bg-black/20 border border-line rounded-xl py-2.5 px-4 text-ink focus:border-mint focus:outline-none"
                                            placeholder="Ej. María, Profe Luis…" />
                                        <p className="text-[11px] text-sub mt-1">Solo en este navegador. Sin email.</p>
                                    </div>
                                    <button type="submit"
                                        className="w-full py-2.5 bg-gradient-to-r from-mint to-sky text-bg0 font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm">
                                        Guardar y Entrar <ArrowRight className="w-4 h-4" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="flex items-center justify-center gap-2.5 py-4 px-8 opacity-50">
                <img src="/icons/edumind_logo.png" alt="EDUmind" className="w-4 h-4 rounded" />
                <span className="text-[11px] text-sub">una app de <strong className="text-ink">EDUmind</strong> · Luis Vilela Acuña</span>
            </footer>

            {/* Bloque oculto — preserva variables de estado no usadas en el nuevo layout */}
            <div className="hidden">
                <span>{showWarning ? '' : ''}</span>

                {/* Mode Selection */}
                <div className="p-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => {
                                setMode('express');
                                setProError(null);
                            }}
                            className={`p-4 rounded-xl border-2 transition-all ${mode === 'express'
                                    ? 'bg-lme-primary/10 border-lme-primary'
                                    : 'bg-black/20 border-line hover:border-lme-primary/50'
                                }`}
                        >
                            <Zap className={`w-8 h-8 mx-auto mb-2 ${mode === 'express' ? 'text-lme-primary' : 'text-sub'}`} />
                            <div className="text-sm font-bold text-lme-text">Acceso Express</div>
                            <div className="text-xs text-lme-text-secondary mt-1">Rápido y temporal</div>
                        </button>

                        <button
                            onClick={() => {
                                setMode('identified');
                                setProError(null);
                            }}
                            className={`p-4 rounded-xl border-2 transition-all ${mode === 'identified'
                                    ? 'bg-sky/10 border-sky'
                                    : 'bg-black/20 border-line hover:border-sky/50'
                                }`}
                        >
                            <User className={`w-8 h-8 mx-auto mb-2 ${mode === 'identified' ? 'text-sky' : 'text-sub'}`} />
                            <div className="text-sm font-bold text-lme-text">Local con Nombre</div>
                            <div className="text-xs text-lme-text-secondary mt-1">Persistente en este navegador</div>
                        </button>

                        <button
                            onClick={() => {
                                setMode('pro');
                                setProError(null);
                            }}
                            className={`p-4 rounded-xl border-2 transition-all ${mode === 'pro'
                                    ? 'bg-mint/10 border-mint'
                                    : 'bg-black/20 border-line hover:border-mint/50'
                                }`}
                        >
                            <Shield className={`w-8 h-8 mx-auto mb-2 ${mode === 'pro' ? 'text-mint' : 'text-sub'}`} />
                            <div className="text-sm font-bold text-lme-text">Modo Pro</div>
                            <div className="text-xs text-lme-text-secondary mt-1">Sincroniza y comparte</div>
                        </button>
                    </div>

                    {/* Express Mode */}
                    {mode === 'express' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {showWarning && (
                                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-lme-text mb-1">
                                                ⚠️ Modo Temporal
                                            </p>
                                            <p className="text-xs text-lme-text-secondary leading-relaxed">
                                                En modo Express, tus datos se guardan solo en este navegador. <strong>No se borran al cerrar sesión</strong>; desaparecerán si eliminas los datos del sitio o limpias el navegador. Si compartes dispositivo, otras personas podrían verlos.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowWarning(false)}
                                            className="text-lme-text-secondary hover:text-lme-text"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-lg bg-lme-primary/5 border border-lme-primary/20">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-lme-primary flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-lme-text-secondary">
                                        <strong className="text-lme-text">Acceso instantáneo:</strong> No necesitas crear cuenta ni proporcionar email. Empieza a usar Pasos inmediatamente.
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleExpressAccess}
                                className="w-full py-4 bg-gradient-to-r from-lme-primary to-lme-secondary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-lme-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap className="w-5 h-5" />
                                Entrar sin Registro
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Identified Mode */}
                    {mode === 'identified' && (
                        <form onSubmit={handleIdentifiedLogin} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 rounded-lg bg-sky/5 border border-sky/20">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-sky flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-lme-text-secondary">
                                        <strong className="text-lme-text">Esto NO es un registro tradicional:</strong>
                                        <ul className="mt-2 space-y-1 list-disc list-inside">
                                            <li>No necesitas email ni datos personales</li>
                                            <li>Solo eliges un nombre para separar tu espacio local</li>
                                            <li>Tus datos siguen guardándose en este navegador</li>
                                            <li><strong className="text-yellow-400">Si borras los datos del navegador, perderás el acceso a este espacio local</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-sub font-semibold mb-2 block">Rol</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        aria-pressed={role === 'student'}
                                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${role === 'student'
                                                ? 'bg-sky/20 border-sky text-sky'
                                                : 'bg-black/20 border-line text-sub hover:bg-white/5'
                                            }`}
                                    >
                                        <GraduationCap className="w-5 h-5" />
                                        Alumno
                                        {role === 'student' && <CheckCircle className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('teacher')}
                                        aria-pressed={role === 'teacher'}
                                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${role === 'teacher'
                                                ? 'bg-mint/20 border-mint text-mint'
                                                : 'bg-black/20 border-line text-sub hover:bg-white/5'
                                            }`}
                                    >
                                        <Shield className="w-5 h-5" />
                                        Docente
                                        {role === 'teacher' && <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-sub mt-2">
                                    Rol seleccionado: <span className="font-semibold text-ink">{role === 'teacher' ? 'Docente' : 'Alumno'}</span>
                                </p>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-sub font-semibold mb-2 block">
                                    Nombre de Usuario <span className="text-yellow-400">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-sub w-5 h-5" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-black/20 border border-line rounded-lg py-3 pl-10 text-ink focus:border-sky focus:outline-none placeholder-sub/30"
                                        placeholder="Ej: María, Profe Luis, etc."
                                        required
                                    />
                                </div>
                                <p className="text-xs text-yellow-400 mt-1">
                                    * Guárdalo bien, lo necesitarás para volver a entrar
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-lme-text-secondary">
                                        La protección avanzada con contraseña forma parte de la fase de seguridad. Por ahora este acceso solo organiza tableros por nombre dentro del navegador actual.
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-gradient-to-r from-mint to-sky text-bg0 font-bold rounded-xl hover:shadow-lg hover:shadow-mint/20 transition-all flex items-center justify-center gap-2 mt-6"
                            >
                                Guardar y Entrar
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}

                    {mode === 'pro' && (
                        <form onSubmit={handleProAccess} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 rounded-lg bg-mint/5 border border-mint/20">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-mint flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-lme-text-secondary">
                                        <strong className="text-lme-text">Modo Pro:</strong> usa la API real para autenticar, publicar tableros y compartir entre dispositivos.
                                        Esta cuenta esta orientada al trabajo docente; el acceso del alumnado sigue entrando por codigo compartido.
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSsoAccess}
                                disabled={proLoading}
                                className="w-full py-4 bg-mint text-bg0 font-bold rounded-xl hover:bg-mint/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <KeyRound className="w-5 h-5" />
                                {proLoading ? 'Conectando...' : 'Entrar con EDUmind SSO'}
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setProIntent('login')}
                                    className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${proIntent === 'login'
                                            ? 'bg-mint/20 border-mint text-mint'
                                            : 'bg-black/20 border-line text-sub hover:bg-white/5'
                                        }`}
                                >
                                    Entrar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProIntent('register')}
                                    className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${proIntent === 'register'
                                            ? 'bg-sky/20 border-sky text-sky'
                                            : 'bg-black/20 border-line text-sub hover:bg-white/5'
                                        }`}
                                >
                                    Crear cuenta
                                </button>
                            </div>

                            {proIntent === 'register' && (
                                <div>
                                    <label className="text-xs uppercase text-sub font-semibold mb-2 block">
                                        Nombre visible
                                    </label>
                                    <input
                                        type="text"
                                        value={proDisplayName}
                                        onChange={(e) => setProDisplayName(e.target.value)}
                                        className="w-full bg-black/20 border border-line rounded-lg py-3 px-4 text-ink focus:border-mint focus:outline-none placeholder-sub/30"
                                        placeholder="Ej: Profe Luis"
                                        maxLength={80}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-xs uppercase text-sub font-semibold mb-2 block">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={proEmail}
                                    onChange={(e) => setProEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-line rounded-lg py-3 px-4 text-ink focus:border-mint focus:outline-none placeholder-sub/30"
                                    placeholder="tu@centro.es"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs uppercase text-sub font-semibold mb-2 block">
                                    Contrasena
                                </label>
                                <input
                                    type="password"
                                    value={proPassword}
                                    onChange={(e) => setProPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-line rounded-lg py-3 px-4 text-ink focus:border-mint focus:outline-none placeholder-sub/30"
                                    placeholder="Minimo 12 caracteres"
                                    minLength={12}
                                    required
                                />
                                <p className="text-xs text-sub mt-1">
                                    El backend exige una contrasena robusta de al menos 12 caracteres.
                                </p>
                            </div>

                            {proError && (
                                <div className="p-4 rounded-lg bg-lme-danger/10 border border-lme-danger/30 text-xs text-lme-danger/80">
                                    {proError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={proLoading}
                                className="w-full py-4 bg-gradient-to-r from-mint to-sky text-bg0 font-bold rounded-xl hover:shadow-lg hover:shadow-mint/20 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-60"
                            >
                                {proLoading ? 'Conectando...' : proIntent === 'register' ? 'Crear cuenta Pro' : 'Entrar en Pro'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}
                </div>

            </div>{/* fin .hidden */}
        </div>
    );
}
