import { useEffect, useState } from 'react';
import { CalendarDays, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createSeniorManagementRequest,
  getSessionCrewMember,
  listSeniorManagementRequests,
  subscribeToStore,
} from '@/lib/dataStore';

const INITIAL_FORM = {
  request_type: 'Chat',
  requested_at: '',
  reason: '',
};

const STATUS_STYLES = {
  Pending: 'bg-yellow-500/10 text-yellow-600',
  Accepted: 'bg-green-500/10 text-green-600',
  Declined: 'bg-red-500/10 text-red-600',
};

export default function SeniorManagement() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = async () => {
      const session = getSessionCrewMember();
      setCrewMember(session);
      setRequests(await listSeniorManagementRequests({ crewMemberId: session?.id }));
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await createSeniorManagementRequest(form, crewMember);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(submitError.message || 'Unable to send that request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">Contact SM</h1>
        <p className="text-muted-foreground text-sm mt-1">Request a chat or meeting with senior management.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-4 space-y-4 sm:p-6">
          <h2 className="font-heading font-semibold">New Request</h2>
          <div>
            <Label className="text-sm">Request Type</Label>
            <Select value={form.request_type} onValueChange={(value) => setForm({ ...form, request_type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Chat">Chat</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Preferred Date and Time</Label>
            <Input type="datetime-local" value={form.requested_at} onChange={(event) => setForm({ ...form, requested_at: event.target.value })} required />
          </div>
          <div>
            <Label className="text-sm">Reason</Label>
            <Textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={5} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting} className="bg-primary w-full sm:w-auto">
            {submitting ? 'Sending...' : 'Send Request'}
          </Button>
        </form>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
          <h2 className="font-heading font-semibold mb-4">Your Requests</h2>
          {requests.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No requests sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => (
                <div key={request.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {request.request_type === 'Chat' ? <MessageSquare className="w-4 h-4 text-primary" /> : <CalendarDays className="w-4 h-4 text-primary" />}
                      <p className="font-medium text-sm">{request.request_type}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[request.status] || STATUS_STYLES.Pending}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(request.requested_at), 'MMM d, yyyy - HH:mm')}</p>
                  <p className="text-sm text-muted-foreground mt-2">{request.reason}</p>
                  {request.reviewed_by && (
                    <p className="text-xs text-muted-foreground mt-2">Reviewed by: {request.reviewed_by}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
