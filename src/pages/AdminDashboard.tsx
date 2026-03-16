import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, Trash2, Users, Clock, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  isBooked: number;
  type: 'einzel' | 'gruppe';
  maxCapacity: number;
  bookedCount: number;
}

interface Booking {
  id: number;
  slotId: number;
  parentName: string;
  childName: string;
  email: string;
  phone: string;
  notes: string;
  startTime: string;
  endTime: string;
  type: 'einzel' | 'gruppe';
}

export default function AdminDashboard() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('slots');
  
  // New slot form
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newType, setNewType] = useState<'einzel' | 'gruppe'>('einzel');

  useEffect(() => {
    fetchSlots();
    fetchBookings();
  }, []);

  const fetchSlots = async () => {
    const res = await fetch('/api/slots');
    setSlots(await res.json());
  };

  const fetchBookings = async () => {
    const res = await fetch('/api/bookings');
    setBookings(await res.json());
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newStartTime || !newEndTime) return;

    const start = new Date(`${newDate}T${newStartTime}`).toISOString();
    const end = new Date(`${newDate}T${newEndTime}`).toISOString();

    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: start, endTime: end, type: newType })
      });
      if (res.ok) {
        fetchSlots();
        setNewStartTime('');
        setNewEndTime('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;
    
    try {
      const res = await fetch(`/api/slots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSlots();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
        <div className="flex items-center gap-4">
          <img 
            src="https://caniluma.de/wp-content/uploads/2025/11/Logo-ohen-Hintergrund.png" 
            alt="Caniluma Logo" 
            className="h-12 object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-serif font-semibold text-brand-900">Verwaltung</h1>
        </div>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-brand-200 text-brand-700 rounded-xl hover:bg-brand-50 hover:text-brand-900 transition-colors font-medium shadow-sm"
        >
          <LogOut size={18} />
          Zurück zur Startseite
        </Link>
      </div>

      <div className="flex gap-4 mb-8 border-b border-brand-200 pb-4">
        <button 
          onClick={() => setActiveTab('slots')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${
            activeTab === 'slots' ? 'bg-accent-500 text-white' : 'bg-white text-brand-700 hover:bg-brand-100'
          }`}
        >
          <Calendar size={20} /> Termin-Verwaltung
        </button>
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${
            activeTab === 'bookings' ? 'bg-accent-500 text-white' : 'bg-white text-brand-700 hover:bg-brand-100'
          }`}
        >
          <Users size={20} /> Buchungen ({bookings.length})
        </button>
      </div>

      {activeTab === 'slots' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100">
              <h2 className="text-xl font-medium mb-6">Neuen Termin freigeben</h2>
              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Datum</label>
                  <input 
                    type="date" 
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-brand-200 bg-brand-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Setting</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as 'einzel' | 'gruppe')}
                    className="w-full px-4 py-2 rounded-xl border border-brand-200 bg-brand-50"
                  >
                    <option value="einzel">Einzelsetting (1 Platz)</option>
                    <option value="gruppe">Gruppensetting (4 Plätze)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">Von</label>
                    <input 
                      type="time" 
                      required
                      value={newStartTime}
                      onChange={e => setNewStartTime(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-brand-200 bg-brand-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">Bis</label>
                    <input 
                      type="time" 
                      required
                      value={newEndTime}
                      onChange={e => setNewEndTime(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-brand-200 bg-brand-50"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-accent-500 text-white py-3 rounded-xl hover:bg-accent-600 transition-colors mt-4">
                  <Plus size={20} /> Freigeben
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100">
              <h2 className="text-xl font-medium mb-6">Alle Termine</h2>
              <div className="space-y-3">
                {slots.length === 0 ? (
                  <p className="text-brand-500 text-center py-8">Keine Termine angelegt.</p>
                ) : (
                  slots.map(slot => {
                    const start = parseISO(slot.startTime);
                    const end = parseISO(slot.endTime);
                    const isFullyBooked = slot.bookedCount >= slot.maxCapacity;
                    
                    return (
                      <div key={slot.id} className="flex items-center justify-between p-4 rounded-xl border border-brand-100 bg-brand-50">
                        <div>
                          <div className="font-medium text-brand-900 flex items-center gap-2">
                            {format(start, 'EEEE, d. MMMM yyyy', { locale: de })}
                            <span className="text-xs px-2 py-0.5 rounded-md bg-brand-200 text-brand-700 font-medium">
                              {slot.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting'}
                            </span>
                          </div>
                          <div className="flex items-center text-brand-600 text-sm gap-2 mt-1">
                            <Clock size={14} />
                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')} Uhr
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isFullyBooked ? (
                            <span className="px-3 py-1 bg-brand-200 text-brand-800 rounded-full text-xs font-medium">
                              Ausgebucht ({slot.bookedCount}/{slot.maxCapacity})
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-brand-100 text-brand-800 border border-brand-200 rounded-full text-xs font-medium">
                              Belegte Plätze: {slot.bookedCount}/{slot.maxCapacity}
                            </span>
                          )}
                          {slot.bookedCount === 0 && (
                            <button 
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Löschen"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-100">
          <div className="space-y-6">
            {bookings.length === 0 ? (
              <p className="text-brand-500 text-center py-12">Noch keine Buchungen vorhanden.</p>
            ) : (
              bookings.map(booking => {
                const start = parseISO(booking.startTime);
                const end = parseISO(booking.endTime);
                return (
                  <div key={booking.id} className="p-6 rounded-2xl border border-brand-200 bg-brand-50">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-brand-200">
                      <div>
                        <h3 className="text-lg font-medium text-brand-900 flex items-center gap-2">
                          {format(start, 'EEEE, d. MMMM yyyy', { locale: de })}
                          <span className="text-xs px-2 py-0.5 rounded-md bg-brand-200 text-brand-700 font-medium">
                            {booking.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting'}
                          </span>
                        </h3>
                        <p className="text-brand-600 flex items-center gap-2 mt-1">
                          <Clock size={16} /> {format(start, 'HH:mm')} - {format(end, 'HH:mm')} Uhr
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-brand-900">Kind: {booking.childName}</div>
                        <div className="text-brand-600">Elternteil: {booking.parentName}</div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-brand-500 block mb-1">Kontakt</span>
                        <a href={`mailto:${booking.email}`} className="text-accent-500 hover:underline block">{booking.email}</a>
                        <a href={`tel:${booking.phone}`} className="text-accent-500 hover:underline block">{booking.phone}</a>
                      </div>
                      {booking.notes && (
                        <div>
                          <span className="text-brand-500 block mb-1">Anmerkungen</span>
                          <p className="text-brand-800 bg-white p-3 rounded-lg border border-brand-100">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
