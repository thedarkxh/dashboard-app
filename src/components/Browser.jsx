import React, { useState, useRef, useEffect } from 'react';

// Safely resolve path module - may not be available in Vite-bundled renderer
let pathJoin;
try {
  const path = window.require ? window.require('path') : null;
  pathJoin = path ? path.join : null;
} catch (e) {
  pathJoin = null;
}

export const BROWSER_SERVICES = [
  { id: 'gemini', label: 'Gemini AI', url: 'https://gemini.google.com', color: 'from-blue-500 to-indigo-500', desc: 'Google Advanced Intelligence' },
  { id: 'notebooklm', label: 'NotebookLM', url: 'https://notebooklm.google.com', color: 'from-emerald-500 to-teal-500', desc: 'AI-Powered Research Notebook' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', color: 'from-red-500 to-rose-500', desc: 'Lofi & Study Background Media' },
  { id: 'mapple', label: 'Mapple.vip', url: 'https://mapple.vip', color: 'from-amber-500 to-orange-500', desc: 'Workspace Entertainment Hub' },
  { id: 'telegram', label: 'Telegram', url: 'https://web.telegram.org', color: 'from-sky-500 to-blue-500', desc: 'Synchronized Chat Channels' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com', color: 'from-pink-500 to-purple-500', desc: 'Social Workspace Feed' },
  { id: 'x', label: 'X / Twitter', url: 'https://x.com', color: 'from-gray-700 to-black', desc: 'Realtime Technology Streams' },
  { id: 'google', label: 'Google Search', url: 'https://www.google.com', color: 'from-blue-500 via-red-500 to-yellow-500', desc: 'Google Search Engine' },
];

export default function Browser({ searchUrl, onSearchProcessed, activeService, setActiveService, isFullscreen, onToggleFullscreen }) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [visitedServices, setVisitedServices] = useState(new Set([activeService]));
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const webviewRefs = useRef({});
  const spacePressed = useRef(false);
  const customSearchUrlRef = useRef(null);

  // Track which services have been visited (lazy-load webviews)
  useEffect(() => {
    setVisitedServices(prev => {
      if (prev.has(activeService)) return prev;
      const next = new Set(prev);
      next.add(activeService);
      return next;
    });
  }, [activeService]);

  // Absolute path to the webview preload script
  const cwd = (window.process && window.process.cwd) ? window.process.cwd() : (typeof process !== 'undefined' ? process.cwd() : '');
  const preloadFile = pathJoin
    ? pathJoin(cwd, 'src/preload/webview-preload.js')
    : `${cwd}/src/preload/webview-preload.js`;
  const webviewPreloadPath = `file://${preloadFile}`;

  // Handle search requests initiated from the sidebar
  useEffect(() => {
    if (searchUrl) {
      setActiveService('google');
      const googleWebview = webviewRefs.current['google'];
      if (googleWebview) {
        googleWebview.src = searchUrl;
      } else {
        customSearchUrlRef.current = searchUrl;
      }
      if (onSearchProcessed) {
        onSearchProcessed();
      }
    }
  }, [searchUrl]);

  // Global key down handler (handles Space+Tab triggering and navigation)
  const handleGlobalKeyDown = (e) => {
    if (!e) return;
    
    // Alt+Shift+F to toggle browser fullscreen
    if (e.altKey && e.shiftKey && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (onToggleFullscreen) {
        onToggleFullscreen();
      }
      return;
    }

    // Ctrl+I to toggle URL info bar
    if (e.ctrlKey && (e.key === 'i' || e.key === 'I' || e.code === 'KeyI')) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      // Get current URL from active webview
      const wv = webviewRefs.current[activeService];
      if (wv && typeof wv.getURL === 'function') {
        try { setCurrentUrl(wv.getURL()); } catch(err) { setCurrentUrl(''); }
      }
      setShowUrlBar(prev => !prev);
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      spacePressed.current = true;
    }

    if (e.key === 'Tab' && spacePressed.current) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      setShowSwitcher(prev => {
        if (!prev) {
          const currentIdx = BROWSER_SERVICES.findIndex(s => s.id === activeService);
          setFocusedIndex(currentIdx);
        }
        return !prev;
      });
    }

    if (showSwitcher) {
      if (e.key === 'ArrowRight') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % BROWSER_SERVICES.length);
      } else if (e.key === 'ArrowLeft') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + BROWSER_SERVICES.length) % BROWSER_SERVICES.length);
      } else if (e.key === 'Enter') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        setActiveService(BROWSER_SERVICES[focusedIndex].id);
        setShowSwitcher(false);
      } else if (e.key === 'Escape') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        setShowSwitcher(false);
      }
    }
  };

  // Global key up handler
  const handleGlobalKeyUp = (e) => {
    if (!e) return;
    if (e.key === ' ' || e.code === 'Space') {
      spacePressed.current = false;
    }
  };

  // 1. Hook up global host key listeners
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [showSwitcher, focusedIndex, activeService]);

  const handleIpcMessage = (event) => {
    if (event.channel === 'webview-keydown') {
      const e = event.args[0];
      // Dispatch a native KeyboardEvent so global window listeners (like App.jsx F11) can catch it naturally
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(keyboardEvent);
    } else if (event.channel === 'webview-keyup') {
      handleGlobalKeyUp(event.args[0]);
    }
  };

  // 2. Register webview reference and hook up listeners once
  const registerWebviewRef = (id, el) => {
    if (el) {
      webviewRefs.current[id] = el;
      if (id === 'google' && customSearchUrlRef.current) {
        el.src = customSearchUrlRef.current;
        customSearchUrlRef.current = null;
      }
      if (!el.dataset.listenerRegistered) {
        el.dataset.listenerRegistered = 'true';
        el.addEventListener('ipc-message', handleIpcMessage);
      }
    }
  };

  const handleSelectTab = (id) => {
    setActiveService(id);
    setShowSwitcher(false);
  };

  // 3. Manage webview focus/blur when the switcher overlay toggles to prevent crossover key leaks!
  useEffect(() => {
    const webview = webviewRefs.current[activeService];
    if (!webview) return;
    try {
      if (showSwitcher) {
        webview.blur();
      } else {
        setTimeout(() => {
          try {
            const activeWebview = webviewRefs.current[activeService];
            if (activeWebview) activeWebview.focus();
          } catch (err) {}
        }, 100);
      }
    } catch (err) {}
  }, [showSwitcher, activeService]);

  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in overflow-hidden relative">
      
      {/* 1. Space+Tab Custom Overlay Switcher (Premium OS Layout) */}
      {showSwitcher && (
        <div className="absolute inset-0 bg-[#060608]/90 z-40 flex items-center justify-center animate-fade-in">
          <div className="glass-panel p-8 rounded-3xl max-w-4xl w-full border border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">Hermes Workspace Switcher</h3>
                <p className="text-xs text-gray-400 mt-0.5">Hold Space + press Tab to toggle. Use Arrow keys and Enter, or click to switch.</p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-violet-500/20 text-violet-400 px-3 py-1 rounded-full border border-violet-500/20">
                SPACE + TAB SWITCHER
              </span>
            </div>

            {/* Horizontal Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-y-auto max-h-[350px] p-1">
              {BROWSER_SERVICES.map((service, index) => {
                const isFocused = focusedIndex === index;
                const isActive = activeService === service.id;
                return (
                  <div
                    key={service.id}
                    onClick={() => handleSelectTab(service.id)}
                    className={`glass-card p-5 rounded-2xl cursor-pointer flex flex-col justify-between h-36 border transition-colors duration-150 ${
                      isFocused
                        ? 'border-violet-500 bg-violet-600/10 shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.03] -translate-y-1'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${service.color} shadow-md`}></span>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-white tracking-wide">{service.label}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{service.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-[10px] text-gray-500 font-semibold tracking-widest uppercase border-t border-white/5 pt-4">
              Press ESC or tap Space+Tab to close
            </div>
          </div>
        </div>
      )}

      {/* Ctrl+I URL info bar */}
      {showUrlBar && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16161a]/95 border border-white/10 shadow-lg">
            <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="flex-1 text-xs text-gray-300 font-mono truncate select-all">{currentUrl || 'No URL loaded'}</span>
            <button
              onClick={() => { if (currentUrl) navigator.clipboard.writeText(currentUrl); }}
              className="text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded hover:bg-violet-500/20 transition-colors uppercase tracking-wider"
            >Copy</button>
            <button
              onClick={() => setShowUrlBar(false)}
              className="text-gray-500 hover:text-white p-0.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1.5 text-[9px] text-gray-500 font-semibold tracking-widest uppercase">
            <span>Ctrl+I to close</span>
            <span>•</span>
            <span>Alt+Shift+F fullscreen</span>
          </div>
        </div>
      )}

      {/* 2. Embedded Webview Containers */}
      <div className={`flex-1 overflow-hidden relative bg-[#0e0e12] w-full h-full ${
        isFullscreen ? 'rounded-none' : 'rounded-2xl border border-white/5 shadow-2xl'
      }`}>
        {BROWSER_SERVICES.filter(s => visitedServices.has(s.id)).map((service) => (
          <div
            key={service.id}
            className="absolute inset-0 w-full h-full"
            style={{ visibility: activeService === service.id ? 'visible' : 'hidden' }}
          >
            <webview
              ref={(el) => registerWebviewRef(service.id, el)}
              src={service.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              partition="persist:workspace"
              preload={webviewPreloadPath}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
