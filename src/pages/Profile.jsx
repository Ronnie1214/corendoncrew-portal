import { useEffect, useRef, useState } from 'react';
import { Award, Calendar, Camera, Plane, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ROLE_COLORS, getRolesArray } from '@/lib/roleUtils';
import { getSessionCrewMember, subscribeToStore, updateCrewMember } from '@/lib/dataStore';

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

export default function Profile() {
  const [crewMember, setCrewMember] = useState(() => getSessionCrewMember());
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      const session = getSessionCrewMember();
      setCrewMember(session);
    };

    sync();
    return subscribeToStore(sync);
  }, []);

  const roles = getRolesArray(crewMember);

  const handlePictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !crewMember) return;

    if (!file.type.startsWith('image/')) {
      setPictureError('Please choose an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPictureError('Please choose an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      await updateCrewMember(crewMember.id, { avatar_url: reader.result });
      setPictureError('');
    };
    reader.onerror = () => {
      setPictureError('Unable to read that image file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-heading font-bold">My Profile</h1>

      <div className="rounded-2xl border border-border bg-[#131313] p-4 text-white shadow-sm sm:p-5">
        <p className="text-sm font-semibold mb-4">Profile Picture</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar className="w-16 h-16 bg-zinc-800">
              <AvatarImage src={crewMember?.avatar_url || ''} alt={crewMember?.display_name} />
              <AvatarFallback className="bg-zinc-800 text-white font-bold">
                {crewMember?.display_name?.slice(0, 2).toUpperCase() || 'CP'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center border-2 border-[#131313]">
              <Camera className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                className="hidden"
                onChange={handlePictureChange}
              />
              <Button
                variant="outline"
                className="w-full border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Picture
              </Button>
              <span className="text-xs text-zinc-400">JPG, PNG or GIF. Max 2MB.</span>
            </div>
            {pictureError && <p className="text-xs text-red-400 mt-3">{pictureError}</p>}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[hsl(215,80%,48%)] to-[hsl(215,80%,35%)] relative">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        </div>

        <div className="relative -mt-12 px-4 pb-4 sm:px-6 sm:pb-6">
          <Avatar className="h-20 w-20 rounded-2xl border-4 border-card shadow-lg sm:h-24 sm:w-24">
            <AvatarImage src={crewMember?.avatar_url || ''} alt={crewMember?.display_name} />
            <AvatarFallback className="rounded-2xl bg-card text-3xl font-heading font-bold text-primary">
              {crewMember?.display_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h2 className="text-lg font-heading font-bold sm:text-xl">{crewMember?.display_name}</h2>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusClasses(crewMember?.status)}`}>
                {crewMember?.status || 'Active'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(role => (
                <span key={role} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_COLORS[role] || 'bg-muted text-muted-foreground border-border'}`}>
                  {role}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">@{crewMember?.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailCard icon={Award} label="Rank" value={crewMember?.rank || 'Not set'} />
        <DetailCard icon={Plane} label="Flights Completed" value={crewMember?.flights_completed || 0} />
        <DetailCard icon={Calendar} label="Joined" value={crewMember?.join_date ? format(new Date(crewMember.join_date), 'MMM d, yyyy') : 'N/A'} />
        <DetailCard icon={Shield} label="Status" value={crewMember?.status || 'Active'} />
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm">{value}</p>
        </div>
      </div>
    </div>
  );
}
