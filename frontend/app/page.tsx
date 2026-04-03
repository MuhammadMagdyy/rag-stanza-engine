"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileUp, Database, Sparkles, Activity, ShieldCheck, Trash2, FileText, Lightbulb, Moon, Sun } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function StanzaChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '### MATRIX ONLINE\nVector Engine is active. Please upload your PDF stanzas to begin.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [library, setLibrary] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const count = fileList.length;
    const uploadedNames = Array.from(fileList).map(f => f.name);
    setIsUploading(true);

    const formData = new FormData();
    Array.from(fileList).forEach(file => formData.append('files', file));

    try {
      // Switched to localhost for stable connection
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setLibrary(prev => [...new Set([...prev, ...uploadedNames])]);
        const fileListString = uploadedNames.map(name => `• \`${name}\``).join('\n');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Ingestion Successful:** ${count} documents added.\n\n**Added to Vault:**\n${fileListString}`
        }]);

        setSuggestions([
          "Summarize the core findings.",
          "Identify key technical risks.",
          "Analyze cross-document trends."
        ]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "### Error\nMatrix connection failed." }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (customMsg?: string) => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      // Switched to localhost for stable connection
      const res = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "### Retrieval Failure\nNo response from Matrix." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen w-full p-6 gap-6 font-sans antialiased transition-colors duration-300 ${darkMode ? 'bg-[#121212] text-white' : 'bg-[#f3f4f6] text-black'}`}>

      {/* SIDEBAR */}
      <aside className={`w-80 flex flex-col border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} strokeWidth={3} className={darkMode ? 'text-purple-400' : 'text-emerald-500'} />
            <h2 className="text-sm font-black tracking-[0.3em] uppercase">Stanza Matrix</h2>
          </div>
          <button onClick={toggleDarkMode} className="p-2 border-2 border-black hover:bg-yellow-400 transition-colors bg-white text-black">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`flex items-center justify-center gap-3 w-full py-4 border-4 border-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 mb-8 transition-all ${
            darkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-[#4ade80] hover:bg-emerald-400 text-black'
          }`}
        >
          {isUploading ? <Loader2 className="animate-spin" size={18} /> : <FileUp size={18} strokeWidth={3} />}
          {isUploading ? "MAPPING..." : "UPLOAD TO MATRIX"}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleUpload} multiple hidden accept=".pdf" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest border-b-2 pb-2 ${darkMode ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-100'}`}>
            <FileText size={14} />
            <span>Vault ({library.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            {library.map((file, idx) => (
              <div key={idx} className={`group flex items-center justify-between p-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors ${darkMode ? 'bg-[#2a2a2a] hover:bg-[#333]' : 'bg-gray-50 hover:bg-white'}`}>
                <span className="text-[10px] font-bold truncate pr-2">{file}</span>
                <button onClick={() => setLibrary(l => l.filter(f => f !== file))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-6 p-4 border-4 border-black italic text-[10px] font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-purple-900/30' : 'bg-yellow-100'}`}>
          <div className="flex items-center gap-2 mb-1 font-black">
             <Activity size={12} />
             <span>TELEMETRY</span>
          </div>
          <p className={darkMode ? 'text-purple-300' : 'text-green-600'}>NODE: localhost:8000</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 flex flex-col border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <header className={`border-b-4 border-black p-6 flex justify-between items-center ${darkMode ? 'bg-[#222]' : 'bg-[#f8fafc]'}`}>
          <div className="flex items-center gap-3">
            <Sparkles className="text-blue-500 animate-pulse" />
            <h1 className="text-3xl font-serif italic font-black tracking-tight">Stanza Studio</h1>
          </div>
          <div className="flex items-center gap-2 bg-black text-white px-3 py-1 text-[10px] font-bold tracking-widest uppercase border-2 border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
            V1.6 CORE
          </div>
        </header>

        <div ref={scrollRef} className={`flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar ${darkMode ? 'bg-[radial-gradient(#333_1px,transparent_1px)]' : 'bg-[radial-gradient(#d1d5db_1px,transparent_1px)]'} [background-size:20px_20px]`}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                msg.role === 'user'
                  ? (darkMode ? 'bg-purple-700 text-white' : 'bg-[#3b82f6] text-white')
                  : (darkMode ? 'bg-[#2a2a2a] text-white' : 'bg-white text-black')
              }`}>
                <div className="flex items-center gap-2 mb-3 border-b-2 border-current pb-2 opacity-70">
                  {msg.role === 'user' ? <User size={14} strokeWidth={3} /> : <Bot size={14} strokeWidth={3} />}
                  <span className="text-[10px] font-black uppercase">{msg.role}</span>
                </div>
                <div className="markdown-content text-sm font-bold leading-relaxed space-y-3">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="px-6 py-4 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse inline-block w-fit">
              <span className="text-[10px] font-black uppercase tracking-tighter">Querying Matrix...</span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className={`p-8 border-t-4 border-black ${darkMode ? 'bg-[#222]' : 'bg-[#fafafa]'}`}>
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
            {suggestions.map((text, i) => (
              <button key={i} onClick={() => handleSend(text)} className={`whitespace-nowrap px-4 py-2 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 ${darkMode ? 'bg-[#333] hover:bg-purple-900 text-white' : 'bg-white hover:bg-blue-50 text-black'}`}>
                <Lightbulb size={12} className="text-yellow-400" /> {text}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="SEARCH THE MATRIX..."
              className={`flex-1 p-5 border-4 border-black focus:outline-none font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${darkMode ? 'bg-[#333] text-white' : 'bg-white text-black'}`}
            />
            <button onClick={() => handleSend()} className={`p-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all ${darkMode ? 'bg-purple-600 text-white' : 'bg-black text-white hover:bg-blue-600'}`}>
              <Send size={24} strokeWidth={3} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}