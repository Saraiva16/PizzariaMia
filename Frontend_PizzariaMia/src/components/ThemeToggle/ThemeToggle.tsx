import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? 'dark-active' : ''} ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      aria-label="Alternar tema claro e escuro"
    >
      <div className="theme-toggle-icon-box">
        {isDark ? (
          <span className="theme-icon sun-icon" role="img" aria-label="Sol">
            ☀️
          </span>
        ) : (
          <span className="theme-icon moon-icon" role="img" aria-label="Lua">
            🌙
          </span>
        )}
      </div>
      <span className="theme-toggle-text">
        {isDark ? 'Claro' : 'Escuro'}
      </span>
    </button>
  );
};

export default ThemeToggle;
