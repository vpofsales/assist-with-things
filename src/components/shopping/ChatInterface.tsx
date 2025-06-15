
import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatInterfaceProps {
  conversationHistory: Message[];
  className?: string;
}

const ChatInterface = ({ conversationHistory, className }: ChatInterfaceProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversationHistory]);

  return (
    <ScrollArea ref={scrollAreaRef} className={`p-4 ${className}`}>
      <div className="space-y-4">
        {conversationHistory.map((msg, index) => {
          if (!msg.parts?.[0]?.text) return null;
          
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md rounded-lg py-2 px-4 shadow-md ${
                isUser ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-white'
              }`}>
                <p className="text-sm">{msg.parts[0].text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default ChatInterface;
