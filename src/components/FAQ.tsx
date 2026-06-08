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

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Sparkles, Layout, Copy, Check, Rocket, Play, GraduationCap } from 'lucide-react';
import { InteractiveManual } from './InteractiveManual';

type Tab = 'general' | 'features' | 'prompts' | 'tutorial';

interface FAQItem {
    question: string;
    answer: string;
}

interface PromptGuide {
    title: string;
    description: string;
    prompt: string;
    example?: string;
}

const FAQS_GENERAL: FAQItem[] = [
    {
        question: "¿Qué es Pasos?",
        answer: "Pasos es un planificador visual offline-first que utiliza pictogramas ARASAAC para hacer la planificación de tareas más accesible. Está diseñado especialmente para alumnado con necesidades educativas especiales (NEE)."
    },
    {
        question: "¿Necesito conexión a internet?",
        answer: "Depende del modo. Express y Local con nombre funcionan en este navegador sin necesidad de backend. El modo Pro necesita conexión para iniciar sesión, publicar tableros y compartir entre dispositivos. ARASAAC también requiere conexión la primera vez para buscar pictogramas."
    },
    {
        question: "¿Mis datos están seguros?",
        answer: "En modo local, tus datos permanecen en este navegador y no se envían a servicios de analítica. En modo Pro, la autenticación ya pasa por backend con cookies seguras y token de acceso, pero la sincronización completa del trabajo diario todavía se está desplegando fase a fase."
    },
    {
        question: "¿Qué es el modo Express?",
        answer: "El modo Express te permite entrar rápido sin registro externo. Los datos siguen siendo locales en este navegador y solo desaparecen si se borran los datos del sitio."
    },
    {
        question: "¿Qué es el modo Pro?",
        answer: "Es el acceso conectado de Pasos. Permite iniciar sesión con cuenta real, usar la API del producto y generar códigos compartidos que ya pueden resolverse entre dispositivos."
    },
    {
        question: "¿Puedo instalar Pasos como aplicación?",
        answer: "Sí. Pasos es una Progressive Web App (PWA). Puedes instalarla desde el navegador haciendo clic en 'Instalar' o 'Añadir a pantalla de inicio'."
    }
];

const FAQS_FEATURES: FAQItem[] = [
    {
        question: "¿Cómo muevo tareas entre columnas?",
        answer: "Haz click y mantén presionado sobre una tarjeta, luego arrástrala a otra columna y suelta. La tarea cambiará de estado automáticamente."
    },
    {
        question: "¿Puedo añadir imágenes a las tareas?",
        answer: "Sí. Puedes añadir pictogramas ARASAAC (buscador integrado), imágenes locales (máx 500KB) y URLs de imágenes o videos (como YouTube)."
    },
    {
        question: "¿Cómo funciona la 'IA / Magia'?",
        answer: "Es un asistente que convierte texto en tableros. Puedes escribir una lista de pasos, o pegar instrucciones que te haya dado ChatGPT, y la app creará el tablero y buscará pictogramas automáticamente."
    },
    {
        question: "¿Puedo cambiar el aspecto?",
        answer: "Sí. Ahora mismo puedes alternar entre modo visual EDUmind y modo E-Ink, además de ajustar tamaño y tipo de letra desde accesibilidad."
    },
    {
        question: "He perdido mis datos, ¿puedo recuperarlos?",
        answer: "Si borraste los datos del navegador, el contenido local puede haberse perdido. Recomendamos exportar copias de seguridad regularmente mientras completamos la fase de importación y sincronización."
    }
];

const PROMPTS_GUIDE: PromptGuide[] = [
    {
        title: "Nivel 1: Lista Simple",
        description: "Ideal para procesos rápidos. Copia y pega esto en tu chat de IA favorito.",
        prompt: "Actúa como experto en educación. Genera una lista paso a paso para la tarea: [DESCRIBIR TAREA]. Dame solo la lista, un paso por línea, sin numeración.",
        example: "Coger el papel\nBuscar un lápiz\nDibujar un círculo\nColorear"
    },
    {
        title: "Nivel 2: Tablero Estructurado",
        description: "Organiza tareas en columnas (Materiales, Pasos, Revisión) usando Markdown.",
        prompt: "Actúa como pedagogo. Diseña una actividad de [TEMA] en tablero Kanban formato Markdown.\nUsa '## Nombre Columna' para columnas.\nUsa '- Tarea' para tareas.",
        example: "## Materiales\n- Tijeras\n- Papel\n## Pasos\n- Recortar\n- Pegar"
    }
];

