import React, { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import Terminal from '../components/Terminal';
import Browser, { BROWSER_SERVICES } from '../components/Browser';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'terminal', label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'browser', label: 'Browser Hub', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchUrl, setSearchUrl] = useState(null);
  const [searchVal, setSearchVal] = useState('');
  const [activeService, setActiveService] = useState('gemini');
  const [browserFullscreen, setBrowserFullscreen] = useState(false);

  const toggleBrowserFullscreen = () => setBrowserFullscreen(prev => !prev);

  // Global F11 listener for native app fullscreen
  useEffect(() => {
    const handleAppKeyDown = (e) => {
      if (e.key === 'F11' || e.code === 'F11') {
        e.preventDefault();
        if (window.electronAPI && window.electronAPI.toggleFullscreen) {
          window.electronAPI.toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleAppKeyDown);
    return () => window.removeEventListener('keydown', handleAppKeyDown);
  }, []);

  // Exit browser fullscreen when switching away from browser tab
  useEffect(() => {
    if (activeTab !== 'browser') setBrowserFullscreen(false);
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    const query = encodeURIComponent(searchVal.trim());
    setSearchUrl(`https://www.google.com/search?q=${query}`);
    setSearchVal('');
    setActiveTab('browser');
  };
  
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'terminal':
        return <Terminal />;
      case 'browser':
        return (
          <Browser 
            searchUrl={searchUrl} 
            onSearchProcessed={() => setSearchUrl(null)} 
            activeService={activeService}
            setActiveService={setActiveService}
            isFullscreen={browserFullscreen}
            onToggleFullscreen={toggleBrowserFullscreen}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-[#e2e8f0] overflow-hidden">
      {/* Premium Sidebar — hidden in browser fullscreen */}
      {!browserFullscreen && (
      <aside className={`glass-panel border-r border-[rgba(255,255,255,0.05)] flex flex-col justify-between z-20 sidebar-transition w-64 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute h-full'
      }`}>
        <div className="w-64 flex-1 flex flex-col">
          {/* App Logo / Title */}
          <div className="p-6 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]"></span>
                HERMES DOCK
              </h1>
              <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-widest">Agy & Hermes OS</p>
            </div>
            {/* Collapse button inside sidebar */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              title="Collapse Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Sidebar Google Search */}
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search with Google..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/10 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-violet-500/50 focus:shadow-[0_0_12px_rgba(139,92,246,0.15)] transition-all duration-300"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-violet-400 group-focus-within:text-violet-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-focus-within:flex items-center pointer-events-none">
                <span className="text-[9px] font-bold text-violet-400/70 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest">
                  Enter
                </span>
              </div>
            </form>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="space-y-1.5">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-150 group text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30 text-white font-medium shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <svg
                      className={`h-5 w-5 ${isActive ? 'text-violet-400' : 'text-gray-500 group-hover:text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                    <span className="flex-1">{tab.label}</span>
                  </button>

                  {/* Render small tiles grid under Browser link if active */}
                  {tab.id === 'browser' && (
                    <div className="pl-4 pr-1 py-1 grid grid-cols-2 gap-1.5">
                      {BROWSER_SERVICES.map((service) => {
                        const isServiceActive = activeTab === 'browser' && activeService === service.id;
                        return (
                          <button
                            key={service.id}
                            onClick={() => {
                              setActiveTab('browser');
                              setActiveService(service.id);
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition-colors duration-150 group/tile ${
                              isServiceActive
                                ? 'bg-violet-600/25 border-violet-500/40 text-white shadow-sm'
                                : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                            }`}
                            title={service.desc}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 bg-gradient-to-r ${service.color}`}></span>
                            <span className="text-[10px] font-medium tracking-wide truncate">{service.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Info / Status bottom panel */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-black/20 w-64">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-white shadow-md">
              S
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Samar</h4>
              <p className="text-xs text-violet-400 font-medium">MEXT Aspirant 2026</p>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-radial-gradient">
        {/* Floating Expand Sidebar Button when collapsed (hidden in browser fullscreen) */}
        {!isSidebarOpen && !browserFullscreen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:text-white hover:bg-violet-600/40 shadow-lg active:scale-95 transition-colors animate-fade-in"
            title="Expand Sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Subtle decorative gradient — lightweight, no blur */}
        {!browserFullscreen && (
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/[0.03] rounded-full pointer-events-none"></div>
        )}

        {/* Content Container — no padding in browser fullscreen */}
        <div className={`flex-1 overflow-hidden relative z-10 flex flex-col ${browserFullscreen ? 'p-0' : 'p-6'}`}>
          {renderActiveComponent()}
        </div>
      </main>
    </div>
  );
}
