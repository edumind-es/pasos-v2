import { useEffect, useMemo, useState } from 'react';
import { Building2, Layers3, Plus, RefreshCw, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/boardStore';
import { InlineCreateDialog } from './InlineCreateDialog';
import {
    createOrganization,
    createOrganizationTeam,
    getApiErrorMessage,
    listOrgMembers,
    listOrganizations,
    listOrganizationTeams,
    removeOrgMember,
    updateOrgMemberRole,
    type ProOrgMembershipResponse,
    type ProOrganizationResponse,
    type ProTeamResponse,
} from '../services/pasosApi';
import { getBoardTypeOptions, type SupportedBoardType } from '../utils/boardPresets';
import { getWorkspaceSubPath } from '../utils/workspaceRoutes';
import { TeamMembersDialog } from './TeamMembersDialog';
import { logAppEvent } from '../services/appTelemetry';

const ROLE_LABELS: Record<string, string> = {
    organization_admin: 'Administración',
    leadership: 'Dirección',
    teacher: 'Docente',
    member: 'Miembro',
    owner: 'Propietario/a',
    editor: 'Editor/a',
    viewer: 'Solo lectura',
};

function roleLabel(role: string | undefined): string {
    if (!role) return '';
    return ROLE_LABELS[role] ?? role;
}

function normalizeWorkspaceName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

interface WorkspaceContextBarProps {
    onRequestCreateBoard?: (boardType?: SupportedBoardType) => void;
    allowPersonalWorkspace?: boolean;
}

export function WorkspaceContextBar({
    onRequestCreateBoard,
    allowPersonalWorkspace = true,
}: WorkspaceContextBarProps) {
    const {
        currentUser,
        currentOrganizationId,
        currentTeamId,
        setCurrentOrganization,
        setCurrentTeam,
    } = useStore();
    const [organizations, setOrganizations] = useState<ProOrganizationResponse[]>([]);
    const [teams, setTeams] = useState<ProTeamResponse[]>([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateOrganization, setShowCreateOrganization] = useState(false);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    const [showOrgMembers, setShowOrgMembers] = useState(false);
    const [orgMembers, setOrgMembers] = useState<ProOrgMembershipResponse[]>([]);
    const [loadingOrgMembers, setLoadingOrgMembers] = useState(false);
    const [orgMemberError, setOrgMemberError] = useState<string | null>(null);
    const [changingOrgRole, setChangingOrgRole] = useState<string | null>(null);
    const [removingOrgMember, setRemovingOrgMember] = useState<string | null>(null);

    const selectedOrganization = useMemo(
        () => organizations.find((organization) => organization.id === currentOrganizationId) ?? null,
        [currentOrganizationId, organizations],
    );
    const selectedTeam = useMemo(
        () => teams.find((team) => team.id === currentTeamId) ?? null,
        [currentTeamId, teams],
    );
    const activeContextType = selectedTeam ? 'team' : selectedOrganization ? 'organization' : 'personal';
    const displayContextType = activeContextType === 'personal' && !allowPersonalWorkspace ? 'organization' : activeContextType;
    const quickCreateOptions = useMemo(
        () => getBoardTypeOptions(displayContextType),
        [displayContextType],
    );
    const workspaceLabel = displayContextType === 'team'
        ? 'Pasos Equipo'
        : displayContextType === 'organization'
            ? 'Pasos Claustro'
            : allowPersonalWorkspace
                ? 'Pasos Aula'
                : 'Pasos Claustro';
    const workspaceDescription = displayContextType === 'team'
        ? 'Coordina tareas compartidas, acuerdos y seguimiento del equipo activo.'
        : displayContextType === 'organization'
            ? 'Organiza proyectos de centro, comisiones y líneas de trabajo institucional.'
            : allowPersonalWorkspace
                ? 'Mantén tus tableros pedagógicos personales separados del trabajo organizativo.'
                : 'Selecciona o crea una organización para entrar en el trabajo de claustro.';
    const canCreateBoardInContext = allowPersonalWorkspace || Boolean(selectedOrganization || selectedTeam);
    const canManageSelectedTeam = Boolean(
        selectedTeam
        && (
            selectedTeam.role === 'owner'
            || selectedOrganization?.role === 'organization_admin'
            || selectedOrganization?.role === 'leadership'
        )
    );

    useEffect(() => {
        if (currentUser?.mode !== 'pro') {
            setOrganizations([]);
            setTeams([]);
            setError(null);
            return;
        }

        let cancelled = false;
        setLoadingOrganizations(true);
        listOrganizations()
            .then((payload) => {
                if (cancelled) return;
                setOrganizations(payload);
                setError(null);
                if (!payload.length || (currentOrganizationId && !payload.some((item) => item.id === currentOrganizationId))) {
                    setCurrentOrganization(null);
                }
            })
            .catch((issue) => {
                if (cancelled) return;
                setError(getApiErrorMessage(issue, 'No se pudieron cargar las organizaciones.'));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingOrganizations(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, currentUser?.mode, setCurrentOrganization]);

    useEffect(() => {
        if (currentUser?.mode !== 'pro' || !currentOrganizationId) {
            setTeams([]);
            return;
        }

        let cancelled = false;
        setLoadingTeams(true);
        listOrganizationTeams(currentOrganizationId)
            .then((payload) => {
                if (cancelled) return;
                setTeams(payload);
                setError(null);
                if (currentTeamId && !payload.some((team) => team.id === currentTeamId)) {
                    setCurrentTeam(null);
                }
            })
            .catch((issue) => {
                if (cancelled) return;
                setError(getApiErrorMessage(issue, 'No se pudieron cargar los equipos.'));
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingTeams(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currentOrganizationId, currentTeamId, currentUser?.mode, setCurrentTeam]);

    if (currentUser?.mode !== 'pro') {
        return null;
    }

    const handleRefresh = async () => {
        setLoadingOrganizations(true);
        setLoadingTeams(true);
        setError(null);
        try {
            const nextOrganizations = await listOrganizations();
            setOrganizations(nextOrganizations);
            const nextOrganizationId = currentOrganizationId && nextOrganizations.some((item) => item.id === currentOrganizationId)
                ? currentOrganizationId
                : null;
            setCurrentOrganization(nextOrganizationId);
            if (nextOrganizationId) {
                const nextTeams = await listOrganizationTeams(nextOrganizationId);
                setTeams(nextTeams);
            } else {
                setTeams([]);
            }
        } catch (issue) {
            setError(getApiErrorMessage(issue, 'No se pudo refrescar el contexto Pro.'));
        } finally {
            setLoadingOrganizations(false);
            setLoadingTeams(false);
        }
    };

    const loadOrgMembers = async (orgId: string) => {
        setLoadingOrgMembers(true);
        setOrgMemberError(null);
        try {
            const payload = await listOrgMembers(orgId);
            setOrgMembers(payload);
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudieron cargar los miembros.'));
        } finally {
            setLoadingOrgMembers(false);
        }
    };

    const handleToggleOrgMembers = () => {
        if (!showOrgMembers && selectedOrganization) {
            void loadOrgMembers(selectedOrganization.id);
        }
        setShowOrgMembers(v => !v);
    };

    const handleOrgRoleChange = async (memberId: string, userId: string, newRole: ProOrgMembershipResponse['role']) => {
        if (!selectedOrganization) return;
        setChangingOrgRole(memberId);
        setOrgMemberError(null);
        try {
            const updated = await updateOrgMemberRole(selectedOrganization.id, userId, newRole);
            setOrgMembers(prev => prev.map(m => m.id === memberId ? updated : m));
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudo cambiar el rol.'));
        } finally {
            setChangingOrgRole(null);
        }
    };

    const handleRemoveOrgMember = async (memberId: string, userId: string, displayName: string) => {
        if (!selectedOrganization) return;
        if (!window.confirm(`¿Eliminar a ${displayName} de la organización?`)) return;
        setRemovingOrgMember(memberId);
        setOrgMemberError(null);
        try {
            await removeOrgMember(selectedOrganization.id, userId);
            setOrgMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (issue) {
            setOrgMemberError(getApiErrorMessage(issue, 'No se pudo eliminar el miembro.'));
        } finally {
            setRemovingOrgMember(null);
        }
    };

    const isOrgAdmin = selectedOrganization?.role === 'organization_admin' || selectedOrganization?.role === 'leadership';

    return (
        <>
            <section className="rounded-2xl border border-lme-border bg-lme-surface/60 p-4 backdrop-blur-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1 xl:items-end">
                        <label className="flex min-w-0 flex-col gap-2">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sub">
                                <Building2 className="h-4 w-4" />
                                Organización
                            </span>
                            <select
                                value={currentOrganizationId ?? ''}
                                onChange={(event) => setCurrentOrganization(event.target.value || null)}
                                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                                aria-label="Organización activa"
                            >
                                {allowPersonalWorkspace && <option value="">Espacio personal</option>}
                                {!allowPersonalWorkspace && <option value="">Selecciona una organización</option>}
                                {organizations.map((organization) => (
                                    <option key={organization.id} value={organization.id}>
                                        {organization.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex min-w-0 flex-col gap-2">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sub">
                                <Users className="h-4 w-4" />
                                Equipo
                            </span>
                            <select
                                value={currentTeamId ?? ''}
                                onChange={(event) => setCurrentTeam(event.target.value || null)}
                                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-sm text-ink focus:border-sky focus:outline-none"
                                aria-label="Equipo activo"
                                disabled={!currentOrganizationId || loadingTeams}
                            >
                                <option value="">Sin equipo activo</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowCreateOrganization(true)}
                            className="inline-flex items-center gap-2 rounded-full border border-sky/30 bg-sky/10 px-4 py-2 text-sm font-medium text-sky transition-colors hover:bg-sky/20"
                        >
                            <Plus className="h-4 w-4" />
                            Organización
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateTeam(true)}
                            disabled={!selectedOrganization}
                            className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-4 py-2 text-sm font-medium text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Equipo
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-sub transition-colors hover:bg-white/5 hover:text-ink"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refrescar
                        </button>
                        {(selectedOrganization || selectedTeam) && (
                            <Link
                                to={getWorkspaceSubPath('organization', 'centro')}
                                className="inline-flex items-center gap-2 rounded-full border border-vio/30 bg-vio/10 px-4 py-2 text-sm font-medium text-vio/80 transition-colors hover:bg-vio/20"
                            >
                                <Layers3 className="h-4 w-4" />
                                Panel ejecutivo
                            </Link>
                        )}
                        {selectedOrganization && isOrgAdmin && (
                            <button
                                type="button"
                                onClick={handleToggleOrgMembers}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${showOrgMembers ? 'border-sky/50 bg-sky/15 text-sky' : 'border-line bg-black/10 text-sub hover:bg-white/5 hover:text-ink'}`}
                            >
                                <UserCog className="h-4 w-4" />
                                Miembros
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-sub">
                    <span>
                        {loadingOrganizations ? 'Cargando organizaciones...' : `${organizations.length} organización(es) disponibles`}
                    </span>
                    <span>
                        {loadingTeams ? 'Cargando equipos...' : `${teams.length} equipo(s) disponibles`}
                    </span>
                    {selectedOrganization?.role && (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-ink">
                            {roleLabel(selectedOrganization.role)}
                        </span>
                    )}
                    {selectedTeam?.role && (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-ink">
                            {roleLabel(selectedTeam.role)} (equipo)
                        </span>
                    )}
                </div>

                {error && <p className="mt-3 text-sm text-lme-danger/80">{error}</p>}

                <div className="mt-4 rounded-2xl border border-lme-border bg-black/20 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-sub">{workspaceLabel}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-ink">
                                <Layers3 className="h-4 w-4 text-sky" />
                                <h3 className="text-base font-bold">
                                    {selectedTeam?.name ?? selectedOrganization?.name ?? (allowPersonalWorkspace ? 'Espacio personal' : 'Claustro sin seleccionar')}
                                </h3>
                            </div>
                            <p className="mt-2 max-w-2xl text-sm text-sub">{workspaceDescription}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {quickCreateOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onRequestCreateBoard?.(option.value)}
                                    disabled={!canCreateBoardInContext}
                                    className="rounded-full border border-line bg-white/5 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {option.label}
                                </button>
                            ))}
                            {selectedTeam && (
                                <button
                                    type="button"
                                    onClick={() => setShowMembersDialog(true)}
                                    disabled={!canManageSelectedTeam}
                                    className="rounded-full border border-mint/30 bg-mint/10 px-3 py-2 text-sm font-medium text-mint transition-colors hover:bg-mint/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Miembros del equipo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {showCreateOrganization && (
                <InlineCreateDialog
                    title="Crear organización"
                    confirmLabel="Crear organización"
                    placeholder="Nombre del centro u organización"
                    onClose={() => setShowCreateOrganization(false)}
                    onConfirm={async (value) => {
                        const existingOrganization = organizations.find(
                            (organization) => normalizeWorkspaceName(organization.name) === normalizeWorkspaceName(value)
                        );
                        if (existingOrganization) {
                            setCurrentOrganization(existingOrganization.id);
                            return;
                        }
                        const organization = await createOrganization({ name: value });
                        setOrganizations((current) => [organization, ...current.filter((item) => item.id !== organization.id)]);
                        setCurrentOrganization(organization.id);
                        logAppEvent({
                            type: 'organization_created',
                            level: 'info',
                            message: 'Se creó una nueva organización Pro.',
                            metadata: { organization_id: organization.id },
                        });
                    }}
                />
            )}

            {showCreateTeam && selectedOrganization && (
                <InlineCreateDialog
                    title="Crear equipo"
                    confirmLabel="Crear equipo"
                    placeholder="Nombre del equipo"
                    onClose={() => setShowCreateTeam(false)}
                    onConfirm={async (value) => {
                        const existingTeam = teams.find(
                            (team) => normalizeWorkspaceName(team.name) === normalizeWorkspaceName(value)
                        );
                        if (existingTeam) {
                            setCurrentTeam(existingTeam.id);
                            return;
                        }
                        const team = await createOrganizationTeam(selectedOrganization.id, { name: value });
                        setTeams((current) => [team, ...current.filter((item) => item.id !== team.id)]);
                        setCurrentTeam(team.id);
                        logAppEvent({
                            type: 'team_created',
                            level: 'info',
                            message: 'Se creó un nuevo equipo dentro de la organización activa.',
                            metadata: { team_id: team.id, organization_id: selectedOrganization.id },
                        });
                    }}
                />
            )}

            {showMembersDialog && selectedTeam && (
                <TeamMembersDialog
                    team={selectedTeam}
                    canManage={canManageSelectedTeam}
                    onClose={() => setShowMembersDialog(false)}
                />
            )}

            {/* ── Panel expandible: miembros de la organización ── */}
            {showOrgMembers && selectedOrganization && (
                <div className="mt-4 rounded-2xl border border-lme-border bg-black/20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-sky" />
                            <h3 className="text-base font-bold text-ink">Miembros de {selectedOrganization.name}</h3>
                        </div>
                        <button type="button" onClick={() => setShowOrgMembers(false)} className="text-xs text-sub hover:text-ink transition-colors">Cerrar</button>
                    </div>

                    {orgMemberError && (
                        <div className="mb-3 rounded-xl border border-lme-danger/30 bg-lme-danger/10 p-3 text-xs text-lme-danger/80">{orgMemberError}</div>
                    )}

                    {loadingOrgMembers ? (
                        <p className="text-sm text-sub">Cargando miembros…</p>
                    ) : orgMembers.length === 0 ? (
                        <p className="text-sm text-sub">No hay miembros adicionales registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {orgMembers.map((member) => {
                                const isSelf = member.user.email === currentUser?.email;
                                const displayName = member.user.display_name || member.user.email;
                                const isChanging = changingOrgRole === member.id;
                                const isRemoving = removingOrgMember === member.id;
                                return (
                                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-lme-border bg-lme-surface/30 px-3 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                                            <p className="truncate text-[11px] text-sub">{member.user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isOrgAdmin && !isSelf ? (
                                                <select
                                                    value={member.role}
                                                    disabled={isChanging || isRemoving}
                                                    onChange={(e) => void handleOrgRoleChange(member.id, member.user.id, e.target.value as ProOrgMembershipResponse['role'])}
                                                    className="rounded-xl border border-line bg-black/20 px-3 py-1.5 text-xs text-ink focus:border-sky focus:outline-none disabled:opacity-50"
                                                >
                                                    <option value="member">Miembro</option>
                                                    <option value="teacher">Docente</option>
                                                    <option value="leadership">Dirección</option>
                                                    <option value="organization_admin">Administración</option>
                                                </select>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-ink">
                                                    <Shield className="h-3 w-3 text-mint" />
                                                    {roleLabel(member.role)}
                                                    {isSelf && <span className="text-sub ml-1">(tú)</span>}
                                                </span>
                                            )}
                                            {isOrgAdmin && !isSelf && (
                                                <button
                                                    type="button"
                                                    disabled={isChanging || isRemoving}
                                                    onClick={() => void handleRemoveOrgMember(member.id, member.user.id, displayName)}
                                                    title={`Eliminar a ${displayName} de la organización`}
                                                    className="rounded-lg p-1.5 text-sub hover:text-lme-danger transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
