import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

const SESSION_KEY = 'crew_session';
const LEGACY_DB_KEY = 'crew_portal_db_v1';
const DATA_CHANGED_EVENT = 'crew-portal:data-changed';
const SESSION_CHANGED_EVENT = 'crew-portal:session-changed';
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

function emit(name) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name));
  }
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

function mapFlight(flight) {
  if (!flight) return null;
  return {
    id: flight.id,
    flight_number: flight.flight_number,
    departure: flight.departure,
    arrival: flight.arrival,
    date: flight.departure_at || flight.date,
    aircraft: flight.aircraft || '',
    plane_model: flight.plane_model || '',
    plane_registration: flight.plane_registration || '',
    status: flight.status || 'Scheduled',
    max_crew: Number(flight.max_crew || 0),
    created_by_name: flight.created_by?.display_name || flight.created_by_name || '',
    created_date: flight.created_at || flight.created_date || null,
    updated_date: flight.updated_at || flight.updated_date || null,
  };
}

function mapAllocation(allocation) {
  if (!allocation) return null;
  const roles = Array.isArray(allocation.crew_member?.roles)
    ? allocation.crew_member.roles.join(', ')
    : allocation.crew_member_roles || '';

  return {
    id: allocation.id,
    flight_id: allocation.flight_id,
    crew_member_id: allocation.crew_member_id,
    crew_member_name: allocation.crew_member?.display_name || allocation.crew_member_name || '',
    crew_member_roles: roles,
    position: allocation.position,
    created_date: allocation.created_at || allocation.created_date || null,
  };
}

function mapNotice(notice) {
  if (!notice) return null;
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    priority: notice.priority || 'Medium',
    pinned: Boolean(notice.pinned),
    author_name: notice.author?.display_name || notice.author_name || '',
    author_roles: Array.isArray(notice.author?.roles) ? notice.author.roles : notice.author_roles || [],
    author_rank: notice.author?.rank || notice.author_rank || '',
    created_date: notice.created_at || notice.created_date || null,
    updated_date: notice.updated_at || notice.updated_date || null,
  };
}

function mapLoaRequest(request) {
  if (!request) return null;
  return {
    id: request.id,
    crew_member_id: request.crew_member_id,
    crew_member_name: request.crew_member?.display_name || request.crew_member_name || '',
    start_date: request.start_date,
    end_date: request.end_date,
    reason: request.reason,
    status: request.status || 'Pending',
    reviewed_by: request.reviewer?.display_name || request.reviewed_by || '',
    reviewed_at: request.reviewed_at || '',
    notification_dismissed: Boolean(request.notification_dismissed),
    admin_seen: Boolean(request.admin_seen),
    created_date: request.created_at || request.created_date || null,
    updated_date: request.updated_at || request.updated_date || null,
  };
}

