/** Formatea segundos como mm:ss. */
export function formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.max(0, totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Campana breve al agotarse el tiempo. Los navegadores pueden bloquear audio sin interacción previa. */
export function playTimerAlert(): void {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        window.setTimeout(() => { void ctx.close(); }, 500);
    } catch {
        // Sin audio disponible: el temporizador sigue funcionando visualmente.
    }
}
