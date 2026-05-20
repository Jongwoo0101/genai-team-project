import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      {/* pt-24: Navbar 높이만큼 공통 패딩 확보 */}
      <main className="pt-24">
        <Outlet />
      </main>
    </div>
  );
}
