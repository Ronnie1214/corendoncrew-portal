import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout({ crewMember, onLogout }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar crewMember={crewMember} onLogout={onLogout} />
      <main className="min-h-screen md:ml-64">
        <div className="mx-auto max-w-7xl p-4 pt-20 sm:p-6 sm:pt-24 md:p-6 md:pt-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
