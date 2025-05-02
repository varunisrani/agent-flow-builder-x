
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Sparkles, 
  Workflow, 
  Braces, 
  Bot, 
  Zap,
  Check,
  Github,
  Infinity,
  BarChart3,
  Cpu
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/UserMenu';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const orbit = {
  animate: {
    rotate: 360,
    transition: { duration: 30, repeat: Infinity, ease: "linear" }
  }
};

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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden -z-10 opacity-80">
        <div className="animated-grid absolute inset-0"></div>
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-gradient-radial from-premium/20 to-transparent rounded-full"></div>
        <div className="absolute bottom-20 left-20 w-[400px] h-[400px] bg-gradient-radial from-futuristic-blue/20 to-transparent rounded-full"></div>
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[800px] h-[800px] border border-premium/10 rounded-full opacity-20"
        ></motion.div>
        
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] border border-futuristic-blue/10 rounded-full opacity-20"
        ></motion.div>
      </div>

      {/* Navigation */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
        <h1 className="text-xl font-bold premium-text-gradient">Agent Flow Builder</h1>
        <div className="flex items-center gap-4">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/auth')} className="hover:bg-white/5">
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-premium hover:shadow-premium transition-all"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center pt-24 pb-32 px-4 md:px-6 lg:px-8 overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 -z-10">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              initial={{ 
                x: Math.random() * 100 - 50 + "%", 
                y: Math.random() * 100 + "%",
                opacity: Math.random() * 0.5 + 0.3
              }}
              animate={{ 
                y: [
                  Math.random() * 100 + "%", 
                  Math.random() * 100 + "%"
                ],
                opacity: [
                  Math.random() * 0.5 + 0.3,
                  Math.random() * 0.5 + 0.3
                ]
              }}
              transition={{
                duration: Math.random() * 10 + 20,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Small badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm mb-6 px-4 py-2 rounded-full border border-white/10"
          >
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm font-medium">Visual Agent Development — No Code Required</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="premium-text-gradient">Build AI Agents</span> <br className="md:hidden" />
            <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">Visually</span>
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
              className="text-lg px-8 py-6 group flex items-center gap-2 bg-gradient-premium hover:shadow-premium transition-all duration-300"
              onClick={handleGetStarted}
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-white/20 hover:border-white/40 backdrop-blur-sm"
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
          <motion.div 
            className="relative premium-glass p-5 rounded-xl overflow-hidden border border-white/10"
            whileHover={{ boxShadow: '0 0 25px 5px rgba(155, 135, 245, 0.2)' }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute top-0 left-0 w-full h-10 bg-background/80 backdrop-blur-md flex items-center px-4 border-b border-white/10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
              </div>
              <span className="text-xs ml-4 text-muted-foreground font-mono">agent_flow.py</span>
            </div>
            <pre className="pt-8 text-sm md:text-md overflow-x-auto text-left font-mono text-purple-300/90">
              <code>{`from google.adk.agents import LlmAgent
from google.adk.tools import google_search, weather_api

agent = LlmAgent(
    model="gemini-2.0-flash",
    name="assistant_agent",
    description="A helpful assistant that can answer questions.",
    instruction="Respond to user queries accurately using available tools",
    tools=[google_search, weather_api]
)

# This code was generated with Agent Flow Builder
`}</code>
            </pre>
            <div className="absolute top-3 right-3">
              <Sparkles className="w-5 h-5 text-premium-light animate-pulse" />
            </div>
            
            {/* Animated typing cursor */}
            <div className="absolute bottom-10 left-[408px] h-4 w-0.5 bg-premium-light animate-pulse"></div>
          </motion.div>
        </motion.div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-sm font-semibold text-premium-light uppercase tracking-wider"
            >
              Powerful Features
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4 premium-text-gradient"
            >
              Everything You Need
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Build complex AI agents without writing a single line of code
            </motion.p>
          </div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <Workflow className="w-10 h-10 text-premium-light" />,
                title: "Visual Flow Builder",
                description: "Drag and drop interface to design agent workflows with intuitive node connections"
              },
              {
                icon: <Braces className="w-10 h-10 text-premium-light" />,
                title: "Code Generation",
                description: "Export production-ready Google ADK code with a single click"
              },
              {
                icon: <Bot className="w-10 h-10 text-premium-light" />,
                title: "Agent Testing",
                description: "Test your agents directly in the browser before deploying to production"
              },
              {
                icon: <Zap className="w-10 h-10 text-premium-light" />,
                title: "Natural Language Input",
                description: "Generate agent flows from simple text descriptions using AI"
              },
              {
                icon: <Sparkles className="w-10 h-10 text-premium-light" />,
                title: "Tool Integration",
                description: "Connect to Google Search, APIs, databases and other AI capabilities"
              },
              {
                icon: <ArrowRight className="w-10 h-10 text-premium-light" />,
                title: "One-Click Deployment",
                description: "Seamlessly deploy your agents to production environments"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                variants={item}
                className="premium-card p-6 rounded-xl border-white/10 hover:border-premium-light/30 group"
                whileHover={{ y: -5 }}
              >
                <div className="mb-4 p-3 bg-premium/10 rounded-lg w-fit group-hover:bg-premium/20 transition-colors">{feature.icon}</div>
                <h3 className="text-xl font-medium mb-2 group-hover:text-premium-light transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Tech Overview Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-premium/5 to-futuristic-blue/5 -z-10"></div>
        
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="md:w-1/2"
            >
              <span className="text-sm font-semibold text-premium-light uppercase tracking-wider">
                Advanced Technology
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 premium-text-gradient mt-2">
                State-of-the-Art Agent Development
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our platform leverages the latest in AI technology to make agent development accessible and powerful.
              </p>
              
              <ul className="space-y-4">
                {[
                  {icon: <Cpu />, text: "Built on Google Agent Development Kit"},
                  {icon: <Infinity />, text: "Support for unlimited agent capabilities"},
                  {icon: <BarChart3 />, text: "Comprehensive analytics and testing"},
                  {icon: <Github />, text: "Open source plugins and extensions"}
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <div className="p-2 bg-premium/10 rounded-full text-premium-light">
                      {item.icon}
                    </div>
                    <span>{item.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="md:w-1/2 relative"
            >
              {/* Orbit Animation */}
              <div className="relative aspect-square w-full max-w-md mx-auto">
                {/* Center Circle */}
                <div className="absolute inset-1/4 bg-gradient-radial from-premium/10 to-transparent rounded-full backdrop-blur-sm border border-premium/20"></div>
                
                {/* Center Icon */}
                <div className="absolute inset-1/3 flex items-center justify-center">
                  <div className="p-5 rounded-full bg-premium/10 backdrop-blur-md border border-premium/30 shadow-premium animate-pulse">
                    <Bot className="w-8 h-8 text-premium-light" />
                  </div>
                </div>
                
                {/* Orbiting Elements */}
                <motion.div 
                  className="absolute inset-0" 
                  variants={orbit} 
                  animate="animate"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 p-3 rounded-full bg-futuristic-blue/10 backdrop-blur-sm border border-futuristic-blue/20">
                    <Workflow className="w-6 h-6 text-futuristic-blue" />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute inset-0" 
                  variants={orbit} 
                  animate="animate"
                  style={{ animationDelay: "-10s" }}
                >
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 p-3 rounded-full bg-premium/10 backdrop-blur-sm border border-premium/20">
                    <Braces className="w-6 h-6 text-premium-light" />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute inset-0" 
                  variants={orbit} 
                  animate="animate"
                  style={{ animationDelay: "-20s" }}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-futuristic-blue/10 backdrop-blur-sm border border-futuristic-blue/20">
                    <Sparkles className="w-6 h-6 text-futuristic-blue" />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute inset-0" 
                  variants={orbit} 
                  animate="animate"
                  style={{ animationDelay: "-5s" }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 p-3 rounded-full bg-premium/10 backdrop-blur-sm border border-premium/20">
                    <Zap className="w-6 h-6 text-premium-light" />
                  </div>
                </motion.div>
                
                {/* Orbit Paths */}
                <div className="absolute inset-0 rounded-full border border-white/5 animate-pulse"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 bg-black/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-sm font-semibold text-premium-light uppercase tracking-wider"
            >
              Pricing Plans
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4 premium-text-gradient"
            >
              Choose Your Plan
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Select the plan that fits your agent development needs
            </motion.p>
          </div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
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
                variants={item}
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`premium-card p-6 rounded-xl ${plan.popular ? 'border-premium-light' : 'border-white/10'} relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-32 bg-gradient-premium text-primary-foreground text-sm py-1 rounded-full text-center font-medium">
                    Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold premium-text-gradient">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-premium/10">
                        <Check className="w-4 h-4 text-premium-light" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-premium hover:shadow-premium' : 'bg-white/5 border border-white/10 hover:bg-white/10'} transition-all`}
                  onClick={handleGetStarted}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Call To Action */}
      <section className="py-20 px-4 md:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-premium/10 to-transparent rounded-full blur-xl"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center neo-glass p-10 rounded-2xl border border-white/10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 premium-text-gradient">Ready to Build Your Agent?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of developers building the next generation of AI assistants with our visual tools.
          </p>
          <Button 
            size="lg"
            className="text-lg px-8 py-6 bg-gradient-premium hover:shadow-premium transition-all duration-300"
            onClick={handleGetStarted}
          >
            Start Building Now
          </Button>
          
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { number: "10k+", label: "Active Users" },
              { number: "50k+", label: "Projects Created" },
              { number: "99.9%", label: "Uptime" },
              { number: "24/7", label: "Support" }
            ].map((stat, i) => (
              <div key={i} className="p-4">
                <div className="text-2xl font-bold text-premium-light">{stat.number}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 px-4 md:px-6 lg:px-8 border-t border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <h2 className="text-2xl font-bold premium-text-gradient">Agent Flow Builder</h2>
            <p className="text-muted-foreground">Build smart agents without code</p>
          </div>
          <div className="flex flex-wrap gap-8">
            <div>
              <h4 className="font-medium mb-3 text-premium-light">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-white transition-colors">Features</li>
                <li className="hover:text-white transition-colors">Pricing</li>
                <li className="hover:text-white transition-colors">Documentation</li>
                <li className="hover:text-white transition-colors">Changelog</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-premium-light">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-white transition-colors">About</li>
                <li className="hover:text-white transition-colors">Blog</li>
                <li className="hover:text-white transition-colors">Careers</li>
                <li className="hover:text-white transition-colors">Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-premium-light">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-white transition-colors">Tutorials</li>
                <li className="hover:text-white transition-colors">Examples</li>
                <li className="hover:text-white transition-colors">Community</li>
                <li className="hover:text-white transition-colors">Support</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row md:justify-between md:items-center text-sm text-muted-foreground">
          <div className="mb-4 md:mb-0">© 2025 Agent Flow Builder. All rights reserved.</div>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Cookies</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
