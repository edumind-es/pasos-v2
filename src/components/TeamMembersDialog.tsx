import { useEffect, useMemo, useState } from 'react';
import { Hash, Mail, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import {
    addTeamMember,
    getApiErrorMessage,
    listTeamMembers,
    removeTeamMember,
    updateTeamMemberRole,
    type ProTeamMembershipResponse,
    type ProTeamResponse,
} from '../services/pasosApi';
import { logAppEvent } from '../services/appTelemetry';
import { useStore } from '../store/boardStore';

interface TeamMembersDialogProps {
    team: ProTeamResponse;
    canManage: boolean;
    onClose: () => void;
}

const ROLE_ORDER: Record<ProTeamMembershipResponse['role'], number> = {
    owner: 0,
    editor: 1,
    viewer: 2,
};

const ROLE_LABELS: Record<ProTeamMembershipResponse['role'], string> = {
    owner: 'Responsable',
    editor: 'Editor',
    viewer: 'Consulta',
};

export function TeamMembersDialog({ team, canManage, onClose }: TeamMembersDialogProps) {
    const currentUser = useStore((state) => state.currentUser);
    const [members, setMembers] = useState<ProTeamMembershipResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [userCode, setUserCode] = useState('');
    const [inviteMode, setInviteMode] = useState<'email' | 'code'>('email');
    const [role, setRole] = useState<ProTeamMembershipResponse['role']>('viewer');
    const [submitting, setSubmitting] = useState(false);
    const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
    const [removingMember, setRemovingMember] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadMembers = async () => {
            setLoading(true);
            try {
                const payload = await listTeamMembers(team.id);
                if (!cancelled) {
                    setMembers(payload);
                    setError(null);
                }
            } catch (issue) {
                if (cancelled) return;
                const message = getApiErrorMessage(issue, 'No se pudieron cargar los miembros del equipo.');
                setError(message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadMembers();

        return () => {
            cancelled = true;
        };
    }, [team.id]);

    const orderedMembers = useMemo(() => (
        [...members].sort((left, right) => {
            const roleDistance = ROLE_ORDER[left.role] - ROLE_ORDER[right.role];
            if (roleDistance !== 0) {
                return roleDistance;
            }
            return (left.user.display_name ?? left.user.email).localeCompare(right.user.display_name ?? right.user.email, 'es');
        })
    ), [members]);

    const handleInvite = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCode = userCode.trim().toUpperCase();
        const targetReady = inviteMode === 'email' ? normalizedEmail : normalizedCode;
        if (!targetReady || !canManage) {
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const membership = await addTeamMember(team.id, {
                userEmail: inviteMode === 'email' ? normalizedEmail : undefined,
                userCode: inviteMode === 'code' ? normalizedCode : undefined,
                role,
            });
            setMembers((current) => {
                const next = current.filter((item) => item.user.id !== membership.user.id);
                return [...next, membership];
            });
            setEmail('');
            setUserCode('');
            setRole('viewer');
            logAppEvent({
                type: 'team_member_added',
                level: 'info',
                message: 'Se añadió una nueva persona al equipo activo.',
                metadata: { team_id: team.id, role: membership.role, invite_mode: inviteMode },
            });
        } catch (issue) {
            const message = getApiErrorMessage(issue, 'No se pudo incorporar la persona al equipo.');
            setError(message);
            logAppEvent({
                type: 'team_member_add_failed',
                level: 'warning',
                message,
                metadata: { team_id: team.id },
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChange = async (memberId: string, userId: string, newRole: ProTeamMembershipResponse['role']) => {
        if (!canManage) return;
        setChangingRoleFor(memberId);
        setError(null);
        try {
            const updated = await updateTeamMemberRole(team.id, userId, newRole);
            setMembers(prev => prev.map(m => m.id === memberId ? updated : m));
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo cambiar el rol.'));
        } finally {
            setChangingRoleFor(null);
        }
    };

    const handleRemoveMember = async (memberId: string, userId: string, displayName: string) => {
        if (!canManage) return;
        if (!window.confirm(`¿Eliminar a ${displayName} del equipo?`)) return;
        setRemovingMember(memberId);
        setError(null);
        try {
            await removeTeamMember(team.id, userId);
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo eliminar el miembro.'));
        } finally {
            setRemovingMember(null);
        }
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-members-dialog-title"
                className="glass-panel w-full max-w-4xl rounded-3xl p-6 sm:p-8"
            >
                <div className="flex flex-col gap-4 border-b border-line/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sub">Pasos Equipo</p>
                        <h2 id="team-members-dialog-title" className="mt-1 text-2xl font-black text-ink">
                            Miembros de {team.name}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-sub">
                            Gestiona quién coordina, edita o consulta el trabajo compartido del equipo.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="self-start rounded-xl px-4 py-2 text-sm font-medium text-sub transition-colors hover:text-ink"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <Users className="h-4 w-4 text-sky" />
                            <h3 className="text-base font-bold">Equipo activo</h3>
                        </div>
                        <div className="mt-4 grid gap-3">
                            {loading ? (
                                <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                    Cargando miembros del equipo...
                                </div>
                            ) : orderedMembers.length === 0 ? (
                                <div className="rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                    Este equipo todavía no tiene miembros adicionales.
                                </div>
                            ) : (
                                orderedMembers.map((member) => {
                                    const isSelf = Boolean(currentUser?.email && member.user.email === currentUser.email);
                                    const isChanging = changingRoleFor === member.id;
                                    const isRemoving = removingMember === member.id;
                                    const displayName = member.user.display_name || member.user.email;
                                    return (
                                        <article key={member.id} className="rounded-2xl border border-lme-border bg-lme-surface/40 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                                                    <p className="truncate text-xs text-sub">{member.user.email}</p>
                                                    <p className="truncate text-[11px] text-sub">Código: {member.user.workspace_code}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {canManage && !isSelf ? (
                                                        <select
                                                            value={member.role}
                                                            disabled={isChanging || isRemoving}
                                                            onChange={(e) => void handleRoleChange(member.id, member.user.id, e.target.value as ProTeamMembershipResponse['role'])}
                                                            className="rounded-xl border border-line bg-black/20 px-3 py-1.5 text-xs text-ink focus:border-sky focus:outline-none disabled:opacity-50"
                                                        >
                                                            <option value="viewer">Consulta</option>
                                                            <option value="editor">Editor</option>
                                                            <option value="owner">Responsable</option>
                                                        </select>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-ink">
                                                            <Shield className="h-3 w-3 text-mint" />
                                                            {ROLE_LABELS[member.role]}
                                                            {isSelf && <span className="text-sub">(tú)</span>}
                                                        </span>
                                                    )}
                                                    {canManage && !isSelf && (
                                                        <button
                                                            type="button"
                                                            disabled={isChanging || isRemoving}
                                                            onClick={() => void handleRemoveMember(member.id, member.user.id, displayName)}
                                                            title={`Expulsar a ${displayName}`}
                                                            className="rounded-lg p-1.5 text-sub hover:text-lme-danger transition-colors disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-lme-border bg-black/20 p-5">
                        <div className="flex items-center gap-2 text-ink">
                            <UserPlus className="h-4 w-4 text-mint" />
                            <h3 className="text-base font-bold">Añadir persona al equipo</h3>
                        </div>
                        <p className="mt-2 text-sm text-sub">
                            La persona debe tener cuenta Pro activa. Puedes incorporarla por correo o por su código de usuario.
                        </p>
                        {currentUser?.workspaceCode && (
                            <div className="mt-4 rounded-2xl border border-lme-border bg-lme-surface/30 p-4 text-sm text-sub">
                                Tu código actual para compartir con otros equipos: <span className="font-mono font-bold text-mint">{currentUser.workspaceCode}</span>
                            </div>
                        )}

                        {!canManage && (
                            <div className="mt-4 rounded-2xl border border-lme-warning/30 bg-lme-warning/10 p-4 text-sm text-lme-warning/85">
                                Tu rol actual permite consultar el equipo, pero no modificar sus miembros.
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setInviteMode('email')}
                                    disabled={!canManage || submitting}
                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${inviteMode === 'email'
                                        ? 'border-sky/30 bg-sky/10 text-sky'
                                        : 'border-line text-sub hover:bg-white/5 hover:text-ink'} disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <Mail className="mr-2 inline h-4 w-4" />
                                    Correo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInviteMode('code')}
                                    disabled={!canManage || submitting}
                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${inviteMode === 'code'
                                        ? 'border-mint/30 bg-mint/10 text-mint'
                                        : 'border-line text-sub hover:bg-white/5 hover:text-ink'} disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <Hash className="mr-2 inline h-4 w-4" />
                                    Código
                                </button>
                            </div>

                            <div>
                                <label htmlFor="team-member-target" className="mb-2 block text-xs font-semibold uppercase text-sub">
                                    {inviteMode === 'email' ? 'Correo de la cuenta Pro' : 'Código de usuario'}
                                </label>
                                {inviteMode === 'email' ? (
                                    <input
                                        id="team-member-target"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') void handleInvite();
                                            if (event.key === 'Escape') onClose();
                                        }}
                                        disabled={!canManage || submitting}
                                        className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="docente@centro.es"
                                    />
                                ) : (
                                    <input
                                        id="team-member-target"
                                        type="text"
                                        value={userCode}
                                        onChange={(event) => setUserCode(event.target.value.toUpperCase())}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') void handleInvite();
                                            if (event.key === 'Escape') onClose();
                                        }}
                                        disabled={!canManage || submitting}
                                        className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 font-mono tracking-[0.18em] text-ink focus:border-mint focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="PAS-AB12CD34"
                                    />
                                )}
                            </div>

                            <div>
                                <label htmlFor="team-member-role" className="mb-2 block text-xs font-semibold uppercase text-sub">
                                    Permiso dentro del equipo
                                </label>
                                <select
                                    id="team-member-role"
                                    value={role}
                                    onChange={(event) => setRole(event.target.value as ProTeamMembershipResponse['role'])}
                                    disabled={!canManage || submitting}
                                    className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-ink focus:border-sky focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="viewer">Consulta</option>
                                    <option value="editor">Editor</option>
                                    <option value="owner">Responsable</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 rounded-2xl border border-lme-danger/30 bg-lme-danger/10 p-4 text-sm text-lme-danger/70">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleInvite()}
                            disabled={!canManage || !(inviteMode === 'email' ? email.trim() : userCode.trim()) || submitting}
                            className="mt-5 w-full rounded-xl bg-mint px-4 py-3 text-sm font-bold text-bg0 transition-colors hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Añadiendo...' : 'Añadir al equipo'}
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
