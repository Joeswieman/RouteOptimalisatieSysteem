import Home from '../../pages/home';
import { ThemeProvider } from '@/hooks/use-theme';

export default function HomeExample() {
  return (
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  );
}
