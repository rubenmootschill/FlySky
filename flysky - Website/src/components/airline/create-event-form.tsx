"use client";

import React from 'react';
import { useForm } from 'react-hook-form';

type FormValues = {
  title: string;
  body: string;
  severity: 'INFO' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
};

export default function CreateNotamForm() {
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      severity: 'INFO',
    },
  });

  const onSubmit = async (data: FormValues) => {
    await fetch('/api/airline/notams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Create a NOTAM</h3>
      <div>
        <label htmlFor="title" className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
        <input
          id="title"
          {...register('title', { required: true })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NOTAM Title"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-xs font-semibold text-slate-700 mb-1">Body</label>
        <textarea
          id="body"
          {...register('body', { required: true })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter NOTAM details..."
          rows={3}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
        <select {...register('severity', { required: true })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="INFO">Info</option>
          <option value="ADVISORY">Advisory</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      <button type="submit" className="btn-primary w-full">Post NOTAM</button>
    </form>
  );
}