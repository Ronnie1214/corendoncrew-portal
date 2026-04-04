import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { getSessionCrewMember, listLoaRequests, subscribeToStore } from '@/lib/dataStore';

export default function ActiveLoas() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const sync = async () => {
      getSessionCrewMember();
      setRequests(await listLoaRequests({ activeApprovedOnly: true }));
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Active LOAs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Current approved leave for crew members.</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <CalendarClock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
          <p className="text-muted-foreground">No active LOAs right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{request.crew_member_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{request.reason}</p>
                </div>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                  Active LOA
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium">{format(new Date(request.start_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium">{format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
