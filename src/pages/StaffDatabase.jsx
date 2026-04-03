import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { listCrewMembers, subscribeToStore } from '@/lib/dataStore';
import { ROLE_COLORS, getRolesArray, sortByRank } from '@/lib/roleUtils';

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

export default function StaffDatabase() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const sync = async () => setMembers(sortByRank(await listCrewMembers()));
    sync();
    return subscribeToStore(sync);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Staff Database</h1>
        <p className="text-muted-foreground text-sm mt-1">All crew members listed in rank order.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Display Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rank</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Flights Attended</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="border-b border-border last:border-b-0 align-top">
                  <td className="px-4 py-4 font-medium">{member.display_name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{member.rank || 'Not set'}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(member.status)}`}>
                      {member.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{member.flights_completed || 0}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {getRolesArray(member).map(role => (
                        <Badge key={role} variant="outline" className={ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border'}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
