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
        className="fixed bottom-6 right-6 z-50 bg-cyan-600 text-white px-5 py-3 rounded-full flex items-center gap-2 font-bold text-sm squishy-shadow-lg hover:scale-105 transition-transform duration-200 active:scale-[0.97]"
      >
        <img src="/spike-mascot.png" alt="Spike" className="w-6 h-6 object-contain" />
        Ask Spike
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-white backdrop-blur-md rounded-2xl border border-slate-200 squishy-shadow-lg overflow-hidden flex flex-col h-[500px]">
      <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/spike-mascot.png" alt="Spike" className="w-8 h-8 object-contain" />
          <div>
            <h4 className="font-bold text-sm text-slate-800 leading-tight">Spike AI Tutor</h4>
            <div className="text-[10px] text-cyan-600 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
            </div>
          </div>
        </div>
        <button onClick={toggleOpen} className="text-slate-400 hover:text-slate-600 transition-colors">
          <Minus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center mt-4">
            Stuck on this question? Ask me to explain it differently!
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-cyan-600 text-white ml-auto rounded-br-sm'
                : 'bg-slate-50 text-slate-700 mr-auto border border-slate-200 rounded-bl-sm'
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

      <div className="p-3 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center bg-white rounded-full border border-slate-200 px-3 py-1.5 focus-within:border-cyan-600 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="text-white bg-cyan-600 hover:bg-cyan-700 p-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
