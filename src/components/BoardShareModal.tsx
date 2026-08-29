import { Check, Copy, Share2 } from 'lucide-react';
import type { ShareSource } from '../hooks/useShareBoard';

interface Props {
    isSharing: boolean;
    shareCode: string | null;
    shareError: string | null;
    shareSource: ShareSource;
    shareExpiresAt: string | null;
    codeCopied: boolean;
    onCopy: () => void;
    onClose: () => void;
}

/** Modal con el código y enlace de acceso para el alumnado. */
export function BoardShareModal({
    isSharing,
    shareCode,
    shareError,
    shareSource,
    shareExpiresAt,
    codeCopied,
    onCopy,
    onClose,
}: Props) {
    return (
        <div className="fixed inset-0 z-dropdown flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full mx-4 animate-scale-in">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mint/20 flex items-center justify-center">
                        <Share2 className="w-8 h-8 text-mint" />
                    </div>
                    <h2 className="text-xl font-bold text-ink mb-2">Compartir Tablero</h2>
                    <p className="text-sub text-sm">
                        {isSharing
                            ? 'Preparando el enlace compartido...'
                            : shareError
                                ? 'No hemos podido generar el enlace compartido.'
                                : shareSource === 'pro'
                                    ? 'Este enlace ya se resuelve mediante backend y funciona entre dispositivos.'
                                    : 'Beta local: este código solo debe considerarse operativo en el mismo navegador o dispositivo.'}
                    </p>
                </div>

                {/* Código de acceso */}
                <div className="bg-lme-surface rounded-xl p-4 mb-4">
                    <p className="text-xs text-sub mb-2 text-center">Código de acceso</p>
                    <div className="text-3xl font-mono font-bold text-mint text-center tracking-widest">
                        {isSharing ? '...' : shareCode ?? '----'}
                    </div>
                </div>

                {shareError && (
                    <div className="mb-4 p-3 rounded-lg border border-lme-danger/30 bg-lme-danger/10 text-sm text-lme-danger/80">
                        {shareError}
                    </div>
                )}

                {shareExpiresAt && (
                    <div className="mb-4 p-3 rounded-lg bg-black/20 text-xs text-sub">
                        Disponible hasta: {new Date(shareExpiresAt).toLocaleString()}
                    </div>
                )}

                {/* Copiar enlace */}
                <button
                    onClick={onCopy}
                    disabled={!shareCode || isSharing || Boolean(shareError)}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                              ${codeCopied
                            ? 'bg-mint text-bg0'
                            : 'bg-lme-surface border border-lme-border text-ink hover:bg-white/5'}
                              disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {codeCopied ? (
                        <>
                            <Check className="w-5 h-5" />
                            ¡Enlace copiado!
                        </>
                    ) : (
                        <>
                            <Copy className="w-5 h-5" />
                            Copiar enlace de acceso
                        </>
                    )}
                </button>

                {/* URL directa */}
                <div className="mt-4 p-3 bg-black/20 rounded-lg">
                    <p className="text-xs text-sub mb-1">
                        {shareSource === 'pro' ? 'Enlace de acceso sincronizado:' : 'Enlace de acceso beta local:'}
                    </p>
                    <p className="text-xs font-mono text-sky break-all">
                        {shareCode ? `${window.location.origin}/codigo?code=${shareCode}` : 'Pendiente de generar'}
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2 text-sub hover:text-ink text-sm transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}
