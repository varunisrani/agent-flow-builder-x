
import { useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
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
      "fixed top-0 right-0 h-screen w-96 glass border-l border-white/10 transition-transform duration-300 flex flex-col z-20",
      visible ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Test Your Agent
        </h2>
        <button 
          onClick={onClose}
          className="rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Send a message to test your agent
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="space-y-2">
              <div className={cn(
                "max-w-[80%] rounded-lg p-3 text-sm",
                message.role === 'user' 
                  ? "bg-accent/20 ml-auto" 
                  : "glass"
              )}>
                <div className="text-xs text-muted-foreground mb-1">
                  {message.role === 'user' ? 'You' : 'Agent'}
                </div>
                <div>{message.content}</div>
              </div>
              
              {message.role === 'agent' && message.thinking && (
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="text-xs text-primary hover:text-primary/80 ml-2"
                >
                  {showThinking ? "Hide thinking" : "Show thinking"}
                </button>
              )}
              
              {message.role === 'agent' && message.thinking && showThinking && (
                <div className="glass rounded-lg p-3 text-xs font-mono text-muted-foreground">
                  {message.thinking}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-background rounded-full border border-border pl-4 pr-10 py-2 text-sm"
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
              "absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors",
              input.trim()
                ? "text-primary hover:bg-white/10"
                : "text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
