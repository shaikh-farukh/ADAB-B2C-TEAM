import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LoginPage from '../pages/LoginPage';

describe('LoginPage Component', () => {
  it('renders login form with email, password, and see password toggle button', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} onNavigate={() => {}} />);

    // Check headings, labels and inputs
    expect(html).toContain('Login');
    expect(html).toContain('Email Address');
    expect(html).toContain('Password');
    expect(html).toContain('Forgot password?');
    expect(html).toContain('Not a user?');
    expect(html).toContain('Register here');
    // Check see password toggle button
    expect(html).toContain('fa-eye');
  });

  it('contains full ADAB brand theme styling', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} onNavigate={() => {}} />);

    expect(html).toContain('#18753C'); // Brand green
    expect(html).toContain('ADAB');
    expect(html).toContain('Neighbourhood shops delivered in minutes');
  });

  it('renders Continue with Google button, mode navigation tabs, and terms notice', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} onNavigate={() => {}} />);

    expect(html).toContain('Continue with Google');
    expect(html).toContain('Create Account');
    expect(html).toContain('Terms &amp; Privacy Policy');
  });
});
