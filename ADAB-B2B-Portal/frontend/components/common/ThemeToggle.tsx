import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-4 left-4 p-3 rounded-full bg-white dark:bg-dark-surface-card shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-dark-border-secondary z-50 text-gray-800 dark:text-dark-text-secondary flex items-center justify-center group"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      ) : (
        <Sun className="w-6 h-6 group-hover:rotate-90 transition-transform" />
      )}
    </button>
  );
};

export default ThemeToggle;
