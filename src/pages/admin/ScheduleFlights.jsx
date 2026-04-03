import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaneTakeoff, Plus, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

export default function ScheduleFlights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    flight_number: '', departure: '', arrival: '', date: '', aircraft: '', max_crew: 6, status: 'Scheduled'
  });
  const crewMember = JSON.parse(localStorage.getItem('crew_session'));

  useEffect(() => { loadFlights(); }, []);

  const loadFlights = async () => {
    const f = await base44.entities.Flight.list('-date', 50);
    setFlights(f);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = { ...form, max_crew: Number(form.max_crew) };
    if (editingId) {
      await base44.entities.Flight.update(editingId, data);
    } else {
      await base44.entities.Flight.create({ ...data, created_by_name: crewMember.display_name });
    }
    resetForm();
    await loadFlights();
    setSubmitting(false);
  };

  const resetForm = () => {
    setForm({ flight_number: '', departure: '', arrival: '', date: '', aircraft: '', max_crew: 6, status: 'Scheduled' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (flight) => {
    setForm({
      flight_number: flight.flight_number, departure: flight.departure, arrival: flight.arrival,
      date: flight.date?.slice(0, 16), aircraft: flight.aircraft || '', max_crew: flight.max_crew || 6, status: flight.status
    });
    setEditingId(flight.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Flight.delete(id);
    await loadFlights();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Schedule Flights</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage flight schedules</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> New Flight
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="font-heading font-semibold">{editingId ? 'Edit Flight' : 'Schedule New Flight'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Flight Number</Label>
              <Input value={form.flight_number} onChange={(e) => setForm({...form, flight_number: e.target.value})} placeholder="e.g. XC-1234" required />
            </div>
            <div>
              <Label className="text-sm">Date & Time</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} required />
            </div>
            <div>
              <Label className="text-sm">Departure</Label>
              <Input value={form.departure} onChange={(e) => setForm({...form, departure: e.target.value})} placeholder="e.g. AMS" required />
            </div>
            <div>
              <Label className="text-sm">Arrival</Label>
              <Input value={form.arrival} onChange={(e) => setForm({...form, arrival: e.target.value})} placeholder="e.g. AYT" required />
            </div>
            <div>
              <Label className="text-sm">Aircraft</Label>
              <Input value={form.aircraft} onChange={(e) => setForm({...form, aircraft: e.target.value})} placeholder="e.g. Boeing 737-800" />
            </div>
            <div>
              <Label className="text-sm">Max Crew Slots</Label>
              <Input type="number" value={form.max_crew} onChange={(e) => setForm({...form, max_crew: e.target.value})} min={1} />
            </div>
            {editingId && (
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Boarding">Boarding</SelectItem>
                    <SelectItem value="In Flight">In Flight</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-primary">{submitting ? 'Saving...' : editingId ? 'Update' : 'Schedule Flight'}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {flights.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <PlaneTakeoff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No flights scheduled</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flight</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aircraft</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flights.map(flight => (
                  <tr key={flight.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-heading font-bold text-primary">{flight.flight_number}</td>
                    <td className="px-4 py-3">{flight.departure} → {flight.arrival}</td>
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(flight.date), 'MMM d, HH:mm')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{flight.aircraft || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{flight.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(flight)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(flight.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
