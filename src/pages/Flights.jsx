import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plane, PlaneTakeoff, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FLIGHT_ROLE_SLOTS,
  allocateToFlight,
  createFlight,
  deleteFlight,
  getSessionCrewMember,
  isBoardAdmin,
  listFlightAllocations,
  listFlights,
  removeFlightAllocation,
  subscribeToStore,
} from '@/lib/dataStore';
import { hasAnyRole } from '@/lib/roleUtils';

const INITIAL_FORM = {
  flight_number: '',
  date: '',
  plane_model: '',
  plane_registration: '',
  departure: '',
  arrival: '',
};

const PLANE_MODEL_OPTIONS = [
  'Boeing B737-800 [B738]',
  'Boeing B737 MAX 8 [B38M]',
  'Airbus A320',
];

export default function Flights() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [flights, setFlights] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState({});

  const canScheduleFlights = hasAnyRole(crewMember, 'Flight Dispatcher');
  const canDeleteFlights = isBoardAdmin(crewMember);

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      setFlights(await listFlights({ sort: 'date', status: 'Scheduled' }));
      setAllocations(await listFlightAllocations());
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const allocationsByFlight = useMemo(() => (
    allocations.reduce((map, allocation) => {
      map[allocation.flight_id] = map[allocation.flight_id] || [];
      map[allocation.flight_id].push(allocation);
      return map;
    }, {})
  ), [allocations]);

  const handleSchedule = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!form.plane_model) {
        throw new Error('Please select a plane model.');
      }

      await createFlight(
        {
          ...form,
          aircraft: [form.plane_model, form.plane_registration].filter(Boolean).join(' - '),
        },
        crewMember
      );
      setForm(INITIAL_FORM);
      setShowForm(false);
    } catch (scheduleError) {
      setError(scheduleError.message || 'Unable to schedule that flight.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocate = async (flightId, position) => {
    setActionState(current => ({ ...current, [flightId]: position }));
    setError('');

    try {
      await allocateToFlight({ flightId, crewMember, position });
    } catch (allocationError) {
      setError(allocationError.message || 'Unable to allocate to that role.');
    } finally {
      setActionState(current => ({ ...current, [flightId]: null }));
    }
  };

  const handleRemoveAllocation = async (allocationId, flightId) => {
    setActionState(current => ({ ...current, [flightId]: 'remove' }));
    await removeFlightAllocation(allocationId);
    setActionState(current => ({ ...current, [flightId]: null }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Flights</h1>
          <p className="text-muted-foreground text-sm mt-1">Scheduled flights and rostering in one place.</p>
        </div>
        {canScheduleFlights && (
          <Button onClick={() => setShowForm(value => !value)} className="bg-primary w-full sm:w-auto">
            <PlaneTakeoff className="w-4 h-4 mr-2" />
            {showForm ? 'Hide Scheduling Form' : 'Schedule Flight'}
          </Button>
        )}
      </div>

      {showForm && canScheduleFlights && (
        <form onSubmit={handleSchedule} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-heading font-semibold">Schedule a Flight</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm">Flight Number</Label>
              <Input value={form.flight_number} onChange={(event) => setForm({ ...form, flight_number: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Date and Time</Label>
              <Input type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Plane Model</Label>
              <Select value={form.plane_model} onValueChange={(value) => setForm({ ...form, plane_model: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plane model" />
                </SelectTrigger>
                <SelectContent>
                  {PLANE_MODEL_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Plane Registration</Label>
              <Input value={form.plane_registration} onChange={(event) => setForm({ ...form, plane_registration: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Departure Airport</Label>
              <Input value={form.departure} onChange={(event) => setForm({ ...form, departure: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Arrival Airport</Label>
              <Input value={form.arrival} onChange={(event) => setForm({ ...form, arrival: event.target.value })} required />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-primary">
              {submitting ? 'Scheduling...' : 'Save Flight'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {flights.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Plane className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No scheduled flights available right now.</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {flights.map(flight => {
            const flightAllocations = allocationsByFlight[flight.id] || [];
            const myAllocation = flightAllocations.find(item => item.crew_member_id === crewMember?.id);

            return (
              <AccordionItem
                key={flight.id}
                value={flight.id}
                className="border border-border rounded-2xl overflow-hidden bg-[#141414] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-4 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/90 text-white flex items-center justify-center flex-shrink-0">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-heading font-bold tracking-wide">{flight.flight_number}</p>
                        <p className="text-sm text-zinc-300">
                          {flight.departure} - {flight.arrival}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {format(new Date(flight.date), 'EEE, MMM d')} at {format(new Date(flight.date), 'HH:mm')} | {flight.plane_model || 'Aircraft TBC'} | {flight.plane_registration || 'Registration TBC'} | {flightAllocations.length} allocated
                        </p>
                      </div>
                    </div>
                    {myAllocation && (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/15">
                        {myAllocation.position}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <div className="border-t border-white/10">
                    {FLIGHT_ROLE_SLOTS.map(slot => {
                      const assigned = flightAllocations.filter(item => item.position === slot.role);
                      const isFull = assigned.length >= slot.capacity;
                      const isMine = myAllocation?.position === slot.role;
                      const isBusy = actionState[flight.id] === slot.role;
                      const blockedByOtherRole = Boolean(myAllocation && !isMine);

                      return (
                        <div key={slot.role} className="px-4 py-4 border-b border-white/8 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-sm text-white">{slot.role}</p>
                                <span className="text-xs text-zinc-400">{assigned.length}/{slot.capacity}</span>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-3">
                                {assigned.length === 0 ? (
                                  <span className="text-xs text-zinc-500">No allocation yet</span>
                                ) : (
                                  assigned.map(person => (
                                    <span
                                      key={person.id}
                                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                                        person.crew_member_id === crewMember?.id
                                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                          : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                                      }`}
                                    >
                                      {person.crew_member_name}
                                    </span>
                                  ))
                                )}
                              </div>

                              <div className="mt-3">
                                {isMine ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-400/25 text-red-300 bg-transparent hover:bg-red-500/10 hover:text-red-200"
                                    disabled={actionState[flight.id] === 'remove'}
                                    onClick={() => handleRemoveAllocation(myAllocation.id, flight.id)}
                                  >
                                    Remove Allocation
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-orange-400/20 text-orange-300 bg-transparent hover:bg-orange-500/10 hover:text-orange-200"
                                    disabled={isFull || blockedByOtherRole || isBusy}
                                    onClick={() => handleAllocate(flight.id, slot.role)}
                                  >
                                    {blockedByOtherRole ? 'Already Allocated' : isFull ? 'Role Full' : isBusy ? 'Allocating...' : '+ Allocate'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {canDeleteFlights && (
                      <div className="px-4 py-4 border-t border-white/10 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                          onClick={async () => { await deleteFlight(flight.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Flight
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
