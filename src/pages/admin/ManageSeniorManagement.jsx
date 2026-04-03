import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  getSessionCrewMember,
  listSeniorManagementRequests,
  markSeniorManagementRequestsSeen,
  reviewSeniorManagementRequest,
  subscribeToStore,
} from '@/lib/dataStore';

const STATUS_STYLES = {
  Pending: 'bg-yellow-500/10 text-yellow-600',
  Accepted: 'bg-green-500/10 text-green-600',
  Declined: 'bg-red-500/10 text-red-600',
};

export default function ManageSeniorManagement() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      setRequests(await listSeniorManagementRequests());
    };

    sync();
    markSeniorManagementRequestsSeen();
    return subscribeToStore(sync);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">Senior Management Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">Accept or decline crew chat and meeting requests.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request.id} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {request.request_type === 'Chat' ? <MessageSquare className="w-4 h-4 text-primary" /> : <CalendarDays className="w-4 h-4 text-primary" />}
                    <p className="font-semibold text-sm">{request.crew_member_name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[request.status] || STATUS_STYLES.Pending}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {request.request_type} requested for {format(new Date(request.requested_at), 'MMM d, yyyy - HH:mm')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">{request.reason}</p>
                  {request.reviewed_by && (
                    <p className="text-xs text-muted-foreground mt-2">Reviewed by: {request.reviewed_by}</p>
                  )}
                </div>

                {request.status === 'Pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => { await reviewSeniorManagementRequest(request.id, 'Accepted', crewMember); }}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={async () => { await reviewSeniorManagementRequest(request.id, 'Declined', crewMember); }}>
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