function mapSeniorManagementRequest(request) {
  if (!request) return null;
  return {
    id: request.id,
    crew_member_id: request.crew_member_id,
    crew_member_name: request.crew_member?.display_name || request.crew_member_name || '',
    request_type: request.request_type,
    requested_at: request.requested_at,
    reason: request.reason,
    status: request.status || 'Pending',
    reviewed_by: request.reviewer?.display_name || request.reviewed_by || '',
    reviewed_at: request.reviewed_at || '',
    admin_seen: Boolean(request.admin_seen),
    created_date: request.created_at || request.created_date || null,
    updated_date: request.updated_at || request.updated_date || null,
  };
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

async function supabaseRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
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
  if (hasSupabaseEnv) {
    let query = supabase
      .from('flights')
      .select('id, flight_number, departure, arrival, departure_at, aircraft, plane_model, plane_registration, status, max_crew, created_at, updated_at, created_by:crew_members!flights_created_by_member_id_fkey(display_name)');

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.sort === '-date') {
      query = query.order('departure_at', { ascending: false });
    } else {
      query = query.order('departure_at', { ascending: true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapFlight);
  }

  const { flights } = await apiRequest('listFlights', { options });
  return flights || [];
}

export async function getFlightById(id) {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('flights')
      .select('id, flight_number, departure, arrival, departure_at, aircraft, plane_model, plane_registration, status, max_crew, created_at, updated_at, created_by:crew_members!flights_created_by_member_id_fkey(display_name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return mapFlight(data);
  }

  const { flight } = await apiRequest('getFlightById', { id });
  return flight || null;
}

export async function createFlight(data, crewMember) {
  if (hasSupabaseEnv) {
    const { data: created, error } = await supabase
      .from('flights')
      .insert({
        flight_number: data.flight_number?.trim() || `FLT-${Date.now()}`,
        departure: data.departure?.trim() || '',
        arrival: data.arrival?.trim() || '',
        departure_at: new Date(data.date).toISOString(),
        aircraft: data.aircraft?.trim() || '',
        plane_model: data.plane_model?.trim() || '',
        plane_registration: data.plane_registration?.trim() || '',
        status: data.status || 'Scheduled',
        max_crew: FLIGHT_ROLE_SLOTS.reduce((sum, item) => sum + item.capacity, 0),
        created_by_member_id: crewMember?.id || null,
      })
      .select('id, flight_number, departure, arrival, departure_at, aircraft, plane_model, plane_registration, status, max_crew, created_at, updated_at, created_by:crew_members!flights_created_by_member_id_fkey(display_name)')
      .single();

    if (error) throw error;
    const flight = mapFlight(created);
    emit(DATA_CHANGED_EVENT);
    return flight;
  }

  const { flight } = await apiRequest('createFlight', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return flight;
}

export async function deleteFlight(id) {
  if (hasSupabaseEnv) {
    const { error } = await supabase.from('flights').delete().eq('id', id);
    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('deleteFlight', { id });
  emit(DATA_CHANGED_EVENT);
}

export async function listFlightAllocations(options = {}) {
  if (hasSupabaseEnv) {
    let query = supabase
      .from('flight_allocations')
      .select('id, flight_id, crew_member_id, position, created_at, crew_member:crew_members!flight_allocations_crew_member_id_fkey(display_name, roles)')
      .order('position', { ascending: true });

    if (options.flightId) {
      query = query.eq('flight_id', options.flightId);
    }

    if (options.crewMemberId) {
      query = query.eq('crew_member_id', options.crewMemberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAllocation);
  }

  const { allocations } = await apiRequest('listFlightAllocations', { options });
  return allocations || [];
}

export async function allocateToFlight({ flightId, crewMember, position }) {
  if (hasSupabaseEnv) {
    const flight = await getFlightById(flightId);
    if (!flight) throw new Error('Flight not found.');
    if (flight.status !== 'Scheduled') throw new Error('You can only allocate to scheduled flights.');

    const slot = FLIGHT_ROLE_SLOTS.find(item => item.role === position);
    if (!slot) throw new Error('That position is not available on this flight.');

    const allocations = await listFlightAllocations({ flightId });
    if (allocations.some(item => item.crew_member_id === crewMember.id)) {
      throw new Error('You are already allocated to this flight.');
    }

    const filled = allocations.filter(item => item.position === position).length;
    if (filled >= slot.capacity) {
      throw new Error('That role is already full on this flight.');
    }

    const { data, error } = await supabase
      .from('flight_allocations')
      .insert({
        flight_id: flightId,
        crew_member_id: crewMember.id,
        position,
      })
      .select('id, flight_id, crew_member_id, position, created_at, crew_member:crew_members!flight_allocations_crew_member_id_fkey(display_name, roles)')
      .single();

    if (error) throw error;
    const allocation = mapAllocation(data);
    emit(DATA_CHANGED_EVENT);
    return allocation;
  }

  const { allocation } = await apiRequest('allocateToFlight', { flightId, crewMember, position });
  emit(DATA_CHANGED_EVENT);
  return allocation;
}

export async function removeFlightAllocation(id) {
  if (hasSupabaseEnv) {
    const { error } = await supabase.from('flight_allocations').delete().eq('id', id);
    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('removeFlightAllocation', { id });
  emit(DATA_CHANGED_EVENT);
}

export async function listNotices(options = {}) {
  if (hasSupabaseEnv) {
    let query = supabase
      .from('notices')
      .select('id, title, content, priority, pinned, created_at, updated_at, author:crew_members!notices_author_member_id_fkey(display_name, roles, rank)')
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    let notices = (data || []).map(mapNotice);
    if (options.boardOnly) {
      notices = notices.filter(notice => {
        const roles = Array.isArray(notice.author_roles) ? notice.author_roles : [];
        return roles.includes('Executive Board') || roles.includes('Senior Board');
      });
    }

    notices.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    return notices;
  }

  const { notices } = await apiRequest('listNotices', { options });
  return notices || [];
}

export async function createNotice(data, author) {
  if (hasSupabaseEnv) {
    const { data: created, error } = await supabase
      .from('notices')
      .insert({
        title: data.title.trim(),
        content: data.content.trim(),
        priority: data.priority || 'Medium',
        pinned: Boolean(data.pinned),
        author_member_id: author?.id || null,
      })
      .select('id, title, content, priority, pinned, created_at, updated_at, author:crew_members!notices_author_member_id_fkey(display_name, roles, rank)')
      .single();

    if (error) throw error;
    const notice = mapNotice(created);
    emit(DATA_CHANGED_EVENT);
    return notice;
  }

  const { notice } = await apiRequest('createNotice', { data, author });
  emit(DATA_CHANGED_EVENT);
  return notice;
}

export async function updateNotice(id, updates) {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('notices')
      .update({
        title: updates.title?.trim(),
        content: updates.content?.trim(),
        priority: updates.priority,
        pinned: Boolean(updates.pinned),
      })
      .eq('id', id)
      .select('id, title, content, priority, pinned, created_at, updated_at, author:crew_members!notices_author_member_id_fkey(display_name, roles, rank)')
      .single();

    if (error) throw error;
    const notice = mapNotice(data);
    emit(DATA_CHANGED_EVENT);
    return notice;
  }

  const { notice } = await apiRequest('updateNotice', { id, updates });
  emit(DATA_CHANGED_EVENT);
  return notice;
}

export async function deleteNotice(id) {
  if (hasSupabaseEnv) {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('deleteNotice', { id });
  emit(DATA_CHANGED_EVENT);
}

async function purgeExpiredReviewedLoaRequests() {
  if (!hasSupabaseEnv) return;

  const cutoffIso = new Date(Date.now() - LOA_REVIEW_RETENTION_MS).toISOString();
  await supabase
    .from('loa_requests')
    .delete()
    .neq('status', 'Pending')
    .lt('reviewed_at', cutoffIso);
}

export async function listLoaRequests(options = {}) {
  if (hasSupabaseEnv) {
    await purgeExpiredReviewedLoaRequests();

    let query = supabase
      .from('loa_requests')
      .select('id, crew_member_id, start_date, end_date, reason, status, reviewed_at, notification_dismissed, admin_seen, created_at, updated_at, crew_member:crew_members!loa_requests_crew_member_id_fkey(display_name), reviewer:crew_members!loa_requests_reviewed_by_member_id_fkey(display_name)')
      .order('created_at', { ascending: false });

    if (options.crewMemberId) {
      query = query.eq('crew_member_id', options.crewMemberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapLoaRequest);
  }

  const { requests } = await apiRequest('listLoaRequests', { options });
  return requests || [];
}

export async function createLoaRequest(data, crewMember) {
  if (hasSupabaseEnv) {
    const { data: created, error } = await supabase
      .from('loa_requests')
      .insert({
        crew_member_id: crewMember.id,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason.trim(),
        status: 'Pending',
        notification_dismissed: true,
        admin_seen: false,
      })
      .select('id, crew_member_id, start_date, end_date, reason, status, reviewed_at, notification_dismissed, admin_seen, created_at, updated_at, crew_member:crew_members!loa_requests_crew_member_id_fkey(display_name), reviewer:crew_members!loa_requests_reviewed_by_member_id_fkey(display_name)')
      .single();

    if (error) throw error;
    const request = mapLoaRequest(created);
    emit(DATA_CHANGED_EVENT);
    return request;
  }

  const { request } = await apiRequest('createLoaRequest', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function reviewLoaRequest(id, status, reviewer) {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('loa_requests')
      .update({
        status,
        reviewed_by_member_id: reviewer?.id || null,
        reviewed_at: new Date().toISOString(),
        notification_dismissed: false,
        admin_seen: true,
      })
      .eq('id', id)
      .select('id, crew_member_id, start_date, end_date, reason, status, reviewed_at, notification_dismissed, admin_seen, created_at, updated_at, crew_member:crew_members!loa_requests_crew_member_id_fkey(display_name), reviewer:crew_members!loa_requests_reviewed_by_member_id_fkey(display_name)')
      .single();

    if (error) throw error;

    await supabase
      .from('crew_members')
      .update({ status: status === 'Approved' ? 'Authorise Leave' : 'Active' })
      .eq('id', data.crew_member_id);

    await refreshSession();
    const request = mapLoaRequest(data);
    emit(DATA_CHANGED_EVENT);
    return request;
  }

  const { request } = await apiRequest('reviewLoaRequest', { id, status, reviewer });
  await refreshSession();
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function dismissLoaNotification(requestId, crewMemberId) {
  if (hasSupabaseEnv) {
    const { error } = await supabase
      .from('loa_requests')
      .update({ notification_dismissed: true })
      .eq('id', requestId)
      .eq('crew_member_id', crewMemberId);

    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('dismissLoaNotification', { requestId, crewMemberId });
  emit(DATA_CHANGED_EVENT);
}

export async function getActiveLoaNotification(crewMemberId) {
  const requests = await listLoaRequests({ crewMemberId });
  return requests.find(request => request.status !== 'Pending' && request.notification_dismissed === false) || null;
}

export async function markPendingLoaRequestsSeen() {
  if (hasSupabaseEnv) {
    const { error } = await supabase
      .from('loa_requests')
      .update({ admin_seen: true })
      .eq('status', 'Pending')
      .eq('admin_seen', false);

    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('markPendingLoaRequestsSeen');
  emit(DATA_CHANGED_EVENT);
}

export async function hasUnseenPendingLoaRequests() {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('loa_requests')
      .select('id')
      .eq('status', 'Pending')
      .eq('admin_seen', false);

    if (error) throw error;
    return Boolean(data?.length);
  }

  const { hasUnseen } = await apiRequest('hasUnseenPendingLoaRequests');
  return Boolean(hasUnseen);
}

export async function listSeniorManagementRequests(options = {}) {
  if (hasSupabaseEnv) {
    let query = supabase
      .from('senior_management_requests')
      .select('id, crew_member_id, request_type, requested_at, reason, status, reviewed_at, admin_seen, created_at, updated_at, crew_member:crew_members!senior_management_requests_crew_member_id_fkey(display_name), reviewer:crew_members!senior_management_requests_reviewed_by_member_id_fkey(display_name)')
      .order('created_at', { ascending: false });

    if (options.crewMemberId) {
      query = query.eq('crew_member_id', options.crewMemberId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapSeniorManagementRequest);
  }

  const { requests } = await apiRequest('listSeniorManagementRequests', { options });
  return requests || [];
}

export async function createSeniorManagementRequest(data, crewMember) {
  if (hasSupabaseEnv) {
    const { data: created, error } = await supabase
      .from('senior_management_requests')
      .insert({
        crew_member_id: crewMember.id,
        request_type: data.request_type,
        requested_at: new Date(data.requested_at).toISOString(),
        reason: data.reason.trim(),
        status: 'Pending',
        admin_seen: false,
      })
      .select('id, crew_member_id, request_type, requested_at, reason, status, reviewed_at, admin_seen, created_at, updated_at, crew_member:crew_members!senior_management_requests_crew_member_id_fkey(display_name), reviewer:crew_members!senior_management_requests_reviewed_by_member_id_fkey(display_name)')
      .single();

    if (error) throw error;
    const request = mapSeniorManagementRequest(created);
    emit(DATA_CHANGED_EVENT);
    return request;
  }

  const { request } = await apiRequest('createSeniorManagementRequest', { data, crewMember });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function reviewSeniorManagementRequest(id, status, reviewer) {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('senior_management_requests')
      .update({
        status,
        reviewed_by_member_id: reviewer?.id || null,
        reviewed_at: new Date().toISOString(),
        admin_seen: true,
      })
      .eq('id', id)
      .select('id, crew_member_id, request_type, requested_at, reason, status, reviewed_at, admin_seen, created_at, updated_at, crew_member:crew_members!senior_management_requests_crew_member_id_fkey(display_name), reviewer:crew_members!senior_management_requests_reviewed_by_member_id_fkey(display_name)')
      .single();

    if (error) throw error;
    const request = mapSeniorManagementRequest(data);
    emit(DATA_CHANGED_EVENT);
    return request;
  }

  const { request } = await apiRequest('reviewSeniorManagementRequest', { id, status, reviewer });
  emit(DATA_CHANGED_EVENT);
  return request;
}

export async function markSeniorManagementRequestsSeen() {
  if (hasSupabaseEnv) {
    const { error } = await supabase
      .from('senior_management_requests')
      .update({ admin_seen: true })
      .eq('status', 'Pending')
      .eq('admin_seen', false);

    if (error) throw error;
    emit(DATA_CHANGED_EVENT);
    return;
  }

  await apiRequest('markSeniorManagementRequestsSeen');
  emit(DATA_CHANGED_EVENT);
}

export async function hasUnseenSeniorManagementRequests() {
  if (hasSupabaseEnv) {
    const { data, error } = await supabase
      .from('senior_management_requests')
      .select('id')
      .eq('status', 'Pending')
      .eq('admin_seen', false);

    if (error) throw error;
    return Boolean(data?.length);
  }

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
