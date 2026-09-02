'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';

export default function OperatorNotes() {
  const { state, dispatch } = useApp();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_OPERATOR_NOTES', payload: e.target.value });
  };

  return (
    <div className="bg-matador-card border border-matador-border p-4 rounded-lg space-y-2 text-white h-full flex flex-col">
      <h3 className="text-lg font-semibold">Catatan Operator</h3>
      <textarea 
        value={state.operatorNotes || ''}
        onChange={handleChange}
        placeholder="Tulis catatan rundown, teknis, dll..."
        className="flex-1 w-full bg-matador-panel border border-matador-border rounded p-3 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
