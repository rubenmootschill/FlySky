'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ChevronDown } from 'lucide-react';

interface Aircraft {
  id: string;
  icaoCode: string;
  name: string;
  manufacturer: string;
  passengers: number;
  cargoVolume: number;
  cargoWeight: number;
  active: boolean;
}

type FormStep = 1 | 2;

export default function AdminFleetsPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [cargoVolume, setCargoVolume] = useState(20);
  const [cargoWeight, setCargoWeight] = useState(40000);
  const [weightUnit, setWeightUnit] = useState<'KGS' | 'LBS'>('KGS');
  const [formData, setFormData] = useState({
    icaoCode: '',
    name: '',
    manufacturer: '',
    passengers: 180,
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetchAircraft();
  }, []);

  const fetchAircraft = async () => {
    try {
      const res = await fetch('/api/admin/fleet');
      if (res.ok) {
        const data = await res.json();
        setAircraft(data);
      }
    } catch (error) {
      console.error('Failed to fetch aircraft:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({ icaoCode: '', name: '', manufacturer: '', passengers: 180 });
    setCargoVolume(20);
    setCargoWeight(40000);
    setWeightUnit('KGS');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  const openModal = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (a: Aircraft) => {
    setEditingId(a.id);
    setFormData({
      icaoCode: a.icaoCode,
      name: a.name,
      manufacturer: a.manufacturer,
      passengers: a.passengers,
    });
    setCargoVolume(a.cargoVolume);
    setCargoWeight(a.cargoWeight);
    setCurrentStep(1);
    setShowModal(true);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.icaoCode.trim() || !formData.name.trim() || !formData.manufacturer.trim()) {
        alert('Please fill in all required fields');
        return;
      }
    }
    if (currentStep < 2) {
      setCurrentStep((prev) => (prev + 1) as FormStep);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FormStep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `/api/admin/fleet?id=${editingId}` : '/api/admin/fleet';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cargoVolume,
          cargoWeight,
        }),
      });
      if (res.ok) {
        const updatedAircraft = await res.json();
        if (editingId) {
          setAircraft(aircraft.map((a) => (a.id === editingId ? updatedAircraft : a)));
        } else {
          setAircraft([updatedAircraft, ...aircraft]);
        }
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save aircraft:', error);
    }
  };

  const stepMeta: Array<{ id: FormStep; title: string; description: string }> = [
    { id: 1, title: 'Aircraft Details', description: 'ICAO code, name & passengers' },
    { id: 2, title: 'Cargo Config', description: 'Set maximum cargo limits' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="section-title">Global Fleet</h1>
        <button
          onClick={openModal}
          className="btn-secondary text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          ADD AIRCRAFT
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading aircraft...</div>
      ) : aircraft.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">No aircraft types added yet</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">ICAO</th>
                  <th className="text-left px-4 py-3 font-medium">Aircraft Name</th>
                  <th className="text-left px-4 py-3 font-medium">Manufacturer</th>
                  <th className="text-left px-4 py-3 font-medium">Passengers</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {aircraft.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 dark:border-slate-900/70 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sky-500 font-semibold">{a.icaoCode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-slate-500">{a.manufacturer}</td>
                    <td className="px-4 py-3 text-slate-500">{a.passengers} pax</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEditModal(a)} className="text-sky-500 hover:text-sky-600 dark:hover:text-sky-400">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mounted && showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl card p-0 max-h-[94vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Aircraft Type' : 'Add Aircraft Type'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-0 overflow-y-auto">
              <aside className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <div className="space-y-4">
                  {stepMeta.map((step) => {
                    const isActive = currentStep === step.id;
                    const isDone = currentStep > step.id;
                    return (
                      <div key={step.id} className="flex gap-3 items-start">
                        <div className={`mt-0.5 w-6 h-6 rounded-full border text-xs font-semibold flex items-center justify-center ${isDone ? 'bg-sky-500 border-sky-500 text-white' : isActive ? 'border-sky-500 text-sky-500 bg-sky-500/10' : 'border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                          {isDone ? '✓' : step.id}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isActive ? 'text-sky-500' : 'text-slate-700 dark:text-slate-200'}`}>{step.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{step.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <section className="p-5 sm:p-6 space-y-5 min-w-0">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">ICAO Code</label>
                      <input
                        type="text"
                        placeholder="B738"
                        maxLength={4}
                        value={formData.icaoCode}
                        onChange={(e) => setFormData({ ...formData, icaoCode: e.target.value.toUpperCase() })}
                        className="input w-full"
                      />
                    </div>

                    <div>
                      <label className="label">Aircraft Name</label>
                      <input
                        type="text"
                        placeholder="Boeing 737-800"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Manufacturer</label>
                        <input
                          type="text"
                          placeholder="Boeing"
                          value={formData.manufacturer}
                          onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="label">Passengers</label>
                        <input
                          type="number"
                          value={formData.passengers}
                          onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="label flex items-center justify-between">
                        <span>Cargo Volume (m³)</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={cargoVolume}
                            onChange={(e) => setCargoVolume(Number(e.target.value) || 0)}
                            className="input h-9 w-24 text-right font-mono"
                          />
                          <span className="font-mono text-slate-900 dark:text-white">m³</span>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="label flex items-center justify-between">
                        <span>Cargo Weight ({weightUnit})</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={cargoWeight}
                            onChange={(e) => setCargoWeight(Number(e.target.value) || 0)}
                            className="input h-9 w-28 text-right font-mono"
                          />
                          <span className="font-mono text-slate-900 dark:text-white">{weightUnit.toLowerCase()}</span>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="label">Weight Unit</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setWeightUnit('KGS')} className={`px-3 py-1.5 rounded-md text-xs border ${weightUnit === 'KGS' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>KGS</button>
                        <button type="button" onClick={() => setWeightUnit('LBS')} className={`px-3 py-1.5 rounded-md text-xs border ${weightUnit === 'LBS' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>LBS</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button type="button" onClick={currentStep === 1 ? closeModal : previousStep} className="btn-secondary">
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {currentStep < 2 ? (
                    <button type="button" onClick={nextStep} className="btn-primary">
                      Next
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit} className="btn-primary">
                      {editingId ? 'Update Aircraft' : 'Create Aircraft'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
