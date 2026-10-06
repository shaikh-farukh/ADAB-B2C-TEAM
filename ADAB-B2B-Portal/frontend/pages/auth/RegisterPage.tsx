import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../store/useAuthStore';
import authService from '../../services/authService';
export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessType: 'distributor',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setLoggedIn, setRole } = useAuthStore();

  const googleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await authService.googleLogin(tokenResponse.access_token);
        const token = res?.token || res?.data?.token;
        const role = res?.user?.role || res?.data?.user?.role || formData.businessType;

        // token is handled via HttpOnly cookie
        localStorage.setItem('user_role', role);
        setRole(role as any);
        setLoggedIn(true);
        navigate(`/${role}/dashboard`);
        toast.success('Google signup successful!');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Google signup failed');
      }
    },
    onError: () => toast.error('Google signup failed')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signup({
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        mobile: '0000000000',
        company_name: 'My Company',
        role: formData.businessType as any,
        password: formData.password
      });

      const token = res?.token || res?.data?.token || 'pending-auth';
      const role = res?.user?.role || res?.data?.user?.role || formData.businessType;

      if (token !== 'pending-auth') {
        // token is handled via HttpOnly cookie
        localStorage.setItem('user_role', role);
        setRole(role as any);
        setLoggedIn(true);
        navigate(`/${role}/dashboard`);
      } else {
        navigate('/auth/login');
      }
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-app-secondary transition-colors py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 bg-white dark:bg-dark-surface-card p-10 rounded-2xl shadow-xl transition-colors">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-dark-text-primary">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-dark-text-muted">
            Join the ADAB B2B network today
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
              />
            </div>

            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />

            <Input
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
            />

            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Business Type
              </label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm transition-colors px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-adab-green focus:ring-adab-green bg-white dark:bg-dark-surface-card text-gray-900 dark:text-dark-text-primary"
              >
                <option value="distributor">Distributor</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
            >
              Register
            </Button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-surface-card text-gray-500">
                  Or sign up with
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => googleSignup()}
                className="flex justify-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </div>
          </div>
        </form>
        <p className="mt-8 text-center text-sm text-gray-600 dark:text-dark-text-muted">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-adab-green hover:text-green-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
