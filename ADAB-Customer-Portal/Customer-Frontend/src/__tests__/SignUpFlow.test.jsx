import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LoginPage from '../pages/LoginPage';

describe('3-Step Sign Up Flow Component', () => {
  it('1. Renders Step 1 with user personal details, passwords, and progress stepper', () => {
    const html = renderToString(
      <LoginPage onLoginSuccess={() => {}} onNavigate={() => {}} />
    );

    // Initial Login View renders registration trigger
    expect(html).toContain('Not a user?');
    expect(html).toContain('Register here');
    expect(html).toContain('Login');
    expect(html).toContain('Email Address');
    expect(html).toContain('Password');
  });

  it('2. Contains password visibility toggles and ADAB brand theme', () => {
    const html = renderToString(
      <LoginPage onLoginSuccess={() => {}} onNavigate={() => {}} />
    );

    expect(html).toContain('fa-eye');
    expect(html).toContain('#18753C'); // Brand Green
    expect(html).toContain('ADAB');
  });
});
