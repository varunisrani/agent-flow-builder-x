import { useState } from 'react';
import { MessageSquare, Send, X, Sparkles, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'agent';
  content: string;
  thinking?: string;
}

interface TestPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function TestPanel({ visible, onClose }: TestPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  
  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Simulate agent thinking and response
    setTimeout(() => {
      const agentMessage: Message = {
        role: 'agent',
        content: `This is a simulated response to: "${input.trim()}"`,
        thinking: `1. Analyzed user input: "${input.trim()}"\n2. Identified intent: Question/Request\n3. Formulating appropriate response...\n4. Generating response with context awareness`
      };
      
      setMessages(prev => [...prev, agentMessage]);
    }, 1500);
  };
  
  return (
    <div className={cn(
      "fixed top-0 right-0 h-screen w-96 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent dark:from-zinc-300/5 dark:via-purple-400/10 backdrop-blur-xl border-l-[2px] border-black/5 dark:border-white/10 transition-transform duration-300 flex flex-col z-20 shadow-2xl",
      visible ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header with gradient background */}
      <div className="p-6 border-b-[2px] border-black/5 dark:border-white/10 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-transparent dark:from-purple-400/5 dark:via-orange-200/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30">
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-300 dark:to-orange-200">
              Test Your Agent
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border-[2px] border-black/5 dark:border-white/10 hover:border-purple-500/30 dark:hover:border-purple-400/30 transition-all duration-300 group"
          >
            <X className="w-4 h-4 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300" />
          </button>
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent dark:from-blue-400/10 dark:via-purple-400/10 border border-blue-500/20 dark:border-blue-400/20">
                <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Ready to Test</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Send a message to test your agent
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="space-y-3">
              <div className={cn(
                "max-w-[85%] rounded-xl p-4 text-sm backdrop-blur-sm",
                message.role === 'user' 
                  ? "bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 ml-auto" 
                  : "bg-gradient-to-tr from-zinc-300/20 via-gray-400/20 to-transparent dark:from-zinc-300/10 dark:via-gray-400/10 border border-black/10 dark:border-white/20"
              )}>
                <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  {message.role === 'user' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"></div>
                      <span className="text-purple-700 dark:text-purple-300">You</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                      <span className="text-blue-700 dark:text-blue-300">Agent</span>
                    </>
                  )}
                </div>
                <div className="text-gray-900 dark:text-white leading-relaxed">{message.content}</div>
              </div>
              
              {message.role === 'agent' && message.thinking && (
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-4 flex items-center gap-1.5 transition-colors duration-300"
                >
                  <Brain className="w-3 h-3" />
                  {showThinking ? "Hide thinking" : "Show thinking"}
                </button>
              )}
              
              {message.role === 'agent' && message.thinking && showThinking && (
                <div className="ml-4 mr-4 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent dark:from-amber-400/10 dark:via-orange-400/10 backdrop-blur-sm rounded-xl border border-amber-500/20 dark:border-amber-400/20 p-4 text-xs font-mono text-amber-700 dark:text-amber-300 leading-relaxed whitespace-pre-line">
                  {message.thinking}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Input area */}
      <div className="p-6 border-t-[2px] border-black/5 dark:border-white/10 bg-gradient-to-t from-purple-500/5 via-pink-500/5 to-transparent dark:from-purple-400/5 dark:via-orange-200/5">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message to test your agent..."
            className="w-full bg-gradient-to-tr from-zinc-300/10 via-gray-400/10 to-transparent dark:from-zinc-300/5 dark:via-gray-400/5 backdrop-blur-sm rounded-xl border-[2px] border-black/5 dark:border-white/10 pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:ring-0 transition-all duration-300 hover:border-purple-500/30 dark:hover:border-purple-400/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className={cn(
              "absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-300",
              input.trim()
                ? "bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent dark:from-purple-400/20 dark:via-orange-200/20 border border-purple-500/30 dark:border-purple-400/30 text-purple-600 dark:text-purple-400 hover:bg-gradient-to-tr hover:from-purple-500/30 hover:via-pink-500/30 hover:to-transparent dark:hover:from-purple-400/30 dark:hover:via-orange-200/30 hover:scale-105"
                : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Footer gradient */}
      <div className="h-4 bg-gradient-to-t from-purple-500/5 via-pink-500/5 to-transparent dark:from-purple-400/5 dark:via-orange-200/5"></div>
    </div>
  );
}
