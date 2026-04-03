import {
  createAllocationRecord,
  createCrewMemberRecord,
  createFlightRecord,
  createLoaRequestRecord,
  createNoticeRecord,
  createSeniorManagementRequestRecord,
  FLIGHT_ROLE_SLOTS,
  getCrewMemberById,
  listCrewMembers,
  listFlightAllocations,
  listFlights,
  listLoaRequests,
  listNotices,
  listSeniorManagementRequests,
  readDb,
  writeDb,
} from './_shared/db.mjs';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(message) {
  return json({ error: message }, 400);
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const payload = await request.json();
    const { action } = payload;

    switch (action) {
      case 'getCrewMemberById': {
        const db = await readDb();
        return json({ member: getCrewMemberById(db, payload.id) });
      }

      case 'listCrewMembers': {
        const db = await readDb();
        return json({ members: listCrewMembers(db) });
      }

      case 'createCrewMember': {
        const normalizedUsername = payload.data.username.trim().toLowerCase();
        let created = null;
        await writeDb(db => {
          if (db.crewMembers.some(member => member.username?.toLowerCase() === normalizedUsername)) {
            throw new Error('That username is already in use.');
          }
          created = createCrewMemberRecord(payload.data);
          db.crewMembers.push(created);
          return db;
        });
        return json({ member: created });
      }

      case 'importLegacyData': {
        const legacy = payload.legacyData;
        if (!legacy || typeof legacy !== 'object') {
          throw new Error('No legacy data provided.');
        }

        let summary = null;
        await writeDb(db => {
          const existingUsernames = new Set(db.crewMembers.map(member => member.username?.toLowerCase()));
          const existingIds = new Set([
            ...db.crewMembers.map(item => item.id),
            ...db.flights.map(item => item.id),
            ...db.flightAllocations.map(item => item.id),
            ...db.loaRequests.map(item => item.id),
            ...db.notices.map(item => item.id),
            ...db.seniorManagementRequests.map(item => item.id),
          ]);

          const importedMembers = (Array.isArray(legacy.crewMembers) ? legacy.crewMembers : []).filter(member => {
            const username = member.username?.toLowerCase();
            return username && !existingUsernames.has(username);
          });

          importedMembers.forEach(member => {
            existingUsernames.add(member.username.toLowerCase());
            existingIds.add(member.id);
          });

          const importUnique = (items = []) => items.filter(item => item?.id && !existingIds.has(item.id));

          const importedFlights = importUnique(legacy.flights);
          importedFlights.forEach(item => existingIds.add(item.id));

          const importedAllocations = importUnique(legacy.flightAllocations);
          importedAllocations.forEach(item => existingIds.add(item.id));

          const importedLoa = importUnique(legacy.loaRequests);
          importedLoa.forEach(item => existingIds.add(item.id));

          const importedNotices = importUnique(legacy.notices);
          importedNotices.forEach(item => existingIds.add(item.id));

          const importedSeniorRequests = importUnique(legacy.seniorManagementRequests);

          db.crewMembers.push(...importedMembers);
          db.flights.push(...importedFlights);
          db.flightAllocations.push(...importedAllocations);
          db.loaRequests.push(...importedLoa);
          db.notices.push(...importedNotices);
          db.seniorManagementRequests.push(...importedSeniorRequests);

          summary = {
            crewMembers: importedMembers.length,
            flights: importedFlights.length,
            flightAllocations: importedAllocations.length,
            loaRequests: importedLoa.length,
            notices: importedNotices.length,
            seniorManagementRequests: importedSeniorRequests.length,
          };

          return db;
        });

        return json({ summary });
      }

      case 'updateCrewMember': {
        let updated = null;
        await writeDb(db => {
          const normalizedUsername = payload.updates.username?.trim().toLowerCase();
          if (normalizedUsername && db.crewMembers.some(member => member.id !== payload.id && member.username?.toLowerCase() === normalizedUsername)) {
            throw new Error('That username is already in use.');
          }

          db.crewMembers = db.crewMembers.map(member => {
            if (member.id !== payload.id) return member;
            updated = {
              ...member,
              ...payload.updates,
              username: payload.updates.username?.trim() ?? member.username,
              display_name: payload.updates.display_name?.trim() ?? member.display_name,
              password: payload.updates.password || member.password,
              updated_date: new Date().toISOString(),
            };
            return updated;
          });
          return db;
        });
        return json({ member: updated });
      }

      case 'deleteCrewMember': {
        await writeDb(db => {
          db.crewMembers = db.crewMembers.filter(member => member.id !== payload.id);
          db.flightAllocations = db.flightAllocations.filter(item => item.crew_member_id !== payload.id);
          db.loaRequests = db.loaRequests.filter(item => item.crew_member_id !== payload.id);
          db.seniorManagementRequests = db.seniorManagementRequests.filter(item => item.crew_member_id !== payload.id);
          return db;
        });
        return json({ ok: true });
      }

      case 'listFlights': {
        const db = await readDb();
        return json({ flights: listFlights(db, payload.options || {}) });
      }

      case 'getFlightById': {
        const db = await readDb();
        const flight = db.flights.find(item => item.id === payload.id) || null;
        return json({ flight });
      }

      case 'createFlight': {
        let created = null;
        await writeDb(db => {
          created = createFlightRecord(payload.data, payload.crewMember);
          db.flights.push(created);
          return db;
        });
        return json({ flight: created });
      }

      case 'deleteFlight': {
        await writeDb(db => {
          db.flights = db.flights.filter(flight => flight.id !== payload.id);
          db.flightAllocations = db.flightAllocations.filter(item => item.flight_id !== payload.id);
          return db;
        });
        return json({ ok: true });
      }

      case 'listFlightAllocations': {
        const db = await readDb();
        return json({ allocations: listFlightAllocations(db, payload.options || {}) });
      }

      case 'allocateToFlight': {
        let allocation = null;
        await writeDb(db => {
          const flight = db.flights.find(item => item.id === payload.flightId);
          if (!flight) throw new Error('Flight not found.');
          if (flight.status !== 'Scheduled') throw new Error('You can only allocate to scheduled flights.');

          const slot = FLIGHT_ROLE_SLOTS.find(item => item.role === payload.position);
          if (!slot) throw new Error('That position is not available on this flight.');

          const existing = db.flightAllocations.filter(item => item.flight_id === payload.flightId);
          if (existing.some(item => item.crew_member_id === payload.crewMember.id)) {
            throw new Error('You are already allocated to this flight.');
          }

          const filled = existing.filter(item => item.position === payload.position).length;
          if (filled >= slot.capacity) {
            throw new Error('That role is already full on this flight.');
          }

          allocation = createAllocationRecord({
            flightId: payload.flightId,
            crewMember: payload.crewMember,
            position: payload.position,
          });
          db.flightAllocations.push(allocation);
          return db;
        });
        return json({ allocation });
      }

      case 'removeFlightAllocation': {
        await writeDb(db => {
          db.flightAllocations = db.flightAllocations.filter(item => item.id !== payload.id);
          return db;
        });
        return json({ ok: true });
      }

      case 'listNotices': {
        const db = await readDb();
        return json({ notices: listNotices(db, payload.options || {}) });
      }

      case 'createNotice': {
        let notice = null;
        await writeDb(db => {
          notice = createNoticeRecord(payload.data, payload.author);
          db.notices.push(notice);
          return db;
        });
        return json({ notice });
      }

      case 'updateNotice': {
        let notice = null;
        await writeDb(db => {
          db.notices = db.notices.map(item => {
            if (item.id !== payload.id) return item;
            notice = { ...item, ...payload.updates, updated_date: new Date().toISOString() };
            return notice;
          });
          return db;
        });
        return json({ notice });
      }

      case 'deleteNotice': {
        await writeDb(db => {
          db.notices = db.notices.filter(item => item.id !== payload.id);
          return db;
        });
        return json({ ok: true });
      }

      case 'listLoaRequests': {
        const db = await readDb();
        return json({ requests: listLoaRequests(db, payload.options || {}) });
      }

      case 'createLoaRequest': {
        let requestRecord = null;
        await writeDb(db => {
          requestRecord = createLoaRequestRecord(payload.data, payload.crewMember);
          db.loaRequests.push(requestRecord);
          return db;
        });
        return json({ request: requestRecord });
      }

      case 'reviewLoaRequest': {
        let updated = null;
        await writeDb(db => {
          db.loaRequests = db.loaRequests.map(item => {
            if (item.id !== payload.id) return item;
            updated = {
              ...item,
              status: payload.status,
              reviewed_by: payload.reviewer?.display_name || '',
              reviewed_at: new Date().toISOString(),
              notification_dismissed: false,
              admin_seen: true,
              updated_date: new Date().toISOString(),
            };
            return updated;
          });

          db.crewMembers = db.crewMembers.map(member => {
            if (member.id !== updated?.crew_member_id) return member;
            return {
              ...member,
              status: payload.status === 'Approved' ? 'Authorise Leave' : member.status === 'Authorise Leave' ? 'Active' : member.status,
              updated_date: new Date().toISOString(),
            };
          });
          return db;
        });
        return json({ request: updated });
      }

      case 'dismissLoaNotification': {
        await writeDb(db => {
          db.loaRequests = db.loaRequests.map(item => {
            if (item.id !== payload.requestId || item.crew_member_id !== payload.crewMemberId) return item;
            return { ...item, notification_dismissed: true, updated_date: new Date().toISOString() };
          });
          return db;
        });
        return json({ ok: true });
      }

      case 'markPendingLoaRequestsSeen': {
        await writeDb(db => {
          db.loaRequests = db.loaRequests.map(item => (
            item.status === 'Pending' ? { ...item, admin_seen: true, updated_date: new Date().toISOString() } : item
          ));
          return db;
        });
        return json({ ok: true });
      }

      case 'hasUnseenPendingLoaRequests': {
        const db = await readDb();
        return json({ hasUnseen: db.loaRequests.some(item => item.status === 'Pending' && item.admin_seen !== true) });
      }

      case 'listSeniorManagementRequests': {
        const db = await readDb();
        return json({ requests: listSeniorManagementRequests(db, payload.options || {}) });
      }

      case 'createSeniorManagementRequest': {
        let requestRecord = null;
        await writeDb(db => {
          requestRecord = createSeniorManagementRequestRecord(payload.data, payload.crewMember);
          db.seniorManagementRequests.push(requestRecord);
          return db;
        });
        return json({ request: requestRecord });
      }

      case 'reviewSeniorManagementRequest': {
        let updated = null;
        await writeDb(db => {
          db.seniorManagementRequests = db.seniorManagementRequests.map(item => {
            if (item.id !== payload.id) return item;
            updated = {
              ...item,
              status: payload.status,
              reviewed_by: payload.reviewer?.display_name || '',
              reviewed_at: new Date().toISOString(),
              admin_seen: true,
              updated_date: new Date().toISOString(),
            };
            return updated;
          });
          return db;
        });
        return json({ request: updated });
      }

      case 'markSeniorManagementRequestsSeen': {
        await writeDb(db => {
          db.seniorManagementRequests = db.seniorManagementRequests.map(item => (
            item.status === 'Pending' ? { ...item, admin_seen: true, updated_date: new Date().toISOString() } : item
          ));
          return db;
        });
        return json({ ok: true });
      }

      case 'hasUnseenSeniorManagementRequests': {
        const db = await readDb();
        return json({ hasUnseen: db.seniorManagementRequests.some(item => item.status === 'Pending' && item.admin_seen !== true) });
      }

      default:
        return badRequest('Unknown action.');
    }
  } catch (error) {
    return json({ error: error.message || 'Request failed.' }, 500);
  }
};
