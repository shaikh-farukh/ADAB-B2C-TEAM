import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageProvider } from '../../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

describe('LanguageSelector Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('renders with default English language button', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.textContent).toContain('EN');
  });

  it('opens dropdown when clicked and lists English, Hindi, and Gujarati', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByText('हिन्दी')).toBeDefined();
    expect(screen.getByText('ગુજરાતી')).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();
  });

  it('switches to Hindi when clicked and saves to localStorage', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);

    const hindiBtn = screen.getByText('हिन्दी');
    fireEvent.click(hindiBtn);

    expect(localStorage.getItem('adabLang')).toBe('hi');
    expect(toggleBtn.textContent).toContain('HI');
    expect(document.documentElement.lang).toBe('hi');
  });

  it('switches to Gujarati when clicked and saves to localStorage', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);

    const gujBtn = screen.getByText('ગુજરાતી');
    fireEvent.click(gujBtn);

    expect(localStorage.getItem('adabLang')).toBe('gu');
    expect(toggleBtn.textContent).toContain('GU');
    expect(document.documentElement.lang).toBe('gu');
  });

  it('closes dropdown on pressing Escape', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);
    expect(screen.queryByRole('menu')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
