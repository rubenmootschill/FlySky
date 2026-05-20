'use client';

import { useState, useEffect } from 'react';
import { Ban, AlertCircle, Shield } from 'lucide-react';

interface Pilot {
  id: string;
  callsign: string;
  firstName: string;
  lastName: string;
  status: string;
  totalFlights: number;
  totalHours: number;
  joinedAt: string;
  banReason?: string;
  user: { email: string };
  rank: { name: string; code: string } | null;
}

export default function AdminPilotsPage() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPilot, setSelectedPilot] = useState<Pilot | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPilots();
  }, []);

  const fetchPilots = async () => {
    try {
      const res = await fetch('/api/admin/pilots');
      if (res.ok) {
        const data = await res.json();
        setPilots(data);
      }
    } catch (error) {
      console.error('Failed to fetch pilots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedPilot || !actionType) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/pilots/${selectedPilot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'ban' ? 'RETIRED' : 'SUSPENDED',
          banReason: reason,
        }),
      });

      if (res.ok) {
        const updatedPilot = await res.json();
        setPilots(
          pilots.map((p) => (p.id === updatedPilot.id ? updatedPilot : p))
        );
        setSelectedPilot(null);
        setActionType(null);
        setReason('');
      }
    } catch (error) {
      console.error('Failed to update pilot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnban = async (pilotId: string) => {
    try {
      const res = await fetch(`/api/admin/pilots/${pilotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', banReason: null }),
      });

      if (res.ok) {
        const updatedPilot = await res.json();
        setPilots(
          pilots.map((p) => (p.id === updatedPilot.id ? updatedPilot : p))
        );
      }
    } catch (error) {
      console.error('Failed to unban pilot:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-900 text-green-200';
      case 'SUSPENDED':
        return 'bg-yellow-900 text-yellow-200';
      case 'RETIRED':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pilot Management</h1>

      {selectedPilot && actionType && (
        <div className="card p-6 bg-red-900/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={24} className="text-red-400" />
            {actionType === 'ban' ? 'Ban Pilot' : 'Suspend Pilot'}
          </h2>
          <div className="space-y-4">
            <p>
              <strong>Pilot:</strong> {selectedPilot.callsign} ({selectedPilot.firstName}{' '}
              {selectedPilot.lastName})
            </p>
            <p>
              <strong>Email:</strong> {selectedPilot.user.email}
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                className="input w-full"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  actionType === 'ban'
                    ? 'Reason for permanent ban...'
                    : 'Reason for suspension...'
                }
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAction}
                disabled={submitting || !reason}
                className="btn-danger flex-1"
              >
                {submitting ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setSelectedPilot(null);
                  setActionType(null);
                  setReason('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading pilots...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-3 px-4">Callsign</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Rank</th>
                <th className="text-left py-3 px-4">Flights</th>
                <th className="text-left py-3 px-4">Hours</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="border-b border-gray-700 table-row-hover">
                  <td className="py-3 px-4 font-bold">{pilot.callsign}</td>
                  <td className="py-3 px-4">
                    {pilot.firstName} {pilot.lastName}
                  </td>
                  <td className="py-3 px-4">{pilot.rank?.name || 'N/A'}</td>
                  <td className="py-3 px-4">{pilot.totalFlights}</td>
                  <td className="py-3 px-4">{Math.round(pilot.totalHours)}</td>
                  <td className="py-3 px-4">
                    <span className={`badge-status ${getStatusColor(pilot.status)}`}>
                      {pilot.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {pilot.status === 'ACTIVE' ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPilot(pilot);
                              setActionType('suspend');
                            }}
                            className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                          >
                            <AlertCircle size={14} />
                            Suspend
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPilot(pilot);
                              setActionType('ban');
                            }}
                            className="btn-danger text-xs px-2 py-1 flex items-center gap-1"
                          >
                            <Ban size={14} />
                            Ban
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUnban(pilot.id)}
                          className="btn-primary text-xs px-2 py-1 flex items-center gap-1"
                        >
                          <Shield size={14} />
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
