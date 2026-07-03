import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CircleDollarSign, History, HandCoins, Settings, Wallet } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Bosh sahifa' },
  { to: '/workers', icon: Users, label: 'Ishchilar' },
  { to: '/pay', icon: CircleDollarSign, label: "To'lash" },
  { to: '/history', icon: History, label: 'Tarix' },
  { to: '/other-payments', icon: HandCoins, label: 'Qarzlar' },
  { to: '/settings', icon: Settings, label: 'Sozlamalar' },
];

const mobileNavItems = navItems.slice(0, 5);

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex pt-[env(safe-area-inset-top)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 fixed h-full z-10 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">Oylik Tizimi</div>
              <div className="text-xs text-gray-400">Boshqaruv paneli</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">v2.0</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 page-enter">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — 5 main items, Settings in header */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex md:hidden z-50 shadow-lg">
        {mobileNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
