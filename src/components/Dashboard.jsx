import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [activeAgent, setActiveAgent] = useState('hermes'); // hermes or agy
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [replyTexts, setReplyTexts] = useState({});

  // Fetch tasks from local IPC JSON and setup polling
  const loadTasks = async () => {
    if (window.electronAPI && window.electronAPI.readTasks) {
      const data = await window.electronAPI.readTasks();
      setTasks(data);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  const saveTasks = async (newTasks) => {
    setTasks(newTasks);
    if (window.electronAPI && window.electronAPI.writeTasks) {
      await window.electronAPI.writeTasks(newTasks);
    }
  };

  // Countdown timer for MEXT 2026
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const targetDate = new Date('2026-06-15T00:00:00');
    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate - now;
      if (difference <= 0) {
        setTimeLeft('EXAM TIME');
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      status: 'PENDING', // PENDING, IN_PROGRESS, NEEDS_INFO, DONE
      priority: newTaskPriority,
      agent: activeAgent,
      infoRequest: '',
      createdAt: new Date().toISOString()
    };
    saveTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const handleReplySubmit = (e, id) => {
    e.preventDefault();
    const replyText = replyTexts[id];
    if (!replyText || !replyText.trim()) return;
    
    const updatedTasks = tasks.map(task => 
      task.id === id 
        ? { ...task, status: 'PENDING', text: `${task.text}\n[User Reply]: ${replyText.trim()}`, infoRequest: '' }
        : task
    );
    saveTasks(updatedTasks);
    setReplyTexts(prev => ({ ...prev, [id]: '' }));
  };

  const toggleTask = (id) => {
    const updatedTasks = tasks.map(task => 
      task.id === id 
        ? { ...task, status: task.status === 'DONE' ? 'PENDING' : 'DONE' } 
        : task
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (id) => {
    saveTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-2 animate-fade-in">
      {/* Top Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MEXT Countdown */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden border border-violet-500/20 shadow-[0_4px_20px_rgba(139,92,246,0.05)] col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-24 h-24 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full">Scholarship Track</span>
            <h2 className="text-2xl font-bold mt-3 text-white">MEXT Exam Countdown</h2>
            <p className="text-gray-400 text-sm mt-1">Preparing for departure to Japan in 2026.</p>
          </div>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 font-mono tracking-tight">
              {timeLeft || 'Calculating...'}
            </span>
            <span className="text-gray-500 text-xs font-medium">remaining</span>
          </div>
        </div>

        {/* Quick System Stats */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">System Integration</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Ad-blocker
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-semibold border border-emerald-500/20">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> ProtonVPN
              </span>
              <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-semibold border border-amber-500/20">SKIPPED</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500"></span> OAuth Integrations
              </span>
              <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-md font-semibold border border-violet-500/20">CONNECTED</span>
            </div>
          </div>
          <div className="pt-4 border-t border-[rgba(255,255,255,0.05)] mt-4 flex justify-between items-center text-xs text-gray-500">
            <span>Obsidian Notes Connected</span>
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Agent To-Do Center */}
      <div className="glass-card rounded-2xl border border-[rgba(255,255,255,0.05)] overflow-hidden shadow-xl">
        <div className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-white/[0.01] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Agent Workspace Task Manager
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Tasks delegated to your autonomous assistants.</p>
          </div>

          {/* Toggle buttons for AGY and Hermes */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveAgent('hermes')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeAgent === 'hermes'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hermes Agent
            </button>
            <button
              onClick={() => setActiveAgent('agy')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200 ${
                activeAgent === 'agy'
                  ? 'bg-fuchsia-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Agy Agent
            </button>
          </div>
        </div>

        {/* Task Adding Form */}
        <form onSubmit={handleAddTask} className="p-6 border-b border-[rgba(255,255,255,0.03)] bg-white/[0.005] flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder={`Instruct ${activeAgent === 'hermes' ? 'Hermes' : 'Agy'} to manage/add a new task...`}
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1 glass-input text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-xs px-3 text-gray-300 focus:outline-none focus:border-violet-500"
            >
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold text-white transition-all shadow-md ${
                activeAgent === 'hermes'
                  ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/10'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-600/10'
              }`}
            >
              Delegate Task
            </button>
          </div>
        </form>

        {/* Tasks List */}
        <div className="divide-y divide-white/[0.02] max-h-[350px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No tasks delegated to {activeAgent === 'hermes' ? 'Hermes' : 'Agy'} yet.</div>
          ) : (
            tasks.map(task => {
              const priorityColor = task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
              const isDone = task.status === 'DONE';
              const isNeedsInfo = task.status === 'NEEDS_INFO';
              const isInProgress = task.status === 'IN_PROGRESS';
              
              return (
                <div key={task.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.005] group transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 h-5 w-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          isDone
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-white/20 hover:border-violet-500 hover:bg-violet-500/10'
                        }`}
                      >
                        {isDone && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 flex flex-col">
                        <span className={`text-sm transition-all duration-150 whitespace-pre-wrap ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                          {task.text}
                        </span>
                        {isNeedsInfo && (
                          <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                            <span className="font-bold">Agent Query:</span> {task.infoRequest || 'Requires clarification to proceed.'}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end max-w-[200px]">
                      {isInProgress && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                          Running
                        </span>
                      )}
                      {isNeedsInfo && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Waiting
                        </span>
                      )}
                      {!isDone && !isInProgress && !isNeedsInfo && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Pending
                        </span>
                      )}
                      <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full ${priorityColor}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                        task.agent === 'hermes'
                          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/10'
                          : 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/10'
                      }`}>
                        {task.agent}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {isNeedsInfo && (
                    <form onSubmit={(e) => handleReplySubmit(e, task.id)} className="ml-8 flex gap-2">
                      <input
                        type="text"
                        placeholder="Provide required information..."
                        value={replyTexts[task.id] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                        className="flex-1 glass-input text-xs py-1.5"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors">
                        Reply
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
