import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '@/hooks/use-theme';

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}
