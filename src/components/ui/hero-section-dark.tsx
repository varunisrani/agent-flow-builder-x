import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, Sparkles, Workflow, Braces, Bot, Zap, Check, ArrowRight } from "lucide-react"
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button.js'

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: {
    regular: string
    gradient: string
  }
  description?: string
  ctaText?: string
  ctaHref?: string
  onCtaClick?: () => void
  bottomImage?: {
    light: string
    dark: string
  }
  gridOptions?: {
    angle?: number
    cellSize?: number
    opacity?: number
    lightLineColor?: string
    darkLineColor?: string
  }
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "gray",
  darkLineColor = "gray",
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`,
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent to-90% dark:from-black" />
    </div>
  )
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = "Build AI Agents Visually",
      subtitle = {
        regular: "Create powerful agents with ",
        gradient: "visual flow builder",
      },
      description = "Build, visualize, and deploy AI agents without writing code. Seamless integration with Google ADK and powerful agent development tools.",
      ctaText = "Get Started",
      ctaHref = "#",
      onCtaClick,
      bottomImage = {
        light: "https://farmui.vercel.app/dashboard-light.png",
        dark: "https://farmui.vercel.app/dashboard.png",
      },
      gridOptions,
      ...props
    },
    ref,
  ) => {
    const handleGetStarted = () => {
      if (onCtaClick) {
        onCtaClick()
      }
    }

    return (
      <div className={cn("relative min-h-screen", className)} ref={ref} {...props}>
        {/* Extended background that covers all sections */}
        <div className="absolute top-0 z-[0] h-full w-full bg-purple-950/10 dark:bg-purple-950/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        {/* Hero Section */}
        <section className="relative max-w-full mx-auto z-1">
          <RetroGrid {...gridOptions} />
          <div className="max-w-screen-xl z-10 mx-auto px-4 py-28 gap-12 md:px-8">
            <div className="space-y-5 max-w-3xl leading-0 lg:leading-5 mx-auto text-center">
              <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit">
                {title}
                <ChevronRight className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
              </h1>
              <h2 className="text-4xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-6xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                {subtitle.regular}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                  {subtitle.gradient}
                </span>
              </h2>
              <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
                {description}
              </p>
              <div className="items-center justify-center gap-x-3 space-y-3 sm:flex sm:space-y-0">
                <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                    <button
                      onClick={handleGetStarted}
                      className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all sm:w-auto py-4 px-10"
                    >
                      {ctaText}
                    </button>
                  </div>
                </span>
              </div>
            </div>
            {bottomImage && (
              <div className="mt-32 mx-10 relative z-10">
                <img
                  src={bottomImage.light}
                  className="w-full shadow-lg rounded-lg border border-gray-200 dark:hidden"
                  alt="Dashboard preview"
                />
                <img
                  src={bottomImage.dark}
                  className="hidden w-full shadow-lg rounded-lg border border-gray-800 dark:block"
                  alt="Dashboard preview"
                />
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-20 px-4 md:px-6 lg:px-8">
          <div className="absolute top-0 z-[0] h-full w-full bg-purple-950/5 dark:bg-purple-950/5 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit mb-6">
                Powerful Features
                <Sparkles className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
              </h1>
              <h2 className="text-3xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-5xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)] mb-4">
                Everything you need to build 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                  {" "}complex AI agents
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                without writing a single line of code
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
                  className="relative p-6 rounded-xl border-[2px] border-black/5 dark:border-white/5 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 hover:from-zinc-300/20 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="mb-4 text-purple-600 dark:text-purple-400">{feature.icon}</div>
                  <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-gray-100">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section className="relative py-20 px-4 md:px-6 lg:px-8 bg-purple-950/5 dark:bg-purple-950/5">
          <div className="absolute top-0 z-[0] h-full w-full bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit mb-6">
                Pricing Plans
                <Check className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
              </h1>
              <h2 className="text-3xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-5xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)] mb-4">
                Choose the plan that fits your 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                  {" "}agent development needs
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  name: "Starter",
                  price: "$0",
                  period: "forever",
                  description: "Perfect for getting started with AI agents",
                  features: [
                    "5 agent projects",
                    "Basic visual flow builder",
                    "Community support",
                    "Standard Google ADK integration",
                    "5 code exports per day",
                    "Basic templates library"
                  ],
                  cta: "Start Free",
                  icon: "🚀"
                },
                {
                  name: "Professional",
                  price: "$49",
                  period: "per month",
                  popular: true,
                  description: "For serious developers and small teams",
                  features: [
                    "Unlimited agent projects",
                    "Advanced visual editor",
                    "Priority email support",
                    "Full Google ADK integration",
                    "Unlimited code exports",
                    "Version history & backups",
                    "Advanced templates library",
                    "MCP server integration",
                    "Custom node types"
                  ],
                  cta: "Start Pro Trial",
                  icon: "⚡"
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "pricing",
                  description: "For large teams and organizations",
                  features: [
                    "Everything in Professional",
                    "Dedicated account manager",
                    "Custom integrations & APIs",
                    "SSO & advanced security",
                    "99.9% SLA guarantees",
                    "On-premise deployment",
                    "Custom training sessions",
                    "Priority feature requests",
                    "24/7 phone support"
                  ],
                  cta: "Contact Sales",
                  icon: "🏢"
                }
              ].map((plan, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  viewport={{ once: true }}
                  className={`relative p-8 rounded-2xl border-[2px] ${
                    plan.popular 
                      ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent dark:from-purple-400/15 dark:via-orange-200/10 shadow-lg shadow-purple-500/25' 
                      : 'border-black/10 dark:border-white/10 bg-gradient-to-br from-zinc-300/10 via-gray-400/5 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5'
                  } backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-xl group`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 mx-auto w-36 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm py-2 rounded-full text-center font-medium shadow-lg">
                      ⭐ Most Popular
                    </div>
                  )}
                  
                  <div className="text-4xl mb-4">{plan.icon}</div>
                  
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{plan.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{plan.description}</p>
                  </div>
                  
                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold bg-clip-text text-transparent bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)]">
                        {plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-2">/{plan.period}</span>
                    </div>
                    {plan.price !== "Custom" && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {plan.price === "$0" ? "No credit card required" : "Billed monthly, cancel anytime"}
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="w-full">
                    {plan.popular ? (
                      <span className="relative inline-block overflow-hidden rounded-full p-[1.5px] w-full">
                        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                        <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                          <button
                            onClick={handleGetStarted}
                            className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all py-4 px-10"
                          >
                            {plan.cta}
                          </button>
                        </div>
                      </span>
                    ) : (
                      <Button 
                        className="w-full border-[2px] border-black/5 dark:border-white/5 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 hover:from-zinc-300/30 hover:via-purple-400/20 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/10 text-gray-900 dark:text-white"
                        variant="outline"
                        onClick={handleGetStarted}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Call To Action */}
        <section className="relative py-20 px-4 md:px-6 lg:px-8">
          <div className="absolute top-0 z-[0] h-full w-full bg-purple-950/5 dark:bg-purple-950/5 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center relative z-10"
          >
            <h1 className="text-sm text-gray-600 dark:text-gray-400 group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 border-[2px] border-black/5 dark:border-white/5 rounded-3xl w-fit mb-6">
              Ready to Build Your Agent?
              <ArrowRight className="inline w-4 h-4 ml-2 group-hover:translate-x-1 duration-300" />
            </h1>
            <h2 className="text-3xl tracking-tighter font-geist bg-clip-text text-transparent mx-auto md:text-5xl bg-[linear-gradient(180deg,_#000_0%,_rgba(0,_0,_0,_0.75)_100%)] dark:bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)] mb-6">
              Join thousands of developers building 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
                {" "}the next generation
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
              of AI assistants with our visual tools.
            </p>
            <div className="flex justify-center">
              <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-gray-950 text-xs font-medium backdrop-blur-3xl">
                  <button
                    onClick={handleGetStarted}
                    className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-input border-[1px] hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all py-4 px-10 text-lg"
                  >
                    Start Building Now
                  </button>
                </div>
              </span>
            </div>
          </motion.div>
        </section>
        
        {/* Footer */}
        <footer className="relative py-10 px-4 md:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">CogentX</h2>
              <p className="text-gray-600 dark:text-gray-400">Build smart agents without code</p>
            </div>
            <div className="flex flex-wrap gap-8">
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Product</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Features</li>
                  <li>Pricing</li>
                  <li>Documentation</li>
                  <li>Changelog</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Company</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>About</li>
                  <li>Blog</li>
                  <li>Careers</li>
                  <li>Contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Tutorials</li>
                  <li>Examples</li>
                  <li>Community</li>
                  <li>Support</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div>© 2025 CogentX. All rights reserved.</div>
            <div className="flex gap-6">
              <span>Terms</span>
              <span>Privacy</span>
              <span>Cookies</span>
            </div>
          </div>
        </footer>
      </div>
    )
  },
)
HeroSection.displayName = "HeroSection"

export { HeroSection }
