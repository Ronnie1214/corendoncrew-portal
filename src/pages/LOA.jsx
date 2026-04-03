import { useEffect, useState } from 'react';
import { CalendarOff, CheckCircle, Clock, Plus, X, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createLoaRequest,
  dismissLoaNotification,
  getActiveLoaNotification,
  getSessionCrewMember,
  listLoaRequests,
  subscribeToStore,
} from '@/lib/dataStore';

export default function LOA() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [requests, setRequests] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    const sync = async () => {
      const session = getSessionCrewMember();
      setCrewMember(session);
      setRequests(await listLoaRequests({ crewMemberId: session?.id }));
      setNotification(await getActiveLoaNotification(session?.id));
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (form.end_date < form.start_date) {
        throw new Error('End date must be on or after the start date.');
      }

      await createLoaRequest(form, crewMember);
      setForm({ start_date: '', end_date: '', reason: '' });
      setShowForm(false);
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit your LOA request.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    Pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    Approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-500/10' },
    Denied: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Leave of Absence</h1>
          <p className="text-muted-foreground text-sm mt-1">Book LOA and track any decisions from Senior Board or Executive Board.</p>
        </div>
        <Button onClick={() => setShowForm(value => !value)} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> Book LOA
        </Button>
      </div>

      {notification && (
        <div className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${
          notification.status === 'Approved'
            ? 'border-green-500/20 bg-green-500/10'
            : 'border-red-500/20 bg-red-500/10'
        }`}>
          <div>
            <p className="font-semibold text-sm">Your LOA request was {notification.status.toLowerCase()}.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Reviewed by {notification.reviewed_by || 'the board'}.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await dismissLoaNotification(notification.id, crewMember.id); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-heading font-semibold">New LOA Request</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">End Date</Label>
              <Input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required />
            </div>
          </div>
          <div>
            <Label className="text-sm">Reason</Label>
            <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Explain your reason for leave..." required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-primary">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <CalendarOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No leave requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => {
            const config = statusConfig[request.status] || statusConfig.Pending;
            const Icon = config.icon;

            return (
              <div key={request.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <span className={`text-sm font-semibold ${config.color}`}>{request.status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(request.created_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <p className="text-muted-foreground text-xs">From</p>
                    <p className="font-medium">{format(new Date(request.start_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">To</p>
                    <p className="font-medium">{format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
                {request.reviewed_by && (
                  <p className="text-xs text-muted-foreground mt-2">Reviewed by: {request.reviewed_by}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
