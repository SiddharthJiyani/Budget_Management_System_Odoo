import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-all duration-200 hover:shadow-xl"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={24} className="transition-transform duration-300" />
      ) : (
        <Moon size={24} className="transition-transform duration-300" />
      )}
    </button>
  );
}
