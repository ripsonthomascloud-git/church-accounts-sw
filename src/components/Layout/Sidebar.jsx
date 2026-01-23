import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/members', label: 'Members', icon: '👥' },
    { path: '/payees', label: 'Payee Information', icon: '🏢' },
    { path: '/categories', label: 'Categories', icon: '📁' },
    { path: '/budget', label: 'Budget', icon: '💼' },
    { path: '/transactions', label: 'Transactions', icon: '💰' },
    { path: '/bank-statements', label: 'Bank Statements', icon: '🏦' },
    { path: '/reports', label: 'Reports', icon: '📈' },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
