import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Boxes, ShieldAlert, KeyRound, Mail } from 'lucide-react';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('admin@inventory.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (role) => {
    if (role === 'Admin') {
      setIdentifier('admin@inventory.com');
      setPassword('Admin@123456');
    } else if (role === 'Staff') {
      setIdentifier('staff@inventory.com');
      setPassword('Staff@123456');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Inventory V1</h1>
          <p className="text-sm text-slate-700 font-medium mt-1">Sign in to your staff or admin portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 animate-fadeIn">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            icon={Mail}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin@inventory.com"
          />

          <Input
            label="Password"
            type="password"
            required
            icon={KeyRound}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" loading={loading} className="w-full py-2.5 mt-2 font-bold">
            Sign In
          </Button>
        </form>

        {/* Demo Fast-Fill Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center mb-3">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('Admin')}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-300 text-slate-900 transition-colors"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('Staff')}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-300 text-slate-900 transition-colors"
            >
              Staff Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
