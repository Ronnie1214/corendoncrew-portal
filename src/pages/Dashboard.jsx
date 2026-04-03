import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, Info, Plane, ShieldAlert, UserSquare, X } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROLE_COLORS, getRolesArray } from '@/lib/roleUtils';
import {
  dismissLoaNotification,
  getActiveLoaNotification,
  getDashboardData,
  getSessionCrewMember,
  subscribeToStore,
} from '@/lib/dataStore';

const priorityConfig = {
  Urgent: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', icon: ShieldAlert },
  High: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-600', icon: Bell },
  Medium: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: Info },
  Low: { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', icon: Bell },
};

export default function Dashboard() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [dashboardData, setDashboardData] = useState({ totalAttendedFlights: 0, upcomingFlights: [], roles: [], notices: [] });
  const [loaNotification, setLoaNotification] = useState(null);

  useEffect(() => {
    const sync = async () => {
      const session = getSessionCrewMember();
      setCrewMember(session);
      setDashboardData(await getDashboardData(session));
      setLoaNotification(await getActiveLoaNotification(session?.id));
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const roles = getRolesArray(crewMember);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-card rounded-3xl border border-border p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-16 w-16 rounded-2xl sm:h-20 sm:w-20">
              <AvatarImage src={crewMember?.avatar_url || ''} alt={crewMember?.display_name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-2xl font-heading font-bold">
                {crewMember?.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-heading font-bold text-foreground sm:text-2xl">
                Welcome back, {crewMember?.display_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {crewMember?.rank || 'Crew Member'} - {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {roles.map(role => (
                  <Badge key={role} variant="outline" className={ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border'}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <StatCard icon={Plane} label="Flights Attended" value={dashboardData.totalAttendedFlights} />
          <StatCard icon={Clock} label="Upcoming Flights" value={dashboardData.upcomingFlights.length} />
          <StatCard icon={UserSquare} label="Roles Assigned" value={roles.length} />
        </div>
      </div>

      {loaNotification && (
        <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-start sm:justify-between ${
          loaNotification.status === 'Approved'
            ? 'border-green-500/20 bg-green-500/10'
            : 'border-red-500/20 bg-red-500/10'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`w-5 h-5 mt-0.5 ${loaNotification.status === 'Approved' ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="font-semibold text-sm">Your LOA request was {loaNotification.status.toLowerCase()}.</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(loaNotification.start_date), 'MMM d, yyyy')} to {format(new Date(loaNotification.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 self-end sm:self-auto"
            onClick={async () => { await dismissLoaNotification(loaNotification.id, crewMember.id); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-heading font-semibold">Upcoming Allocations</h2>
            <Link to="/flights" className="text-primary text-sm font-medium hover:underline">
              View all flights
            </Link>
          </div>

          {dashboardData.upcomingFlights.length === 0 ? (
            <EmptyState icon={Plane} label="You are not allocated to any upcoming flights yet." />
          ) : (
            <div className="space-y-3">
              {dashboardData.upcomingFlights.map(({ flight, allocation }) => (
                <div key={allocation.id} className="bg-card rounded-2xl border border-border p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-heading font-bold text-primary">{flight.flight_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {flight.departure} to {flight.arrival}
                      </p>
                    </div>
                    <Badge variant="outline">{allocation.position}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {format(new Date(flight.date), 'MMM d, yyyy - HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-heading font-semibold mb-4">Board Notices</h2>
          {dashboardData.notices.length === 0 ? (
            <EmptyState icon={Bell} label="No notices from Senior Board or Executive Board." />
          ) : (
            <div className="space-y-3">
              {dashboardData.notices.map(notice => {
                const config = priorityConfig[notice.priority] || priorityConfig.Medium;
                const Icon = config.icon;

                return (
                  <div key={notice.id} className={`bg-card rounded-2xl border ${config.border} p-5`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{notice.title}</h3>
                          {notice.pinned && <Badge className="bg-accent text-white hover:bg-accent">Pinned</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{notice.content}</p>
                        <p className="text-xs text-muted-foreground/70 mt-3">
                          {notice.author_name} - {format(new Date(notice.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xl font-heading font-bold sm:text-2xl">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-8 text-center">
      <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
