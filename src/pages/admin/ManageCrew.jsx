import { useEffect, useState } from 'react';
import { Copy, Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_ROLES, RANK_ORDER, ROLE_COLORS, getRolesArray, sortByRank } from '@/lib/roleUtils';
import {
  CREW_STATUS_OPTIONS,
  createCrewMember,
  deleteCrewMember,
  listCrewMembers,
  subscribeToStore,
  updateCrewMember,
} from '@/lib/dataStore';

const RANK_OPTIONS = [...RANK_ORDER];

const INITIAL_FORM = {
  username: '',
  password: '',
  display_name: '',
  roles: [],
  rank: '',
  status: 'Active',
  avatar_url: '',
};

function getStatusClasses(status) {
  switch (status) {
    case 'Active':
    case 'Exempt':
      return 'bg-green-500/10 text-green-600';
    case 'Authorise Leave':
      return 'bg-blue-500/10 text-blue-600';
    case 'Deriorating':
      return 'bg-orange-500/10 text-orange-600';
    default:
      return 'bg-yellow-500/10 text-yellow-600';
  }
}

export default function ManageCrew() {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    const sync = async () => setMembers(sortByRank(await listCrewMembers()));
    sync();
    return subscribeToStore(sync);
  }, []);

  const toggleRole = (role) => {
    setForm(current => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter(item => item !== role)
        : [...current.roles, role],
    }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowForm(false);
    setEditingId(null);
    setError('');
    setCopyState('');
  };

  const handleCopyPassword = async () => {
    if (!form.password) return;

    try {
      await navigator.clipboard.writeText(form.password);
      setCopyState('Copied');
      setTimeout(() => setCopyState(''), 1500);
    } catch {
      setCopyState('Unable to copy');
      setTimeout(() => setCopyState(''), 1500);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingId) {
        const updateData = { ...form };
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateCrewMember(editingId, updateData);
      } else {
        await createCrewMember(form);
      }
      resetForm();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save that crew member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member) => {
    setForm({
      username: member.username || '',
      password: '',
      display_name: member.display_name || '',
      roles: getRolesArray(member),
      rank: member.rank || '',
      status: member.status || 'Active',
      avatar_url: member.avatar_url || '',
    });
    setEditingId(member.id);
    setShowForm(true);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Manage Crew</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} crew members</p>
        </div>
        <Button onClick={() => { setShowForm(value => !value); if (showForm) resetForm(); }} className="bg-primary w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading font-semibold">{editingId ? 'Edit Member' : 'Add Crew Member'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Display Name</Label>
              <Input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Username</Label>
              <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            </div>
            <div>
              <Label className="text-sm">Password {editingId && '(leave blank to keep current password)'}</Label>
              <div className="flex gap-2">
                <Input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editingId} />
                <Button type="button" variant="outline" className="shrink-0" disabled={!form.password} onClick={handleCopyPassword}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copyState || 'Copy'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm">Rank</Label>
              <Select value={form.rank || 'none'} onValueChange={(value) => setForm({ ...form, rank: value === 'none' ? '' : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No rank</SelectItem>
                  {RANK_OPTIONS.map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREW_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Profile Picture URL</Label>
              <Input value={form.avatar_url} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} placeholder="Optional image link" />
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Roles</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_ROLES.map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox checked={form.roles.includes(role)} onCheckedChange={() => toggleRole(role)} />
                  <span className="text-sm">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={submitting || form.roles.length === 0} className="bg-primary">
              {submitting ? 'Saving...' : editingId ? 'Update Member' : 'Add Member'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {members.map(member => {
          const roles = getRolesArray(member);

          return (
            <div key={member.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{member.display_name?.[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{member.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                  {member.rank && <p className="text-xs text-muted-foreground">{member.rank}</p>}
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(member)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  {member.username !== 'Ronnie' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={async () => { await deleteCrewMember(member.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {roles.map(role => (
                  <span key={role} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border'}`}>
                    {role}
                  </span>
                ))}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roles.length > 0 ? 'sm:ml-auto' : ''} ${getStatusClasses(member.status)}`}>
                  {member.status || 'Active'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
