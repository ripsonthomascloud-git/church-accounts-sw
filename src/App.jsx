import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Categories from './pages/Categories';
import Budget from './pages/Budget';
import Transactions from './pages/Transactions';
import Payees from './pages/Payees';
import BankStatements from './pages/BankStatements';
import Reports from './pages/Reports';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          <Route path="/*" element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/members" element={<Members />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/budget" element={<Budget />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/payees" element={<Payees />} />
                      <Route path="/bank-statements" element={<BankStatements />} />
                      <Route path="/reports" element={<Reports />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
