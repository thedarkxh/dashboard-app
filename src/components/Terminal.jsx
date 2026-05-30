import React, { useState, useEffect, useRef, memo } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalInstance = memo(({ tabId, isActive }) => {
  const containerRef = useRef(null);
  const termState = useRef({ term: null, fitAddon: null });

  useEffect(() => {
    let isCancelled = false;
    let initTimeout = null;
    let fitTimeout = null;

    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      scrollback: 2000,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5,
      smoothScrollDuration: 0,
      drawBoldTextInBright: true,
      theme: {
        background: '#0d0d11',
        foreground: '#f3f4f6',
        cursor: '#8b5cf6',
        selectionBackground: 'rgba(139, 92, 246, 0.3)',
        black: '#1f2937',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#f3f4f6',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    termState.current = { term, fitAddon };

    // Subscribe to incoming PTY data
    let unsubscribePty = null;
    if (window.electronAPI && window.electronAPI.onPtyData) {
      unsubscribePty = window.electronAPI.onPtyData((payload) => {
        const { tabId: incomingId, data } = payload || {};
        if (incomingId === tabId && data && !isCancelled) {
          term.write(data);
        }
      });
    }

    // Typing inside terminal
    term.onData((data) => {
      if (!isCancelled && window.electronAPI && window.electronAPI.writePty) {
        window.electronAPI.writePty(tabId, data);
      }
    });

    // Auto-copy on selection
    term.onSelectionChange(() => {
      if (!isCancelled && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection());
      }
    });

    const initTerminal = () => {
      if (isCancelled) return;
      
      const el = containerRef.current;
      if (!el) return;
      
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        initTimeout = setTimeout(initTerminal, 100);
        return;
      }

      try {
        term.open(el);
        
        fitTimeout = setTimeout(() => {
          if (isCancelled) return;
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions();

          if (window.electronAPI && window.electronAPI.startPty) {
            window.electronAPI.startPty({ 
              tabId, 
              cols: dims ? dims.cols : 80, 
              rows: dims ? dims.rows : 24 
            });
          }
        }, 20);
      } catch (err) {
        console.warn('Terminal init failed, retrying:', err);
        initTimeout = setTimeout(initTerminal, 100);
      }
    };

    initTimeout = setTimeout(initTerminal, 50);

    // Resize listener just for this tab
    const handleResize = () => {
      if (isCancelled) return;
      try {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && window.electronAPI && window.electronAPI.resizePty) {
          window.electronAPI.resizePty(tabId, dims.cols, dims.rows);
        }
      } catch (e) {}
    };
    
    let resizeTimer = null;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };
    window.addEventListener('resize', debouncedResize);

    return () => {
      isCancelled = true;
      clearTimeout(initTimeout);
      clearTimeout(fitTimeout);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedResize);
      if (unsubscribePty) unsubscribePty();
      
      if (window.electronAPI && window.electronAPI.killPty) {
        window.electronAPI.killPty(tabId);
      }
      try { term.dispose(); } catch (e) {}
    };
  }, [tabId]);

  // Handle focus and fit when becoming active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        const { term, fitAddon } = termState.current;
        if (term && fitAddon) {
          try {
            fitAddon.fit();
            term.focus();
          } catch (e) {}
        }
      }, 50);
    }
  }, [isActive]);

  return (
    <div
      className="w-full h-full"
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <div ref={containerRef} className="w-full h-full terminal-container" />
    </div>
  );
});

export default function Terminal() {
  const [tabs, setTabs] = useState([
    { id: 'term-1', name: 'Shell 1' }
  ]);
  const [activeTabId, setActiveTabId] = useState('term-1');

  const handleAddTab = () => {
    const newId = `term-${Date.now()}`;
    const newTab = { id: newId, name: `Shell ${tabs.length + 1}` };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (tabs.length === 1) return;

    const filteredTabs = tabs.filter(t => t.id !== tabId);
    setTabs(filteredTabs);

    if (activeTabId === tabId) {
      const activeIdx = tabs.findIndex(t => t.id === tabId);
      const nextActiveIdx = Math.max(0, activeIdx - 1);
      setActiveTabId(filteredTabs[nextActiveIdx].id);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in space-y-4">
      {/* Title / Headers / Tabs Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Workspace Terminal Multiplexer
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Multiplexed high-performance local shell tabs.</p>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto p-1 bg-black/40 rounded-xl border border-white/5 max-w-[280px] md:max-w-md scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors border shrink-0 ${
                    isActive
                      ? 'bg-violet-600/25 border-violet-500/40 text-white shadow-sm'
                      : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <span>{tab.name}</span>
                  {tabs.length > 1 && (
                    <span
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="hover:bg-rose-500/20 hover:text-rose-400 p-0.5 rounded transition-colors ml-1.5"
                      title="Close Tab"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Tab Button */}
          <button
            onClick={handleAddTab}
            className="p-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:text-white hover:bg-violet-600/40 shadow-md active:scale-95 transition-colors"
            title="Open New Shell Session"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal Border Panels */}
      <div className="flex-1 glass-card rounded-2xl p-4 overflow-hidden border border-white/5 shadow-xl relative bg-[#0d0d11]">
        {tabs.map((tab) => (
          <TerminalInstance 
            key={tab.id} 
            tabId={tab.id} 
            isActive={activeTabId === tab.id} 
          />
        ))}
      </div>
    </div>
  );
}
