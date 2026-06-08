/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight, Rocket } from 'lucide-react';

interface Props {
    onClose: () => void;
}

// ─── Visuales CSS de cada paso ────────────────────────────────────────────────

function VisualBienvenida() {
    return (
        <div className="flex flex-col items-center gap-5 py-2">
            <div className="text-6xl">📋</div>
            <div className="text-center">
                <div className="text-4xl font-black text-lme-primary mb-1">Pasos</div>
                <div className="text-sm text-lme-text-secondary">El tablero para tu aula</div>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
                {['📚 Organizar', '🎯 Aprender', '✅ Completar'].map((item) => (
                    <div key={item} className="bg-lme-surface border border-lme-border rounded-xl px-3 py-2 text-sm text-lme-text font-medium">
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

function VisualLogin() {
    return (
        <div className="flex gap-3 w-full">
            {[
                { emoji: '⚡', nombre: 'Sin registro', desc: 'Entra ya, sin datos', color: 'border-yellow-500/40 bg-yellow-500/5' },
                { emoji: '👤', nombre: 'Con nombre', desc: 'Solo tu nombre', color: 'border-blue-500/40 bg-blue-500/5' },
                { emoji: '⭐', nombre: 'Pro', desc: 'Con cuenta propia', color: 'border-lme-primary/40 bg-lme-primary/5' },
            ].map((mode) => (
                <div key={mode.nombre} className={`flex-1 border-2 rounded-2xl p-3 text-center ${mode.color}`}>
                    <div className="text-3xl mb-2">{mode.emoji}</div>
                    <div className="font-bold text-lme-text text-sm leading-tight">{mode.nombre}</div>
                    <div className="text-xs text-lme-text-secondary mt-1">{mode.desc}</div>
                </div>
            ))}
        </div>
    );
}

function VisualEspacio() {
    return (
        <div className="w-full bg-lme-surface border border-lme-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-lme-primary rounded-lg flex items-center justify-center text-sm">📋</div>
                <span className="font-bold text-lme-text text-sm">Mi espacio de trabajo</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {['Clase 3ºA', 'Proyecto Arte', 'Semana lectiva'].map((nombre) => (
                    <div key={nombre} className="bg-lme-surface-alt border border-lme-border rounded-xl p-3">
                        <div className="text-xs font-semibold text-lme-text">📋 {nombre}</div>
                        <div className="text-xs text-lme-text-secondary mt-1">3 tareas</div>
                    </div>
                ))}
                <div className="border-2 border-dashed border-lme-border rounded-xl p-3 flex items-center justify-center">
                    <span className="text-xs text-lme-text-secondary">+ Nuevo</span>
                </div>
            </div>
        </div>
    );
}

function VisualTablero() {
    return (
        <div className="flex gap-2 w-full">
            {[
                { nombre: '📝 Por hacer', tareas: ['Leer', 'Escribir'], fondo: 'bg-blue-500/10 border-blue-500/30', pill: 'text-blue-400' },
                { nombre: '🔄 Haciendo', tareas: ['Dibujar'], fondo: 'bg-yellow-500/10 border-yellow-500/30', pill: 'text-yellow-400' },
                { nombre: '✅ Hecho', tareas: ['Repasar'], fondo: 'bg-green-500/10 border-green-500/30', pill: 'text-green-400' },
            ].map((col) => (
                <div key={col.nombre} className={`flex-1 rounded-xl border p-2 ${col.fondo}`}>
                    <div className={`text-[10px] font-bold mb-2 ${col.pill}`}>{col.nombre}</div>
                    {col.tareas.map((tarea) => (
                        <div key={tarea} className="bg-lme-surface rounded-lg p-2 mb-1 text-xs text-lme-text border border-lme-border shadow-sm">
                            {tarea}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function VisualTarjeta() {
    return (
        <div className="w-full max-w-xs bg-lme-surface border-2 border-lme-primary/40 rounded-2xl p-4 shadow-xl mx-auto space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-lme-primary/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📖</div>
                <div>
                    <div className="font-bold text-lme-text">Leer el cuento</div>
                    <div className="text-xs text-lme-text-secondary mt-1">Páginas 1 a 5</div>
                </div>
            </div>
            <div className="flex gap-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Lenguaje</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Individual</span>
            </div>
            <div className="border-t border-lme-border/50 pt-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-lme-primary/20 border border-lme-primary/40 flex items-center justify-center text-[10px]">😊</div>
                <span className="text-xs text-lme-text-secondary">Sin empezar</span>
            </div>
        </div>
    );
}

function VisualCrear() {
    const [clicked, setClicked] = useState(false);
    return (
        <div className="w-full space-y-3">
            <div className="bg-lme-surface border border-lme-border rounded-xl p-3">
                <div className="text-xs font-bold text-lme-text-secondary mb-2">📝 Por hacer</div>
                {clicked && (
                    <div className="bg-lme-surface-alt rounded-lg p-2 border border-lme-primary/40 mb-2 text-sm text-lme-text font-medium">
                        ✅ Hacer los ejercicios
                    </div>
                )}
                <button
                    onClick={() => setClicked(true)}
                    className={`w-full border-2 border-dashed rounded-lg p-2 text-center text-sm font-bold transition-all ${clicked ? 'border-lme-border text-lme-text-secondary' : 'border-lme-primary/60 text-lme-primary hover:bg-lme-primary/5 cursor-pointer'}`}
                >
                    {clicked ? '+ Añadir otra tarea' : '+ Añadir tarea  ← Pulsa aquí'}
                </button>
            </div>
            {clicked && (
                <div className="flex items-center gap-2 justify-center">
                    <span className="text-2xl">🎉</span>
                    <span className="text-sm font-bold text-lme-primary">¡Has creado tu primera tarea!</span>
                </div>
            )}
        </div>
    );
}

function VisualMover() {
    const [moved, setMoved] = useState(false);
    return (
        <div className="w-full space-y-3">
            <div className="flex items-center gap-2 w-full">
                <div className={`flex-1 bg-blue-500/10 border border-blue-500/30 rounded-xl p-2 transition-all`}>
                    <div className="text-[10px] font-bold text-blue-400 mb-2">📝 Por hacer</div>
                    <div className={`bg-lme-surface rounded-lg p-2 text-xs text-lme-text border border-lme-border transition-opacity ${moved ? 'opacity-30' : 'opacity-100'}`}>
                        📖 Leer
                    </div>
                </div>
                <ArrowRight className="w-6 h-6 text-lme-primary flex-shrink-0 animate-pulse" />
                <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2">
                    <div className="text-[10px] font-bold text-yellow-400 mb-2">🔄 Haciendo</div>
                    {moved && (
                        <div className="bg-lme-surface rounded-lg p-2 text-xs text-lme-text border border-lme-primary/50 shadow-md">
                            📖 Leer
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={() => setMoved(true)}
                disabled={moved}
                className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${moved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-lme-primary text-white hover:bg-lme-primary-dark cursor-pointer'}`}
            >
                {moved ? '✅ ¡La tarjeta se movió!' : '👆 Arrastra "Leer" al centro'}
            </button>
        </div>
    );
}

function VisualCompartir() {
    return (
        <div className="w-full space-y-3">
            <div className="bg-lme-surface border border-lme-border rounded-xl p-4 text-center">
                <div className="text-xs font-bold text-lme-text-secondary mb-2">📤 Código para tus alumnos</div>
                <div className="bg-lme-primary/10 border-2 border-lme-primary/40 rounded-xl p-3">
                    <div className="text-3xl font-black text-lme-primary tracking-widest">ABC-1234</div>
                </div>
            </div>
            <div className="flex items-center gap-2 justify-center text-sm text-lme-text-secondary">
                <span>↓</span>
                <span>El alumno escribe este código</span>
                <span>↓</span>
            </div>
            <div className="bg-lme-surface border border-lme-border rounded-xl p-3 flex gap-2">
                <div className="flex-1 bg-lme-surface-alt rounded-lg p-2 border border-lme-border font-mono text-sm text-lme-text">
                    ABC-1234
                </div>
                <div className="px-3 bg-lme-primary rounded-lg text-white text-sm flex items-center font-bold">
                    Entrar
                </div>
            </div>
        </div>
    );
}

function VisualPresentacion() {
    return (
        <div className="w-full space-y-2">
            <div className="w-full bg-gray-900 rounded-xl border border-gray-700 p-3">
                <div className="text-[10px] text-gray-500 text-center mb-2">🖥️ Vista Presentación — Pizarra digital</div>
                <div className="flex gap-2">
                    {[
                        { col: 'Por hacer', tarea: 'Leer', color: 'bg-gray-800 border-gray-700' },
                        { col: 'Haciendo', tarea: 'Dibujar', color: 'bg-gray-800 border-yellow-700' },
                        { col: 'Hecho', tarea: 'Repasar', color: 'bg-gray-800 border-green-700' },
                    ].map((c) => (
                        <div key={c.col} className={`flex-1 rounded-lg p-2 border ${c.color}`}>
                            <div className="text-[9px] text-gray-400 mb-1">{c.col}</div>
                            <div className="bg-gray-700 rounded p-1 text-[10px] text-gray-200">{c.tarea}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="text-xs text-center text-lme-text-secondary">
                Las tarjetas se ven grandes y claras en el proyector
            </div>
        </div>
    );
}

function VisualListo() {
    return (
        <div className="flex flex-col items-center gap-5 py-2">
            <div className="text-6xl">🎊</div>
            <div className="text-center space-y-1">
                <div className="text-2xl font-black text-lme-primary">¡Lo has conseguido!</div>
                <div className="text-sm text-lme-text-secondary">Ya sabes usar Pasos</div>
            </div>
            <div className="flex gap-4 text-4xl">
                {['👩‍🏫', '📋', '✅', '🌟'].map((e, i) => (
                    <span key={i}>{e}</span>
                ))}
            </div>
            <div className="bg-lme-primary/10 border border-lme-primary/30 rounded-2xl p-4 w-full text-center">
                <div className="text-sm font-bold text-lme-primary mb-1">¿Qué hacer ahora?</div>
                <div className="text-xs text-lme-text-secondary">Cierra este tutorial y empieza a usar Pasos en tu aula</div>
            </div>
        </div>
    );
}

// ─── Datos de los pasos ───────────────────────────────────────────────────────

interface Paso {
    titulo: string;
    subtitulo: string;
    descripcion: string[];
    visual: React.ReactNode;
    consejo?: string;
}

const TOUR_PASOS: Paso[] = [
    {
        titulo: '¡Bienvenido a Pasos!',
        subtitulo: 'Tu tablero para el aula',
        descripcion: [
            'Pasos te ayuda a organizar las tareas de tu clase.',
            'Tus alumnos ven lo que tienen que hacer en cada momento.',
        ],
        visual: <VisualBienvenida />,
        consejo: 'Este tutorial dura solo 5 minutos. Puedes cerrarlo cuando quieras.',
    },
    {
        titulo: '¿Cómo entrar a Pasos?',
        subtitulo: 'Elige tu forma de acceso',
        descripcion: [
            'Hay 3 formas de entrar. Todas son gratuitas.',
            'Para empezar, elige "Sin registro". No necesitas cuenta.',
        ],
        visual: <VisualLogin />,
        consejo: '⚡ "Sin registro" es perfecto para empezar a explorar hoy mismo.',
    },
    {
        titulo: 'Tu espacio de trabajo',
        subtitulo: 'Aquí están todos tus tableros',
        descripcion: [
            'Cuando entras, ves todos tus tableros.',
            'Puedes tener uno para cada clase o actividad.',
        ],
        visual: <VisualEspacio />,
        consejo: 'Pulsa "Nuevo" para crear tu primer tablero.',
    },
    {
        titulo: 'El tablero de Pasos',
        subtitulo: 'Columnas y tarjetas',
        descripcion: [
            'El tablero tiene columnas. Cada columna es un estado.',
            'Las tareas van de "Por hacer" a "Hecho" poco a poco.',
        ],
        visual: <VisualTablero />,
        consejo: 'Puedes cambiar los nombres de las columnas según tus necesidades.',
    },
    {
        titulo: 'Las tarjetas son las tareas',
        subtitulo: 'Cada tarea es una tarjeta',
        descripcion: [
            'Cada tarjeta tiene un título y puede tener una imagen.',
            'Puedes añadir pictogramas para que los alumnos entiendan mejor.',
        ],
        visual: <VisualTarjeta />,
        consejo: 'Los pictogramas ARASAAC ayudan al alumnado con NEE.',
    },
    {
        titulo: 'Crear una tarea',
        subtitulo: 'Es muy fácil',
        descripcion: [
            'Pulsa el botón "+" de cualquier columna.',
            'Escribe el nombre de la tarea. ¡Y listo!',
        ],
        visual: <VisualCrear />,
        consejo: '¡Prueba a pulsar el botón de abajo para ver cómo funciona!',
    },
    {
        titulo: 'Mover las tareas',
        subtitulo: 'Arrastra de columna en columna',
        descripcion: [
            'Cuando una tarea está en marcha, arrástrala a "Haciendo".',
            'Cuando termina, llévala a "Hecho". ¡Aparecerán confetis!',
        ],
        visual: <VisualMover />,
        consejo: '¡Pulsa el botón para ver cómo se mueve una tarea!',
    },
    {
        titulo: 'Comparte con tus alumnos',
        subtitulo: 'Un código corto y fácil',
        descripcion: [
            'Genera un código para tu tablero.',
            'Tus alumnos escriben ese código y ven el tablero en su pantalla.',
        ],
        visual: <VisualCompartir />,
        consejo: 'Los alumnos no necesitan crear ninguna cuenta para ver el tablero.',
    },
    {
        titulo: 'Vista de Presentación',
        subtitulo: 'Para la pizarra digital',
        descripcion: [
            'Activa la vista de Presentación para mostrar el tablero grande.',
            'Perfecta para poner en el proyector mientras trabajáis.',
        ],
        visual: <VisualPresentacion />,
        consejo: 'Busca el botón "Presentación" en el menú del tablero.',
    },
    {
        titulo: '¡Ya sabes usar Pasos!',
        subtitulo: 'Estás listo para empezar',
        descripcion: [
            'Has aprendido todo lo básico de Pasos.',
            'Cierra este tutorial y empieza a crear tu primer tablero.',
        ],
        visual: <VisualListo />,
    },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function InteractiveManual({ onClose }: Props) {
    const [paso, setPaso] = useState(0);
    const total = TOUR_PASOS.length;
    const actual = TOUR_PASOS[paso];
    const esUltimo = paso === total - 1;
    const esPrimero = paso === 0;

    const avanzar = () => { if (!esUltimo) setPaso(p => p + 1); };
    const retroceder = () => { if (!esPrimero) setPaso(p => p - 1); };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
            <div className="glass-panel w-full max-w-lg flex flex-col overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200 max-h-[95vh]">

                {/* Cabecera */}
                <div className="p-4 border-b border-lme-border flex items-center justify-between bg-black/20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-lme-primary/20 flex items-center justify-center border border-lme-primary/30">
                            <Rocket className="w-5 h-5 text-lme-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-black text-lme-text">Tutorial de Pasos</div>
                            <div className="text-xs text-lme-text-secondary">Paso {paso + 1} de {total}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-lme-text-secondary hover:text-white transition-colors"
                        aria-label="Cerrar tutorial"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Barra de progreso */}
                <div className="h-1.5 bg-lme-border flex-shrink-0">
                    <div
                        className="h-full bg-lme-primary transition-all duration-500 ease-out"
                        style={{ width: `${((paso + 1) / total) * 100}%` }}
                    />
                </div>

                {/* Contenido principal */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Visual */}
                    <div className="bg-lme-surface-alt rounded-2xl p-4 border border-lme-border">
                        {actual.visual}
                    </div>

                    {/* Texto */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-lme-primary uppercase tracking-wider">
                            {actual.subtitulo}
                        </p>
                        <h2 className="text-2xl font-black text-lme-text leading-tight">
                            {actual.titulo}
                        </h2>
                        <div className="space-y-1.5">
                            {actual.descripcion.map((linea, i) => (
                                <p key={i} className="text-base text-lme-text-secondary leading-relaxed">
                                    {linea}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Consejo */}
                    {actual.consejo && (
                        <div className="bg-lme-primary/10 border border-lme-primary/30 rounded-xl p-3 flex items-start gap-2">
                            <span className="text-lg flex-shrink-0">💡</span>
                            <p className="text-sm text-lme-text-secondary leading-snug">
                                {actual.consejo}
                            </p>
                        </div>
                    )}
                </div>

                {/* Puntos de navegación */}
                <div className="flex justify-center gap-1.5 py-3 flex-shrink-0">
                    {TOUR_PASOS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPaso(i)}
                            aria-label={`Ir al paso ${i + 1}`}
                            className={`rounded-full transition-all duration-300 ${i === paso
                                ? 'w-6 h-2.5 bg-lme-primary'
                                : i < paso
                                    ? 'w-2.5 h-2.5 bg-lme-primary/40'
                                    : 'w-2.5 h-2.5 bg-lme-border'
                            }`}
                        />
                    ))}
                </div>

                {/* Botones de navegación */}
                <div className="p-4 border-t border-lme-border bg-black/10 flex gap-3 flex-shrink-0">
                    {!esPrimero && (
                        <button
                            onClick={retroceder}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-lme-border text-lme-text-secondary hover:bg-white/5 transition-colors font-bold text-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                        </button>
                    )}
                    {!esUltimo ? (
                        <button
                            onClick={avanzar}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-lme-primary hover:bg-lme-primary-dark text-white font-black text-sm transition-colors"
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-lme-primary hover:bg-lme-primary-dark text-white font-black text-sm transition-colors"
                        >
                            🚀 ¡Empezar a usar Pasos!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
