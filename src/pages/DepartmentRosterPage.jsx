import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getSessionCrewMember,
  listDepartmentRosterAssignments,
  listFlightAllocations,
  listFlights,
  saveDepartmentRosterAssignment,
  subscribeToStore,
} from '@/lib/dataStore';
import { hasRole } from '@/lib/roleUtils';

function isWithinAssignmentWindow(flightDate) {
  const departureTime = new Date(flightDate).getTime();
  const unlockTime = departureTime - (60 * 60 * 1000);
  const now = Date.now();
  return now >= unlockTime && now <= departureTime;
}

function buildAssignmentMap(assignments) {
  return assignments.reduce((map, assignment) => {
    map[`${assignment.flight_id}:${assignment.assignment_role}`] = assignment;
    return map;
  }, {});
}

export default function DepartmentRosterPage({
  title,
  description,
  department,
  visibilityRoles,
  leadPosition,
  autoLeadLabel,
  assignableFromPosition,
  assignmentRoles,
  lockedMessage,
}) {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [flights, setFlights] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      const [nextFlights, nextAllocations, nextAssignments] = await Promise.all([
        listFlights({ sort: 'date', status: 'Scheduled' }),
        listFlightAllocations(),
        listDepartmentRosterAssignments({ department }),
      ]);
      setFlights(nextFlights);
      setAllocations(nextAllocations);
      setAssignments(nextAssignments);
    };

    sync();
    return subscribeToStore(sync);
  }, [department]);

  const canView = visibilityRoles.some((role) => hasRole(crewMember, role));
  const assignmentsByKey = useMemo(() => buildAssignmentMap(assignments), [assignments]);

  const flightsWithLead = useMemo(() => (
    flights
      .map((flight) => {
        const flightAllocations = allocations.filter((allocation) => allocation.flight_id === flight.id);
        const leadAllocation = flightAllocations.find((allocation) => allocation.position === leadPosition);
        const eligibleAllocations = flightAllocations.filter((allocation) => allocation.position === assignableFromPosition);

        return {
          flight,
          leadAllocation,
          eligibleAllocations,
          withinWindow: isWithinAssignmentWindow(flight.date),
        };
      })
      .filter((entry) => entry.leadAllocation)
  ), [allocations, flights, assignableFromPosition, leadPosition]);

  const handleSave = async (flightId, assignmentRole) => {
    const assignedCrewMemberId = drafts[`${flightId}:${assignmentRole}`];
    if (!assignedCrewMemberId) return;

    setError('');
    setSavingKey(`${flightId}:${assignmentRole}`);

    try {
      await saveDepartmentRosterAssignment({
        flightId,
        department,
        assignmentRole,
        assignedCrewMemberId,
        assignedByMemberId: crewMember?.id,
      });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save that department roster assignment.');
    } finally {
      setSavingKey('');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">You do not have access to this department roster.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {lockedMessage}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {flightsWithLead.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No flights currently have a {leadPosition} assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flightsWithLead.map(({ flight, leadAllocation, eligibleAllocations, withinWindow }) => {
            const canManageThisFlight = crewMember?.id === leadAllocation?.crew_member_id && withinWindow;

            return (
              <div key={flight.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-heading text-lg font-bold">{flight.flight_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {flight.departure} to {flight.arrival} - {format(new Date(flight.date), 'EEE, MMM d, HH:mm')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {autoLeadLabel}: <span className="font-medium text-foreground">{leadAllocation.crew_member_name}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                      {eligibleAllocations.length} eligible {assignableFromPosition === 'Ramp Agent' ? 'ramp agents' : 'security officers'}
                    </Badge>
                    <Badge
                      className={withinWindow ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/10'}
                    >
                      {withinWindow ? 'Assignments Open' : 'Opens 1 hour before departure'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  {assignmentRoles.map((assignmentRole) => {
                    const key = `${flight.id}:${assignmentRole}`;
                    const savedAssignment = assignmentsByKey[key];
                    const selectedValue = drafts[key] || savedAssignment?.assigned_crew_member_id;

                    return (
                      <div key={assignmentRole} className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[1fr_280px_auto] md:items-center">
                        <div>
                          <p className="font-medium">{assignmentRole}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {savedAssignment?.assigned_crew_member_name ? `Assigned to ${savedAssignment.assigned_crew_member_name}` : 'No one assigned yet'}
                          </p>
                        </div>

                        <Select
                          value={selectedValue}
                          onValueChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))}
                          disabled={!canManageThisFlight || eligibleAllocations.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Assign ${assignableFromPosition}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleAllocations.map((allocation) => (
                              <SelectItem key={allocation.id} value={allocation.crew_member_id}>
                                {allocation.crew_member_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          className="w-full md:w-auto"
                          disabled={!canManageThisFlight || !selectedValue || savingKey === key}
                          onClick={() => handleSave(flight.id, assignmentRole)}
                        >
                          {savingKey === key ? 'Saving...' : 'Assign User'}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {!withinWindow && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    This roster unlocks at {format(new Date(new Date(flight.date).getTime() - (60 * 60 * 1000)), 'HH:mm')} for this flight.
                  </p>
                )}

                {withinWindow && crewMember?.id !== leadAllocation?.crew_member_id && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Only the assigned {leadPosition} can allocate these department roles for this flight.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
