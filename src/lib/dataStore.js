import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

const SESSION_KEY = 'crew_session';
const LEGACY_DB_KEY = 'crew_portal_db_v1';
const DATA_CHANGED_EVENT = 'crew-portal:data-changed';
const SESSION_CHANGED_EVENT = 'crew-portal:session-changed';

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

function emit(name) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
}

function mapCrewMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    roles: Array.isArray(member.roles) ? member.roles : [],
    rank: member.rank || '',
    status: member.status || 'Active',
    avatar_url: member.avatar_url || '',
    join_date: member.join_date,
    flights_completed: Number(member.flights_completed || 0),
    created_date: member.created_at || member.created_date || null,
    updated_date: member.updated_at || member.updated_date || null,
  };
}

async function supabaseRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function apiRequest(action, payload = {}) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  };

  let { response, data } = await requestJson('/api/data', requestOptions);
  if (response.status === 404) {
    ({ response, data } = await requestJson('/.netlify/functions/data', requestOptions));
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

function saveSession(member) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));
  emit(SESSION_CHANGED_EVENT);
}

export function getSessionCrewMember() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  emit(SESSION_CHANGED_EVENT);
}

export async function migrateLegacyLocalData() {
  if (hasSupabaseEnv) {
    return null;
  }

  try {
    const raw = localStorage.getItem(LEGACY_DB_KEY);
    if (!raw) return null;

    const legacyData = JSON.parse(raw);
    const { summary } = await apiRequest('importLegacyData', { legacyData });
    localStorage.removeItem(LEGACY_DB_KEY);
    return summary || null;
  } catch {
    return null;
  }
}

export async function refreshSession() {
  const session = getSessionCrewMember();
  if (!session?.id) return null;

  try {
    if (hasSupabaseEnv) {
      const data = await supabaseRpc('get_crew_member_by_id', { member_id: session.id });
      const member = mapCrewMember(Array.isArray(data) ? data[0] : data);
      if (!member) {
        clearSession();
        return null;
      }

      saveSession(member);
      return member;
    }

    const { member } = await apiRequest('getCrewMemberById', { id: session.id });
    if (!member) {
      clearSession();
      return null;
    }

    saveSession(member);
    return member;
  } catch {
    clearSession();
    return null;
  }
}

