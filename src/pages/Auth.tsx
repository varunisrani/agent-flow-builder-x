import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.js';
import { useToast } from '@/hooks/use-toast.js';
import { supabase } from '@/integrations/supabase/client.js';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Github, Twitter, Sparkles, Shield, Users, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator.js';
import { useAuth } from '@/hooks/useAuth.js';
import { AuthError } from '@supabase/supabase-js';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to projects page
    if (user) {
      navigate('/projects');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      });
      
      navigate('/projects');
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Login failed",
        description: authError.message || "Failed to log in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Signup successful",
        description: "Please check your email for a confirmation link.",
      });
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Signup failed",
        description: authError.message || "Failed to sign up. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Login failed",
        description: authError.message || "Failed to log in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });
      
      if (error) throw error;
    } catch (error: unknown) {
      const authError = error as AuthError;
      toast({
        title: "Login failed",
        description: authError.message || "Failed to log in with GitHub. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background/90 text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background matching landing page exactly */}
      <div className="fixed top-0 left-0 right-0 bottom-0 z-[-1] w-full h-full">
        {/* Base gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent dark:from-zinc-300/2 dark:via-purple-400/5" />
        
        {/* Radial gradient for depth - matching landing page */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.3),transparent)]" />
      </div>
      
      {/* Back to Home Button - matching landing page style */}
      <Button 
        variant="ghost" 
        className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-tr from-zinc-300/10 via-purple-400/20 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-sm border border-black/5 dark:border-white/5 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/30 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/20 transition-all duration-300 rounded-lg group"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
        Back to Home
      </Button>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header Section - matching landing page style */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4 group cursor-pointer">
            <div className="relative p-3 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 group-hover:scale-105 transition-all duration-300">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200 group-hover:from-purple-500 group-hover:to-pink-400 transition-all duration-300">
              CogentX
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {activeTab === 'login' ? 'Welcome back! Sign in to continue building amazing AI agents' : 'Join thousands of developers building the future of AI'}
          </p>
        </div>
        
        {/* Main Auth Card - matching landing page style */}
        <Card className="bg-gradient-to-br from-zinc-300/10 via-purple-400/5 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-2xl hover:shadow-purple-500/10 dark:hover:shadow-purple-400/20 transition-all duration-300">
          <CardHeader className="pb-6">
            <Tabs defaultValue="login" value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 backdrop-blur-sm border border-black/5 dark:border-white/10 p-1">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-to-tr data-[state=active]:from-purple-500/20 data-[state=active]:via-pink-500/20 data-[state=active]:to-transparent dark:data-[state=active]:from-purple-400/20 dark:data-[state=active]:via-orange-200/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 dark:data-[state=active]:border-purple-400/30 transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="data-[state=active]:bg-gradient-to-tr data-[state=active]:from-purple-500/20 data-[state=active]:via-pink-500/20 data-[state=active]:to-transparent dark:data-[state=active]:from-purple-400/20 dark:data-[state=active]:via-orange-200/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 dark:data-[state=active]:border-purple-400/30 transition-all duration-300"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="space-y-6 px-6">
            <Tabs value={activeTab}>
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <Input 
                        type="email" 
                        placeholder="Enter your email"
                        className="pl-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl py-3 transition-all duration-300 hover:border-purple-500/30 dark:hover:border-purple-400/30"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password" 
                        className="pl-12 pr-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl py-3 transition-all duration-300 hover:border-purple-500/30 dark:hover:border-purple-400/30"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <span className="relative inline-block overflow-hidden rounded-xl p-[1px] w-full">
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
                    <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 py-3 font-medium rounded-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            Signing in...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Sign In
                          </div>
                        )}
                      </Button>
                    </div>
                  </span>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <Input 
                        type="email" 
                        placeholder="Enter your email"
                        className="pl-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl py-3 transition-all duration-300 hover:border-purple-500/30 dark:hover:border-purple-400/30"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min. 6 characters)" 
                        className="pl-12 pr-12 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 focus:border-purple-500/50 dark:focus:border-purple-400/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl py-3 transition-all duration-300 hover:border-purple-500/30 dark:hover:border-purple-400/30"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <span className="relative inline-block overflow-hidden rounded-xl p-[1px] w-full">
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] group-hover:animate-[spin_1s_linear_infinite]" />
                    <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-white dark:bg-gray-950 backdrop-blur-3xl">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-tr from-zinc-300/20 via-purple-400/30 to-transparent dark:from-zinc-300/5 dark:via-purple-400/20 text-gray-900 dark:text-white border-0 hover:bg-gradient-to-tr hover:from-zinc-300/30 hover:via-purple-400/40 hover:to-transparent dark:hover:from-zinc-300/10 dark:hover:via-purple-400/30 transition-all duration-300 py-3 font-medium rounded-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            Creating account...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Create Account
                          </div>
                        )}
                      </Button>
                    </div>
                  </span>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-6 px-6 pb-6">
            <div className="relative w-full">
              <Separator className="absolute top-1/2 w-full bg-gradient-to-r from-transparent via-gray-400/20 to-transparent" />
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-tr from-zinc-300/80 via-gray-400/80 to-transparent dark:from-zinc-300/20 dark:via-gray-400/20 backdrop-blur-sm px-4 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-full border border-black/5 dark:border-white/10">
                  OR CONTINUE WITH
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/10 hover:to-transparent dark:hover:from-zinc-300/5 dark:hover:via-purple-400/5 transition-all duration-300 py-3 group"
                onClick={handleGoogleLogin}
              >
                <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform duration-300">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2 bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm border border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gradient-to-tr hover:from-zinc-300/20 hover:via-purple-400/10 hover:to-transparent dark:hover:from-zinc-300/5 dark:hover:via-purple-400/5 transition-all duration-300 py-3 group"
                onClick={handleGithubLogin}
              >
                <Github className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                GitHub
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Clean Features showcase */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent dark:from-blue-400/10 dark:via-purple-400/10 border border-blue-500/20 dark:border-blue-400/20 backdrop-blur-sm hover:border-blue-500/40 dark:hover:border-blue-400/50 transition-all duration-300 hover:scale-105"
          >
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Secure</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-transparent dark:from-green-400/10 dark:via-emerald-400/10 border border-green-500/20 dark:border-green-400/20 backdrop-blur-sm hover:border-green-500/40 dark:hover:border-green-400/50 transition-all duration-300 hover:scale-105"
          >
            <Zap className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-green-700 dark:text-green-300">Fast</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent dark:from-purple-400/10 dark:via-orange-200/10 border border-purple-500/20 dark:border-purple-400/20 backdrop-blur-sm hover:border-purple-500/40 dark:hover:border-purple-400/50 transition-all duration-300 hover:scale-105"
          >
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Collaborative</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
