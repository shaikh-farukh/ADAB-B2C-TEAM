import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import SignInPage from './SignInPage';
import SignUpPage from './SignUpPage';

// Mock SellerContext
vi.mock('../context/SellerContext', () => ({
  useSeller: () => ({
    login: vi.fn(),
    loginWithOtp: vi.fn(),
    signup: vi.fn(),
    loginWithGoogle: vi.fn()
  })
}));

describe('Authentication Overhaul - SignInPage', () => {
  it('renders SignInPage with welcome heading and branding', () => {
    render(
      <BrowserRouter>
        <SignInPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Seller Central/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In to Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Create a Seller Account/i)).toBeInTheDocument();
  });

  it('switches between Phone Number and Work Email inputs', () => {
    render(
      <BrowserRouter>
        <SignInPage />
      </BrowserRouter>
    );

    // Initial is Phone Number
    expect(screen.getByText(/Mobile Number/i)).toBeInTheDocument();

    // Click Work Email tab
    fireEvent.click(screen.getByRole('button', { name: /Work Email/i }));
    expect(screen.getByText(/Work Email Address/i)).toBeInTheDocument();

    // Click Phone tab back
    fireEvent.click(screen.getByRole('button', { name: /Phone Number/i }));
    expect(screen.getByText(/Mobile Number/i)).toBeInTheDocument();
  });

  it('switches between Password and OTP Code mode', () => {
    render(
      <BrowserRouter>
        <SignInPage />
      </BrowserRouter>
    );

    // Initially Password mode
    expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();

    // Switch to OTP Code
    fireEvent.click(screen.getByRole('button', { name: /OTP Code/i }));
    expect(screen.getByText(/Request OTP Code/i)).toBeInTheDocument();
  });
});

describe('Authentication Overhaul - SignUpPage', () => {
  it('renders SignUpPage with registration form fields', () => {
    render(
      <BrowserRouter>
        <SignUpPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Register Your Store/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Store \/ Trade Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Seller Account & Continue/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In to Account/i)).toBeInTheDocument();
  });

  it('validates required fields on submission', async () => {
    render(
      <BrowserRouter>
        <SignUpPage />
      </BrowserRouter>
    );

    const submitBtn = screen.getByText(/Create Seller Account & Continue/i);
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter your full name/i)).toBeInTheDocument();
  });
});
