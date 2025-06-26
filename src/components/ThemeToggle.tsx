import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useTheme } from '@/providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 white:from-zinc-700/10 white:via-gray-600/10 border-[2px] border-black/5 dark:border-white/10 white:border-black/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 white:hover:border-purple-600/30 text-gray-700 dark:text-gray-300 white:text-gray-800 hover:text-purple-600 dark:hover:text-purple-400 white:hover:text-purple-700 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 white:hover:from-zinc-700/20 white:hover:via-purple-400/20 transition-all duration-300 group"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          ) : theme === 'dark' ? (
            <Moon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          ) : theme === 'white' ? (
            <Palette className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <Monitor className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('white')}>
          <Palette className="mr-2 h-4 w-4" />
          <span>White</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}