export function subscribeToStore(callback) {
  const handler = () => callback();
  window.addEventListener(DATA_CHANGED_EVENT, handler);
  window.addEventListener(SESSION_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(DATA_CHANGED_EVENT, handler);
    window.removeEventListener(SESSION_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export async function authenticateCrewMember(username, password) {
  if (hasSupabaseEnv) {
    const data = await supabaseRpc('authenticate_crew_member', {
      input_username: username,
      input_password: password,
    });
    const member = mapCrewMember(Array.isArray(data) ? data[0] : data);

    if (!member) {
      throw new Error('No crew member found with that username or password.');
    }

    if (member.status === 'Inactive') {
      throw new Error('Your account is currently inactive.');
    }

    saveSession(member);
    return member;
  }

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  };

  let { response, data } = await requestJson('/api/auth', requestOptions);
  if (response.status === 404) {
    ({ response, data } = await requestJson('/.netlify/functions/auth', requestOptions));
  }

  if (!response.ok) {
    throw new Error(data.error || 'Unable to sign in.');
  }

  saveSession(data.member);
  return data.member;
}

export function isBoardAdmin(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [];
  return roles.includes('Executive Board') || roles.includes('Senior Board');
}

export function isExecutiveBoard(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [];
  return roles.includes('Executive Board');
}

export async function listCrewMembers() {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('crew_members')
      .select('id, username, display_name, roles, rank, status, avatar_url, join_date, flights_completed, created_at, updated_at')
      .order('display_name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapCrewMember);
  }

  const { members } = await apiRequest('listCrewMembers');
  return members || [];
}

export async function createCrewMember(data) {
  if (hasSupabaseEnv) {
    const created = await supabaseRpc('create_crew_member', { input_data: data });
    const member = mapCrewMember(Array.isArray(created) ? created[0] : created);
    emit(DATA_CHANGED_EVENT);
    return member;
  }

  const { member } = await apiRequest('createCrewMember', { data });
  emit(DATA_CHANGED_EVENT);
  return member;
}

export async function updateCrewMember(id, updates) {
  if (hasSupabaseEnv) {
    const updated = await supabaseRpc('update_crew_member', { member_id: id, input_data: updates });
    const member = mapCrewMember(Array.isArray(updated) ? updated[0] : updated);
    const session = getSessionCrewMember();
    if (session?.id === id) {
      saveSession(member);
    }
    emit(DATA_CHANGED_EVENT);
    return member;
  }

  const { member } = await apiRequest('updateCrewMember', { id, updates });
  const session = getSessionCrewMember();
  if (session?.id === id) {
    saveSession(member);
  } else {
    emit(DATA_CHANGED_EVENT);
  }
  emit(DATA_CHANGED_EVENT);
  return member;
}

export async function deleteCrewMember(id) {
  if (hasSupabaseEnv) {
    await supabaseRpc('delete_crew_member', { member_id: id });
    const session = getSessionCrewMember();
    if (session?.id === id) {
      clearSession();
    }
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('deleteCrewMember', { id });
  const session = getSessionCrewMember();
  if (session?.id === id) {
    clearSession();
  }
  emit(DATA_CHANGED_EVENT);
}

export async function listFlights(options = {}) {
  const { flights } = await apiRequest('listFlights', { options });
  return flights || [];
}

export async function getFlightById(id) {
  const { flight } = await apiRequest('getFlightById', { id });
  return flight || null;
}

export async function createFlight(data, crewMember) {
  const { flight } = await apiRequest('createFlight', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return flight;
}

export async function deleteFlight(id) {
  await apiRequest('deleteFlight', { id });
  emit(DATA_CHANGED_EVENT);
}

export async function listFlightAllocations(options = {}) {
  const { allocations } = await apiRequest('listFlightAllocations', { options });
  return allocations || [];
}

export async function allocateToFlight({ flightId, crewMember, position }) {
  const { allocation } = await apiRequest('allocateToFlight', { flightId, crewMember, position });
  emit(DATA_CHANGED_EVENT);
  return allocation;
}

export async function removeFlightAllocation(id) {
  await apiRequest('removeFlightAllocation', { id });
  emit(DATA_CHANGED_EVENT);
}

export async function listNotices(options = {}) {
  const { notices } = await apiRequest('listNotices', { options });
  return notices || [];
}

export async function createNotice(data, author) {
  const { notice } = await apiRequest('createNotice', { data, author });
  emit(DATA_CHANGED_EVENT);
  return notice;
}

export async function updateNotice(id, updates) {
  const { notice } = await apiRequest('updateNotice', { id, updates });
  emit(DATA_CHANGED_EVENT);
  return notice;
}

export async function deleteNotice(id) {
  await apiRequest('deleteNotice', { id });
  emit(DATA_CHANGED_EVENT);
}

export async function listLoaRequests(options = {}) {
  const { requests } = await apiRequest('listLoaRequests', { options });
  return requests || [];
}

export async function createLoaRequest(data, crewMember) {
  const { request } = await apiRequest('createLoaRequest', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function reviewLoaRequest(id, status, reviewer) {
  const { request } = await apiRequest('reviewLoaRequest', { id, status, reviewer });
  await refreshSession();
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function dismissLoaNotification(requestId, crewMemberId) {
  await apiRequest('dismissLoaNotification', { requestId, crewMemberId });
  emit(DATA_CHANGED_EVENT);
}

export async function getActiveLoaNotification(crewMemberId) {
  const requests = await listLoaRequests({ crewMemberId });
  return requests.find(request => request.status !== 'Pending' && request.notification_dismissed === false) || null;
}

export async function markPendingLoaRequestsSeen() {
  await apiRequest('markPendingLoaRequestsSeen');
  emit(DATA_CHANGED_EVENT);
}

export async function hasUnseenPendingLoaRequests() {
  const { hasUnseen } = await apiRequest('hasUnseenPendingLoaRequests');
  return Boolean(hasUnseen);
}

export async function listSeniorManagementRequests(options = {}) {
  const { requests } = await apiRequest('listSeniorManagementRequests', { options });
  return requests || [];
}

export async function createSeniorManagementRequest(data, crewMember) {
  const { request } = await apiRequest('createSeniorManagementRequest', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function reviewSeniorManagementRequest(id, status, reviewer) {
  const { request } = await apiRequest('reviewSeniorManagementRequest', { id, status, reviewer });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function markSeniorManagementRequestsSeen() {
  await apiRequest('markSeniorManagementRequestsSeen');
  emit(DATA_CHANGED_EVENT);
}

export async function hasUnseenSeniorManagementRequests() {
  const { hasUnseen } = await apiRequest('hasUnseenSeniorManagementRequests');
  return Boolean(hasUnseen);
}

export async function getDashboardData(crewMember) {
  const [allocations, flights, notices] = await Promise.all([
    listFlightAllocations({ crewMemberId: crewMember?.id }),
    listFlights({ sort: 'date' }),
    listNotices({ boardOnly: true, limit: 10 }),
  ]);

  const now = new Date();
  const allocatedFlights = allocations
    .map(allocation => ({
      allocation,
      flight: flights.find(flight => flight.id === allocation.flight_id),
    }))
    .filter(item => item.flight);

  const upcomingFlights = allocatedFlights
    .filter(item => new Date(item.flight.date) >= now && item.flight.status === 'Scheduled')
    .sort((a, b) => new Date(a.flight.date) - new Date(b.flight.date));

  const completedFlights = allocatedFlights.filter(item => item.flight.status === 'Completed');
  const totalAttendedFlights = Math.max(Number(crewMember?.flights_completed || 0), completedFlights.length);

  return {
    totalAttendedFlights,
    upcomingFlights,
    roles: Array.isArray(crewMember?.roles) ? crewMember.roles : [],
    notices,
  };
}
