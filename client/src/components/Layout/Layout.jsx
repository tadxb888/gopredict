import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { name: 'Predictions: Daily', path: '/dashboard/daily' },
    { name: 'Predictions: Intraday', path: '/dashboard/intraday' },
    { name: 'Tradebook', path: '/dashboard/tradebook' },
    ...(isAdmin ? [{ name: 'Settings', path: '/dashboard/settings' }] : [])
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background-light border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold">
          <span style={{ color: '#68FF8E' }}>Go</span>
          <span style={{ color: '#FFFFFF' }}>Predict</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text text-sm">{user.firstName} {user.lastName}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-text hover:text-error transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-background-light border-b border-border">
        <div className="flex px-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'text-success border-b-2 border-success'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content - OUTLET IS HERE */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
