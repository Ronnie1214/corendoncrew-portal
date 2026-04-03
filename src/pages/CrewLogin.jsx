import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Lock, User, AlertCircle } from 'lucide-react';
import { authenticateCrewMember } from '@/lib/dataStore';

const LOGIN_DELAY_MS = 1500;

export default function CrewLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY_MS));
      const member = await authenticateCrewMember(username, password);
      onLogin(member);
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(220,25%,10%)]">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat blur-xl"
        style={{ backgroundImage: "url('/login-background.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,13,24,0.88),rgba(20,24,34,0.78),rgba(88,8,14,0.54))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(143,16,22,0.26),transparent_32%)]" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-[#8f1016]/20 blur-3xl" />
      
      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8f1016] shadow-lg shadow-[#8f1016]/30">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">Corendon Airlines</h1>
          <p className="text-[hsl(220,10%,55%)] mt-1 font-body text-sm tracking-wide uppercase">Roblox Crew Portal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-heading font-semibold text-white mb-6">Sign in to your account</h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20"
                  placeholder="Enter your username"
                  required />
                
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20"
                  placeholder="Enter your password"
                  required />
                
              </div>
            </div>

            {error &&
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            }

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#8f1016] font-semibold text-white hover:bg-[#7b0d13]">
              
              {loading ?
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

              'Sign In'
              }
            </Button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">Open a ticket if you forgot your password or username.

        </p>
      </div>
    </div>);

}
