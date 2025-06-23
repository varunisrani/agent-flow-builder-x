import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.js';
import { useAuth } from '@/hooks/useAuth.js';
import { UserMenu } from '@/components/UserMenu.js';
import { HeroSection } from '@/components/ui/hero-section-dark.js';
import { Sparkles, Menu, X } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/projects');
    } else {
      navigate('/auth');
    }
  };

  const navigationItems = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-background/90 text-foreground">
      {/* Navigation */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 relative z-50 bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
        {/* Logo Section */}
        <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
          <div className="relative p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 mr-3 group-hover:scale-105 transition-all duration-300">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200 group-hover:from-purple-500 group-hover:to-pink-400 transition-all duration-300">
            CogentX
          </h1>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <button
              key={item.name}
              onClick={() => scrollToSection(item.href)}
              className="relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-all duration-300 group"
            >
              <span className="relative z-10">{item.name}</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-300/20 via-purple-400/20 to-transparent dark:from-zinc-300/10 dark:via-purple-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 border border-purple-500/20 dark:border-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          ))}
        </nav>
        
        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 group"
              >
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 border border-purple-500/20 dark:border-purple-400/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
              <span className="relative inline-block overflow-hidden rounded-full p-[1px] group">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
                <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 backdrop-blur-3xl">
                  <Button
                    onClick={() => navigate('/auth')}
                    className="inline-flex rounded-full text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 px-6 py-2 text-sm font-medium hover:scale-105"
                  >
                    Get Started
                    <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform duration-300" />
                  </Button>
                </div>
              </span>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-gradient-to-tr from-zinc-300/95 via-purple-400/30 to-transparent dark:from-zinc-300/10 dark:via-purple-400/20 backdrop-blur-xl border-b border-black/5 dark:border-white/5 md:hidden">
            <nav className="flex flex-col p-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => scrollToSection(item.href)}
                  className="text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300"
                >
                  {item.name}
                </button>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-black/10 dark:border-white/10">
                {user ? (
                  <UserMenu />
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/auth')}
                      className="justify-start text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300"
                    >
                      Sign In
                    </Button>
                    <span className="relative inline-block overflow-hidden rounded-full p-[1px] w-full">
                      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                      <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 backdrop-blur-3xl">
                        <Button
                          onClick={() => navigate('/auth')}
                          className="inline-flex rounded-full text-center group items-center justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 px-6 py-3 text-sm font-medium w-full"
                        >
                          Get Started
                          <Sparkles className="w-4 h-4 ml-2 group-hover:rotate-12 transition-transform duration-300" />
                        </Button>
                      </div>
                    </span>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
      
      {/* Hero Section with all integrated components - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <HeroSection 
          title="Build AI Agents Visually"
          subtitle={{
            regular: "Create powerful agents with ",
            gradient: "visual flow builder",
          }}
          description="Build, visualize, and deploy AI agents without writing code. Seamless integration with Google ADK and powerful agent development tools."
          ctaText="Get Started"
          onCtaClick={handleGetStarted}
          gridOptions={{
            angle: 65,
            opacity: 0.3,
            cellSize: 60,
            lightLineColor: "#6d28d9",
            darkLineColor: "#a855f7",
          }}
        />
      </div>
    </div>
  );
};

export default LandingPage;
