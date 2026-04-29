import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      {/* pt-16: Navbar 높이만큼 패딩 */}
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
