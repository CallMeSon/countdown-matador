'use client';

import React, { useRef, useEffect } from 'react';
import { useApp } from '@/context/TimerContext';

export default function EventLog() {
  const { state, dispatch } = useApp();
  const { eventLog } = state;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eventLog.length]);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'action': return 'text-cyan-400';
      case 'warning': return 'text-yellow-400';
      case 'system': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return '▶';
      case 'warning': return '⚠';
      case 'system': return '⚙';
      default: return '•';
    }
  };

  const handleClearLog = () => {
    dispatch({ type: 'CLEAR_LOG' });
  };

  const handleExportCSV = () => {
    const header = 'Timestamp,Type,Message\n';
    const rows = eventLog.map(e => 
      `"${new Date(e.timestamp).toISOString()}","${e.type}","${e.message.replace(/"/g, '""')}"`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matador-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleClearLog}
          className="px-3 py-1.5 bg-matador-border hover:bg-gray-600 rounded text-xs font-medium transition-colors"
        >
          🗑 Hapus Log
        </button>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 bg-matador-border hover:bg-gray-600 rounded text-xs font-medium transition-colors"
          disabled={eventLog.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="max-h-64 overflow-y-auto bg-matador-panel rounded-lg border border-matador-border p-2 space-y-1 scrollbar-hide"
      >
        {eventLog.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">
            Belum ada aktivitas tercatat.
          </div>
        ) : (
          eventLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 text-xs py-1 border-b border-matador-border/50 last:border-b-0">
              <span className="text-gray-500 font-mono whitespace-nowrap">
                [{formatTimestamp(entry.timestamp)}]
              </span>
              <span className={`${getTypeStyle(entry.type)} whitespace-nowrap`}>
                {getTypeIcon(entry.type)}
              </span>
              <span className="text-gray-300">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
