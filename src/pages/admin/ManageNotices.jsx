import { useEffect, useState } from 'react';
import { Edit, Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createNotice,
  deleteNotice,
  getSessionCrewMember,
  listNotices,
  subscribeToStore,
  updateNotice,
} from '@/lib/dataStore';

const INITIAL_FORM = { title: '', content: '', priority: 'Medium', pinned: false };

export default function ManageNotices() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [notices, setNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    const sync = async () => {
      setCrewMember(getSessionCrewMember());
      setNotices(await listNotices({ limit: 100 }));
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        await updateNotice(editingId, form);
      } else {
        await createNotice(form, crewMember);
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Manage Notices</h1>
          <p className="text-muted-foreground text-sm mt-1">Publish global notices for every crew role.</p>
        </div>
        <Button onClick={() => { setShowForm(value => !value); if (showForm) resetForm(); }} className="bg-primary w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> New Notice
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-4 space-y-4 sm:p-6">
          <h2 className="font-heading font-semibold">{editingId ? 'Edit Notice' : 'New Notice'}</h2>
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <Textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={4} required />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="text-sm">Importance</Label>
              <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={form.pinned} onCheckedChange={(value) => setForm({ ...form, pinned: value })} />
              <Label className="text-sm">Pin notice</Label>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={submitting} className="bg-primary">
              {submitting ? 'Saving...' : editingId ? 'Update Notice' : 'Publish Notice'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {notices.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(notice => (
            <div key={notice.id} className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm">{notice.title}</h3>
                    {notice.pinned && <Pin className="w-3.5 h-3.5 text-accent" />}
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{notice.priority}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notice.content}</p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    {notice.author_name} - {format(new Date(notice.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setForm({
                        title: notice.title,
                        content: notice.content,
                        priority: notice.priority,
                        pinned: Boolean(notice.pinned),
                      });
                      setEditingId(notice.id);
                      setShowForm(true);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={async () => { await deleteNotice(notice.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
