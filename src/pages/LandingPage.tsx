import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.js';
import { 
  ArrowRight, 
  Sparkles, 
  Workflow, 
  Braces, 
  Bot, 
  Zap,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { UserMenu } from '@/components/UserMenu.js';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/projects');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-background/90 text-foreground">
      {/* Navigation */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 bg-background/80 backdrop-blur-sm border-b border-white/10">
        <h1 className="text-xl font-bold text-gradient">CogentX</h1>
        <div className="flex items-center gap-4">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>
      
      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center pt-24 pb-32 px-4 md:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(var(--accent-foreground),0.15),transparent_50%)]"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white/90 to-primary/70 bg-clip-text text-transparent">
              Build AI Agents Visually
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Create, visualize, and deploy powerful AI agents without writing code. Seamless integration with Google ADK.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 group flex items-center gap-2 bg-gradient-to-tr from-primary to-accent/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 border-white/20 hover:border-white/40"
              >
                View Demo
              </Button>
            </motion.div>
          </motion.div>

          {/* Floating Agent Code Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 w-full max-w-4xl mx-auto"
          >
            <div className="relative glass-card p-5 rounded-xl overflow-hidden border border-white/10">
              <div className="absolute top-0 left-0 w-full h-10 bg-background/80 flex items-center px-4 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                <span className="text-xs ml-4 text-muted-foreground">cogentx_agent.py</span>
              </div>
              <pre className="pt-8 text-sm md:text-md overflow-x-auto text-left font-mono text-purple-300/90 max-h-[300px] overflow-y-auto">
                <code>{`from google.adk.agents import LlmAgent
from google.adk.tools import google_search, weather_api

agent = LlmAgent(
    model="gemini-2.0-flash",
    name="assistant_agent",
    description="A helpful assistant that can answer questions.",
    instruction="Respond to user queries accurately using available tools",
    tools=[google_search, weather_api]
)

# This code was generated with CogentX
`}</code>
              </pre>
              <div className="absolute top-3 right-3">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              </div>
            </div>
          </motion.div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 px-4 md:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Powerful Features</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to build complex AI agents without writing a single line of code
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Workflow className="w-10 h-10 text-primary" />,
                  title: "Visual Flow Builder",
                  description: "Drag and drop interface to design agent workflows with intuitive node connections"
                },
                {
                  icon: <Braces className="w-10 h-10 text-primary" />,
                  title: "Code Generation",
                  description: "Export production-ready Google ADK code with a single click"
                },
                {
                  icon: <Bot className="w-10 h-10 text-primary" />,
                  title: "Agent Testing",
                  description: "Test your agents directly in the browser before deploying to production"
                },
                {
                  icon: <Zap className="w-10 h-10 text-primary" />,
                  title: "Natural Language Input",
                  description: "Generate agent flows from simple text descriptions using AI"
                },
                {
                  icon: <Sparkles className="w-10 h-10 text-primary" />,
                  title: "Tool Integration",
                  description: "Connect to Google Search, APIs, databases and other AI capabilities"
                },
                {
                  icon: <ArrowRight className="w-10 h-10 text-primary" />,
                  title: "One-Click Deployment",
                  description: "Seamlessly deploy your agents to production environments"
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="glass-card p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Testimonials/Pricing Section */}
        <section className="py-20 px-4 md:px-6 lg:px-8 bg-black/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Pricing Plans</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your agent development needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "forever",
                  features: [
                    "5 agent projects",
                    "Basic visual editor",
                    "Community support",
                    "Standard Google ADK integration",
                    "Limited exports per day"
                  ],
                  cta: "Get Started"
                },
                {
                  name: "Pro",
                  price: "$49",
                  period: "per month",
                  popular: true,
                  features: [
                    "Unlimited agent projects",
                    "Advanced visual editor",
                    "Priority email support",
                    "Full Google ADK integration",
                    "Unlimited exports",
                    "Version history"
                  ],
                  cta: "Get Started"
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "pricing",
                  features: [
                    "Everything in Pro",
                    "Dedicated support",
                    "Custom integrations",
                    "SSO & advanced security",
                    "SLA guarantees",
                    "On-premise deployment"
                  ],
                  cta: "Contact Sales"
                }
              ].map((plan, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className={`glass-card p-6 rounded-xl border ${plan.popular ? 'border-primary' : 'border-white/10'} relative`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 mx-auto w-32 bg-primary text-primary-foreground text-sm py-1 rounded-full text-center">
                      Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={handleGetStarted}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Call To Action */}
        <section className="py-20 px-4 md:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">Ready to Build Your Agent?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of developers building the next generation of AI assistants with our visual tools.
            </p>
            <Button 
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-tr from-primary to-accent/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
              onClick={handleGetStarted}
            >
              Start Building Now
            </Button>
          </motion.div>
        </section>
        
        {/* Footer */}
        <footer className="py-10 px-4 md:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold text-gradient">CogentX</h2>
              <p className="text-muted-foreground">Build smart agents without code</p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <h4 className="font-medium mb-3">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Features</li>
                  <li>Pricing</li>
                  <li>Documentation</li>
                  <li>Changelog</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>About</li>
                  <li>Blog</li>
                  <li>Careers</li>
                  <li>Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Tutorials</li>
                  <li>Examples</li>
                  <li>Community</li>
                  <li>Support</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex justify-between items-center text-sm text-muted-foreground">
            <div>© 2025 CogentX. All rights reserved.</div>
            <div className="flex gap-6">
              <span>Terms</span>
              <span>Privacy</span>
              <span>Cookies</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
