import { getStore } from '@netlify/blobs';

const STORE_NAME = 'crew-portal';
const DB_KEY = 'db';
const LOA_REVIEW_RETENTION_MS = 24 * 60 * 60 * 1000;

export const CREW_STATUS_OPTIONS = [
  'Exempt',
  'Active',
  'Deriorating',
  'Inactive',
  'Authorise Leave',
];

export const FLIGHT_ROLE_SLOTS = [
  { role: 'Flight Dispatcher', capacity: 1 },
  { role: 'Duty Manager', capacity: 2 },
  { role: 'Captain', capacity: 1 },
  { role: 'First Officer', capacity: 1 },
  { role: 'Cabin Manager', capacity: 1 },
  { role: 'Senior Cabin Crew', capacity: 1 },
  { role: 'Cabin Crew', capacity: 3 },
  { role: 'Turnaround Coordinator', capacity: 1 },
  { role: 'Ramp Agent', capacity: 3 },
  { role: 'Security Manager', capacity: 1 },
  { role: 'Security Officer', capacity: 4 },
];

const DEFAULT_DB = {
  crewMembers: [],
  flights: [],
  flightAllocations: [],
  loaRequests: [],
  notices: [],
  seniorManagementRequests: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getRolesArray(crewMember) {
  if (Array.isArray(crewMember?.roles)) return crewMember.roles;
  if (crewMember?.role) return [crewMember.role];
  return [];
}

function sortRecords(records, sort) {
  if (!sort) return records;
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;

  return [...records].sort((a, b) => {
    const aValue = a?.[field];
    const bValue = b?.[field];
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return descending ? 1 : -1;
    if (bValue == null) return descending ? -1 : 1;
    if (aValue === bValue) return 0;
    return (aValue > bValue ? 1 : -1) * (descending ? -1 : 1);
  });
}

function applyLimit(records, limit) {
  return limit ? records.slice(0, limit) : records;
}

function purgeExpiredReviewedLoaRequests(db) {
  const cutoff = Date.now() - LOA_REVIEW_RETENTION_MS;
  db.loaRequests = db.loaRequests.filter(request => {
    if (request.status === 'Pending' || !request.reviewed_at) return true;
    return new Date(request.reviewed_at).getTime() > cutoff;
  });
  return db;
}

function createSeedDb() {
  const ronnieId = generateId('crew');
  const createdDate = nowIso();

  return {
    crewMembers: [
      {
        id: ronnieId,
        username: 'Ronnie',
        password: 'admin123',
        display_name: 'Ronnie',
        roles: [
          'Executive Board',
          'Senior Board',
          'Recruitment',
          'Flight Dispatcher',
          'Cabin Operations',
          'Flight Deck',
          'Airside Operations',
          'Security',
        ],
        rank: 'Chief Executive Officer',
        status: 'Active',
        avatar_url: '',
        join_date: createdDate.slice(0, 10),
        flights_completed: 0,
        created_date: createdDate,
        updated_date: createdDate,
      },
    ],
    flights: [],
    flightAllocations: [],
    loaRequests: [],
    notices: [
      {
        id: generateId('notice'),
        title: 'Welcome to the crew portal',
        content: 'Board notices, LOA decisions, and flight allocation updates will appear here.',
        priority: 'Medium',
        pinned: true,
        author_name: 'Ronnie',
        author_roles: ['Executive Board'],
        author_rank: 'Chief Executive Officer',
        created_date: createdDate,
        updated_date: createdDate,
      },
    ],
    seniorManagementRequests: [],
  };
}

function normalizeDb(rawDb) {
  const db = rawDb && typeof rawDb === 'object' ? rawDb : DEFAULT_DB;
  const normalized = {
    crewMembers: Array.isArray(db.crewMembers) ? db.crewMembers : [],
    flights: Array.isArray(db.flights) ? db.flights : [],
    flightAllocations: Array.isArray(db.flightAllocations) ? db.flightAllocations : [],
    loaRequests: Array.isArray(db.loaRequests) ? db.loaRequests : [],
    notices: Array.isArray(db.notices) ? db.notices : [],
    seniorManagementRequests: Array.isArray(db.seniorManagementRequests) ? db.seniorManagementRequests : [],
  };

  if (!normalized.crewMembers.some(member => member.username === 'Ronnie')) {
    const seeded = createSeedDb();
    normalized.crewMembers = [...seeded.crewMembers, ...normalized.crewMembers];
    if (normalized.notices.length === 0) normalized.notices = seeded.notices;
  }

  return purgeExpiredReviewedLoaRequests(normalized);
}

async function getDbStore() {
  const siteID =
    (typeof process !== 'undefined' && process.env?.SITE_ID) ||
    (typeof Netlify !== 'undefined' && Netlify.env?.get?.('SITE_ID')) ||
    undefined;

  return getStore({ name: STORE_NAME, siteID, consistency: 'strong' });
}

export async function readDb() {
  const store = await getDbStore();
  const existing = await store.get(DB_KEY, { type: 'json' });
  if (!existing) {
    const seeded = createSeedDb();
    await store.setJSON(DB_KEY, seeded);
    return seeded;
  }

  const normalized = normalizeDb(existing);
  return normalized;
}

export async function writeDb(mutator) {
  const store = await getDbStore();
  const current = await readDb();
  const next = normalizeDb(await mutator(clone(current)));
  await store.setJSON(DB_KEY, next);
  return clone(next);
}

export function getCrewMemberById(db, id) {
  return db.crewMembers.find(member => member.id === id) || null;
}

export function listCrewMembers(db) {
  return sortRecords(db.crewMembers, 'display_name');
}

export function listFlights(db, { sort = 'date', status, limit } = {}) {
  let flights = [...db.flights];
  if (status) flights = flights.filter(flight => flight.status === status);
  return applyLimit(sortRecords(flights, sort), limit);
}

export function listFlightAllocations(db, { flightId, crewMemberId } = {}) {
  let allocations = [...db.flightAllocations];
  if (flightId) allocations = allocations.filter(item => item.flight_id === flightId);
  if (crewMemberId) allocations = allocations.filter(item => item.crew_member_id === crewMemberId);
  return sortRecords(allocations, 'position');
}

export function listNotices(db, { sort = '-created_date', limit, boardOnly = false } = {}) {
  let notices = [...db.notices];
  if (boardOnly) {
    notices = notices.filter(notice => {
      const roles = Array.isArray(notice.author_roles) ? notice.author_roles : [];
      return roles.includes('Executive Board') || roles.includes('Senior Board');
    });
  }
  notices.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  return applyLimit(sortRecords(notices, sort), limit);
}

export function listLoaRequests(db, { crewMemberId, sort = '-created_date' } = {}) {
  let requests = [...db.loaRequests];
  if (crewMemberId) requests = requests.filter(item => item.crew_member_id === crewMemberId);
  return sortRecords(requests, sort);
}

export function listSeniorManagementRequests(db, { crewMemberId, sort = '-created_date' } = {}) {
  let requests = [...db.seniorManagementRequests];
  if (crewMemberId) requests = requests.filter(item => item.crew_member_id === crewMemberId);
  return sortRecords(requests, sort);
}

export function createCrewMemberRecord(data) {
  const createdDate = nowIso();
  return {
    id: generateId('crew'),
    username: data.username.trim(),
    password: data.password,
    display_name: data.display_name.trim(),
    roles: data.roles || [],
    rank: data.rank || '',
    status: data.status || 'Active',
    avatar_url: data.avatar_url || '',
    join_date: data.join_date || createdDate.slice(0, 10),
    flights_completed: Number(data.flights_completed || 0),
    created_date: createdDate,
    updated_date: createdDate,
  };
}

export function createFlightRecord(data, crewMember) {
  const createdDate = nowIso();
  return {
    id: generateId('flight'),
    flight_number: data.flight_number?.trim() || `FLT-${Date.now()}`,
    departure: data.departure?.trim(),
    arrival: data.arrival?.trim(),
    date: new Date(data.date).toISOString(),
    aircraft: data.aircraft?.trim() || '',
    plane_model: data.plane_model?.trim() || '',
    plane_registration: data.plane_registration?.trim() || '',
    status: data.status || 'Scheduled',
    max_crew: FLIGHT_ROLE_SLOTS.reduce((sum, item) => sum + item.capacity, 0),
    created_by_name: crewMember?.display_name || '',
    created_date: createdDate,
    updated_date: createdDate,
  };
}

export function createLoaRequestRecord(data, crewMember) {
  return {
    id: generateId('loa'),
    crew_member_id: crewMember.id,
    crew_member_name: crewMember.display_name,
    start_date: data.start_date,
    end_date: data.end_date,
    reason: data.reason.trim(),
    status: 'Pending',
    reviewed_by: '',
    reviewed_at: '',
    notification_dismissed: true,
    admin_seen: false,
    created_date: nowIso(),
    updated_date: nowIso(),
  };
}

export function createSeniorManagementRequestRecord(data, crewMember) {
  return {
    id: generateId('smr'),
    crew_member_id: crewMember.id,
    crew_member_name: crewMember.display_name,
    request_type: data.request_type,
    requested_at: new Date(data.requested_at).toISOString(),
    reason: data.reason.trim(),
    status: 'Pending',
    reviewed_by: '',
    reviewed_at: '',
    admin_seen: false,
    created_date: nowIso(),
    updated_date: nowIso(),
  };
}

export function createAllocationRecord({ flightId, crewMember, position }) {
  return {
    id: generateId('alloc'),
    flight_id: flightId,
    crew_member_id: crewMember.id,
    crew_member_name: crewMember.display_name,
    crew_member_roles: getRolesArray(crewMember).join(', '),
    position,
    created_date: nowIso(),
  };
}

export function createNoticeRecord(data, author) {
  const createdDate = nowIso();
  return {
    id: generateId('notice'),
    title: data.title.trim(),
    content: data.content.trim(),
    priority: data.priority || 'Medium',
    pinned: Boolean(data.pinned),
    author_name: author?.display_name || '',
    author_roles: getRolesArray(author),
    author_rank: author?.rank || '',
    created_date: createdDate,
    updated_date: createdDate,
  };
}
