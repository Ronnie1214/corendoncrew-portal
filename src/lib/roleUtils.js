export const ROLE_ORDER = [
  'Executive Board',
  'Senior Board',
  'Recruitment',
  'Flight Dispatcher',
  'Cabin Operations',
  'Flight Deck',
  'Airside Operations',
  'Security',
  'Passenger Services',
  'Engineering',
];

export const RANK_ORDER = [
  'Chairman',
  'Chief Executive Officer',
  'Chief Operations Officer',
  'Chief Staffing Officer',
  'Chief Technology Officer',
  'Chief Compliance Officer',
  'Chief Financial Officer',
  'Recruitment Director',
  'Director of Cabin Operations',
  'Chief Pilot',
  'Director of Airside Operations',
  'Director of Safety & Security',
  'Director of Passenger Services',
  'Network Manager',
  'Line Training Captain',
  'Turnaround Coordinator',
  'Cabin Service Manager',
  'Security Manager',
  'Senior Captain',
  'Captain',
  'Senior Cabin Crew',
  'Senior First Officer',
  'Cabin Crew',
  'First Officer',
  'Ramp Agent',
];

export const ALL_ROLES = [...ROLE_ORDER];

export const ROLE_COLORS = {
  'Executive Board': 'bg-accent/10 text-accent border-accent/20',
  'Senior Board': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Recruitment': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Flight Dispatcher': 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  'Cabin Operations': 'bg-primary/10 text-primary border-primary/20',
  'Flight Deck': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Airside Operations': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Security': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Passenger Services': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Engineering': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

export const sortRoles = (roles = []) => (
  [...roles].sort((a, b) => {
    const aIndex = ROLE_ORDER.indexOf(a);
    const bIndex = ROLE_ORDER.indexOf(b);
    const safeA = aIndex === -1 ? ROLE_ORDER.length : aIndex;
    const safeB = bIndex === -1 ? ROLE_ORDER.length : bIndex;
    return safeA - safeB || a.localeCompare(b);
  })
);

export const sortByRank = (members = []) => (
  [...members].sort((a, b) => {
    const aIndex = RANK_ORDER.indexOf(a?.rank || '');
    const bIndex = RANK_ORDER.indexOf(b?.rank || '');
    const safeA = aIndex === -1 ? RANK_ORDER.length : aIndex;
    const safeB = bIndex === -1 ? RANK_ORDER.length : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return (a?.display_name || '').localeCompare(b?.display_name || '');
  })
);

export const hasRole = (crewMember, role) => {
  if (crewMember?.roles) return crewMember.roles.includes(role);
  return crewMember?.role === role;
};

export const hasAnyRole = (crewMember, ...roles) => roles.some(r => hasRole(crewMember, r));

export const getRolesArray = (crewMember) => {
  if (crewMember?.roles) return sortRoles(crewMember.roles);
  if (crewMember?.role) return [crewMember.role];
  return [];
};
