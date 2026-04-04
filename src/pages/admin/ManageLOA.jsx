import { useEffect, useState } from 'react';
import { CalendarOff, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  getSessionCrewMember,
  listLoaRequests,
  markPendingLoaRequestsSeen,
  reviewLoaRequest,
  subscribeToStore,
} from '@/lib/dataStore';

export default function ManageLOA() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      setRequests(await listLoaRequests());
    };

    sync();
    markPendingLoaRequestsSeen();
    return subscribeToStore(sync);
  }, []);

  const statusConfig = {
    Pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    Approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10' },
    Denied: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">LOA Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">Approve or deny leave requests from crew members.</p>
      </div>

      {requests.filter((request) => request.status !== 'Approved').length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <CalendarOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No leave requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.filter((request) => request.status !== 'Approved').map(request => {
            const config = statusConfig[request.status] || statusConfig.Pending;
            const Icon = config.icon;

            return (
              <div key={request.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{request.crew_member_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(request.created_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`text-sm font-medium ${config.color}`}>{request.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground text-xs">From</p>
                    <p className="font-medium">{format(new Date(request.start_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">To</p>
                    <p className="font-medium">{format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{request.reason}</p>

                {request.status === 'Pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => { await reviewLoaRequest(request.id, 'Approved', crewMember); }}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={async () => { await reviewLoaRequest(request.id, 'Denied', crewMember); }}>
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Deny
                    </Button>
                  </div>
                )}

                {request.reviewed_by && <p className="text-xs text-muted-foreground mt-2">Reviewed by: {request.reviewed_by}</p>}
                {request.status === 'Denied' && (
                  <p className="mt-2 text-xs text-muted-foreground">Will automatically delete in 24 hours.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
