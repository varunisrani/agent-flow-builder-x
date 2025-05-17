import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, Code, Zap, ArrowRight, Github, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Navbar } from '@/components/Navbar.js';
import { WelcomeModal } from '@/components/WelcomeModal.js';
import { getAllProjects } from '@/services/projectService.js';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasProjects, setHasProjects] = useState(false);

  useEffect(() => {
    // Check if there are any existing projects
    const projects = getAllProjects();
    setHasProjects(projects.length > 0);
    
    // Show welcome modal if it's the first visit
    const hasVisited = localStorage.getItem('cogentx-visited');
    if (!hasVisited) {
      setShowWelcomeModal(true);
      localStorage.setItem('cogentx-visited', 'true');
    }
  }, []);

  const handleGetStarted = () => {
    if (hasProjects) {
      navigate('/projects');
    } else {
      setShowWelcomeModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        <section className="py-20 px-4 md:px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl opacity-20"></div>
            <div className="bg-background/80 backdrop-blur-sm border border-primary/20 rounded-2xl p-4 relative">
              <Bot className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Build and Deploy AI Agents with Ease
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl">
            CogentX is a visual builder for creating, testing, and deploying AI agents. 
            Connect models, tools, and APIs to build powerful AI workflows without writing code.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8"
              onClick={handleGetStarted}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg"
              onClick={() => window.open('https://github.com/yourusername/cogentx', '_blank')}
            >
              <Github className="mr-2 h-5 w-5" />
              GitHub
            </Button>
          </div>
        </section>
        
        <section className="py-16 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-4">
                  <Code className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Design Your Agent</h3>
                <p className="text-muted-foreground">
                  Use our intuitive visual editor to design your agent workflow. Connect models, tools, and APIs with a simple drag-and-drop interface.
                </p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Test & Refine</h3>
                <p className="text-muted-foreground">
                  Test your agent in real-time and refine its behavior. Adjust parameters, modify connections, and optimize performance.
                </p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 flex flex-col items-center text-center">
                <div className="bg-primary/10 p-3 rounded-full mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Deploy & Share</h3>
                <p className="text-muted-foreground">
                  Deploy your agent to production with one click. Share your agent with others or integrate it into your existing applications.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 px-4 md:px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">Powered by Advanced AI</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {['Google ADK', 'OpenAI', 'Vertex AI', 'Anthropic'].map((tech, i) => (
                <div key={i} className="bg-background/50 backdrop-blur-sm border border-border rounded-xl p-4 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      y: [0, -5, 0], 
                      transition: { duration: 2, repeat: 99999, ease: "linear" } 
                    }}
                  >
                    <p className="font-semibold">{tech}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-border py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} CogentX. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.open('https://twitter.com/yourusername', '_blank')}>
              <Twitter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.open('https://github.com/yourusername/cogentx', '_blank')}>
              <Github className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </footer>
      
      <WelcomeModal 
        open={showWelcomeModal} 
        onOpenChange={setShowWelcomeModal}
        onComplete={() => navigate('/projects')}
      />
    </div>
  );
}
