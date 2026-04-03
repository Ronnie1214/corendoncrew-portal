import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout({ crewMember, onLogout }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar crewMember={crewMember} onLogout={onLogout} />
      <main className="ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
