import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('superadmin@adab.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      // Backend routes registered: /api/v1/auth/login, /api/auth/login
      const res = await axios.post('http://localhost:5005/api/v1/auth/login', {
        email: email.trim(),
        password
      });

      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        navigate('/');
      } else {
        setError('Login succeeded but no token was provided.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 401) {
        setError(serverMsg || 'Invalid credentials. Password verification failed against stored credentials.');
      } else if (err.response?.status === 403) {
        setError(serverMsg || 'Access denied. Account does not have administrator privileges.');
      } else {
        setError(serverMsg || 'Connection error. Ensure Admin Backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5005/api/v1/admin/dev-login');
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        navigate('/');
      }
    } catch (err) {
      setError('Development auto-login is not available.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6">
        {/* Header matching visual reference */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-900 leading-tight">ADAB Admin Authentication</h1>
            <p className="text-xs text-indigo-600 font-semibold">Enterprise Platform Control</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Sign in to authenticate administrator privileges for verifying shops, customer accounts, and catalog moderation.
        </p>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700 font-semibold flex items-start gap-2">
            <i className="fa-solid fa-circle-info mt-0.5"></i>
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email / Username</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@adab.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            <i className="fa-solid fa-lock text-indigo-600 mr-1.5"></i>
            Administrator accounts are provisioned securely. Public user registration is disabled on this portal.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Development Mode</span>
          <button
            onClick={handleDevLogin}
            disabled={loading}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Quick Dev Session →
          </button>
        </div>
      </div>
    </div>
  );
}
