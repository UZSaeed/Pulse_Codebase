'use client';

import { useState } from 'react';
import { MessageCircle, Send, Loader2, Minus } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AITutorOverlayProps {
  questionStem: string;
  explanation: string;
  passage?: string | null;
  choices?: unknown;
}

export function AITutorOverlay({ questionStem, explanation, passage, choices }: AITutorOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/questions/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionStem, explanation, passage, choices, userMessage: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply || data.error || 'No response.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error connecting to tutor.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 bg-neon-blue text-navy-900 px-5 py-3 rounded-full flex items-center gap-2 font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(0,216,232,0.4)] hover:scale-105 transition-transform duration-200"
      >
        <MessageCircle className="w-5 h-5" />
        Ask Spike
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-navy-800/95 backdrop-blur-md rounded-2xl border border-navy-700 shadow-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-navy-800 bg-navy-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-purple-500 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,216,232,0.3)]">🤖</div>
          <div>
            <h4 className="font-bold text-sm text-white leading-tight">Spike AI Tutor</h4>
            <div className="text-[10px] text-neon-blue font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" /> Online
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-slate-400">
          <button onClick={toggleOpen} className="hover:text-white transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center mt-4">
            Stuck on this question? Ask me to clarify the answer or explain the concepts behind it!
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl text-sm leading-relaxed max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-neon-blue/20 text-neon-blue ml-auto border border-neon-blue/30 rounded-br-sm'
                : 'bg-navy-900 text-slate-300 mr-auto border border-navy-700 rounded-bl-sm'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-navy-900 border-t border-navy-700">
        <div className="flex items-center bg-navy-800 rounded-full border border-navy-600 px-3 py-1.5 focus-within:border-neon-blue/50 focus-within:ring-1 focus-within:ring-neon-blue/50 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="text-white bg-neon-blue/80 hover:bg-neon-blue p-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-navy-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
