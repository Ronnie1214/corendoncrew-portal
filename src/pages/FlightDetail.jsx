import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Plane, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FLIGHT_ROLE_SLOTS,
  allocateToFlight,
  getFlightById,
  getSessionCrewMember,
  listFlightAllocations,
  removeFlightAllocation,
  subscribeToStore,
} from '@/lib/dataStore';

export default function FlightDetail() {
  const { id } = useParams();
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [flight, setFlight] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      setFlight(await getFlightById(id));
      setAllocations(await listFlightAllocations({ flightId: id }));
    };

    sync();
    return subscribeToStore(sync);
  }, [id]);

  if (!flight) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Flight not found.</p>
        <Link to="/flights" className="text-primary text-sm mt-2 inline-block">Back to Flights</Link>
      </div>
    );
  }

  const myAllocation = allocations.find(allocation => allocation.crew_member_id === crewMember?.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/flights" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Flights
      </Link>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary">{flight.flight_number}</h1>
            <p className="text-sm text-muted-foreground">{flight.departure} to {flight.arrival}</p>
          </div>
          <Badge variant="outline">{flight.status}</Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {format(new Date(flight.date), 'MMM d, yyyy | HH:mm')}
          </div>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4" />
            {flight.plane_model || flight.aircraft || 'Aircraft TBD'}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {allocations.length} crew allocated
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {FLIGHT_ROLE_SLOTS.map(slot => {
          const assigned = allocations.filter(allocation => allocation.position === slot.role);
          const isMine = myAllocation?.position === slot.role;
          const isFull = assigned.length >= slot.capacity;

          return (
            <div key={slot.role} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{slot.role}</p>
                  <p className="text-xs text-muted-foreground">{assigned.length}/{slot.capacity} filled</p>
                </div>
                {isMine && <Badge variant="outline">Your slot</Badge>}
              </div>

              <div className="space-y-2 mt-4 min-h-12">
                {assigned.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nobody allocated yet.</p>
                ) : (
                  assigned.map(allocation => (
                    <div key={allocation.id} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                      {allocation.crew_member_name}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                {isMine ? (
                  <Button
                    variant="outline"
                    className="w-full text-red-500 border-red-200 hover:bg-red-50"
                    onClick={async () => { await removeFlightAllocation(myAllocation.id); }}
                  >
                    Remove Allocation
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-primary"
                    disabled={isFull || Boolean(myAllocation)}
                    onClick={async () => {
                      try {
                        await allocateToFlight({ flightId: flight.id, crewMember, position: slot.role });
                        setError('');
                      } catch (allocationError) {
                        setError(allocationError.message || 'Unable to allocate.');
                      }
                    }}
                  >
                    {myAllocation ? 'Already Allocated' : isFull ? 'Role Full' : 'Allocate'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