export function FAQ() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
    const [showManual, setShowManual] = useState(false);

    if (showManual) {
        return <InteractiveManual onClose={() => setShowManual(false)} />;
    }

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedPrompt(index);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 z-dropdown-backdrop w-14 h-14 rounded-full bg-lme-primary hover:bg-lme-primary-dark text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
                aria-label="Abrir Ayuda"
            >
                <HelpCircle className="w-8 h-8" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-lme-secondary rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                    i
                </span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-panel max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-lme-border flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-lme-primary/20 flex items-center justify-center border border-lme-primary/30">
                            <BookOpen className="w-6 h-6 text-lme-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-lme-text">Centro de Ayuda</h2>
                            <p className="text-sm text-lme-text-secondary">Guías, preguntas y trucos para Pasos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-lme-text-secondary hover:text-white transition-colors"
                    >
                        <ChevronDown className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-lme-border bg-black/10 px-6 gap-2 pt-4">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'general' ? 'border-lme-primary text-lme-primary' : 'border-transparent text-lme-text-secondary hover:text-lme-text'}`}
                    >
                        <HelpCircle className="w-4 h-4" /> General
                    </button>
                    <button
                        onClick={() => setActiveTab('features')}
                        className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'features' ? 'border-lme-primary text-lme-primary' : 'border-transparent text-lme-text-secondary hover:text-lme-text'}`}
                    >
                        <Layout className="w-4 h-4" /> Funciones
                    </button>
                    <button
                        onClick={() => setActiveTab('prompts')}
                        className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'prompts' ? 'border-purple-500 text-vio' : 'border-transparent text-lme-text-secondary hover:text-lme-text'}`}
                    >
                        <Sparkles className="w-4 h-4" /> IA & Prompts
                    </button>
                    <button
                        onClick={() => setActiveTab('tutorial')}
                        className={`pb-4 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'tutorial' ? 'border-lme-primary text-lme-primary' : 'border-transparent text-lme-text-secondary hover:text-lme-text'}`}
                    >
                        <Rocket className="w-4 h-4" /> Tutorial
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-lme-surface-alt">

                    {/* FAQ Groups */}
                    {(activeTab === 'general' || activeTab === 'features') && (
                        <div className="space-y-3 max-w-2xl mx-auto">
                            {(activeTab === 'general' ? FAQS_GENERAL : FAQS_FEATURES).map((faq, index) => (
                                <div key={index} className="bg-lme-surface border border-lme-border rounded-xl overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => toggleFAQ(index)}
                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                                    >
                                        <span className="font-semibold text-lme-text pr-4">{faq.question}</span>
                                        {openIndex === index ? (
                                            <ChevronUp className="w-5 h-5 text-lme-primary flex-shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-lme-text-secondary flex-shrink-0" />
                                        )}
                                    </button>
                                    {openIndex === index && (
                                        <div className="px-5 py-4 bg-black/20 border-t border-lme-border text-lme-text-secondary leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Prompts Guide */}
                    {activeTab === 'prompts' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-vio/30 p-6 rounded-2xl flex items-start gap-4">
                                <div className="p-3 bg-vio/20 rounded-xl">
                                    <Sparkles className="w-6 h-6 text-vio" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Potencia Pasos con IA</h3>
                                    <p className="text-lme-text-secondary">
                                        Pasos V2 tiene un "Asistente Mágico" capaz de entender listas y tableros complejos.
                                        Usa ChatGPT, Claude o Gemini con estos "Prompts" (instrucciones) para generar contenido pedagógico en segundos.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-6">
                                {PROMPTS_GUIDE.map((item, idx) => (
                                    <div key={idx} className="bg-lme-surface border border-lme-border rounded-2xl p-6 shadow-lg">
                                        <div className="mb-4">
                                            <h4 className="text-lg font-bold text-lme-text flex items-center gap-2">
                                                <span className="px-2 py-1 bg-lme-primary/10 text-lme-primary rounded text-xs uppercase tracking-wide">
                                                    Prompt
                                                </span>
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-lme-text-secondary mt-1">{item.description}</p>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => copyToClipboard(item.prompt, idx)}
                                                    className="p-2 bg-lme-primary hover:bg-lme-primary-dark text-white rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold transition-all"
                                                >
                                                    {copiedPrompt === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    {copiedPrompt === idx ? '¡Copiado!' : 'Copiar'}
                                                </button>
                                            </div>
                                            <pre className="bg-black/30 text-vio/80 p-4 rounded-xl border border-indigo-500/20 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                                {item.prompt}
                                            </pre>
                                        </div>

                                        {item.example && (
                                            <div className="mt-4 pt-4 border-t border-lme-border/50">
                                                <p className="text-xs font-bold text-sub uppercase mb-2">Resultado esperado:</p>
                                                <div className="bg-black/10 p-3 rounded-lg text-xs font-mono text-sub">
                                                    {item.example}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tutorial interactivo */}
                    {activeTab === 'tutorial' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Hero del tutorial */}
                            <div className="bg-gradient-to-br from-lme-primary/15 to-blue-500/10 border border-lme-primary/30 rounded-2xl p-6 text-center">
                                <div className="text-5xl mb-3">🗺️</div>
                                <h3 className="text-2xl font-black text-lme-text mb-2">Tutorial completo de Pasos</h3>
                                <p className="text-lme-text-secondary mb-4">
                                    Aprende a usar Pasos desde cero en 10 pasos sencillos.<br />
                                    Perfecto si es tu primera vez.
                                </p>
                                <button
                                    onClick={() => setShowManual(true)}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-lme-primary hover:bg-lme-primary-dark text-white font-black text-lg rounded-2xl shadow-lg hover:scale-105 transition-all"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    Empezar el tutorial
                                </button>
                            </div>

                            {/* Lo que aprenderás */}
                            <div className="bg-lme-surface border border-lme-border rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <GraduationCap className="w-5 h-5 text-lme-primary" />
                                    <h4 className="font-bold text-lme-text">Lo que aprenderás</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { emoji: '🔑', texto: 'Cómo entrar a la app' },
                                        { emoji: '📋', texto: 'Crear tu primer tablero' },
                                        { emoji: '➕', texto: 'Añadir tareas fácilmente' },
                                        { emoji: '🖱️', texto: 'Mover tareas entre columnas' },
                                        { emoji: '📤', texto: 'Compartir con tus alumnos' },
                                        { emoji: '🖥️', texto: 'Usar la pizarra digital' },
                                    ].map(({ emoji, texto }) => (
                                        <div key={texto} className="flex items-center gap-2 p-2 bg-lme-surface-alt rounded-xl">
                                            <span className="text-xl">{emoji}</span>
                                            <span className="text-sm text-lme-text">{texto}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Datos del tutorial */}
                            <div className="flex gap-3">
                                {[
                                    { emoji: '⏱️', label: 'Duración', valor: '5 min' },
                                    { emoji: '📶', label: 'Nivel', valor: 'Principiante' },
                                    { emoji: '📱', label: 'Funciona en', valor: 'Móvil y PC' },
                                ].map(({ emoji, label, valor }) => (
                                    <div key={label} className="flex-1 bg-lme-surface border border-lme-border rounded-xl p-3 text-center">
                                        <div className="text-2xl">{emoji}</div>
                                        <div className="text-xs text-lme-text-secondary mt-1">{label}</div>
                                        <div className="text-sm font-bold text-lme-text">{valor}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-lme-border bg-black/20">
                    <p className="text-xs text-center text-lme-text-secondary">
                        ¿Dudas? Escríbenos a{' '}
                        <a href="mailto:contacto@edumind.es" className="text-lme-primary hover:underline font-bold">
                            contacto@edumind.es
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
