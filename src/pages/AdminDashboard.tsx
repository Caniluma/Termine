import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, Trash2, Users, Clock, LogOut, Lock } from 'lucide-react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('slots');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New slot form
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newType, setNewType] = useState<'einzel' | 'gruppe'>('einzel');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchSlots();
      fetchBookings(savedToken);
    } else {
      fetchSlots();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        setIsAuthenticated(true);
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        fetchSlots();
        fetchBookings(data.token);
        setLoginError('');
      } else {
        setLoginError(data.error || 'Login fehlgeschlagen');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Ein Fehler ist aufgetreten');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setPassword('');
    localStorage.removeItem('adminToken');
  };

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/slots');
      if (!res.ok) {
        let errData = { error: `HTTP error! status: ${res.status}` };
        try { errData = await res.json(); } catch (e) {}
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSlots(data);
        setErrorMsg(null);
      } else {
        setSlots([]);
        setErrorMsg('Unerwartetes Datenformat vom Server.');
      }
    } catch (err: any) {
      console.error('Failed to fetch slots', err);
      setSlots([]);
      setErrorMsg(err.message || 'Fehler beim Laden der Termine.');
    }
  };

  const fetchBookings = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        let errData = { error: `HTTP error! status: ${res.status}` };
        try { errData = await res.json(); } catch (e) {}
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch bookings', err);
      setBookings([]);
      setErrorMsg(err.message || 'Fehler beim Laden der Buchungen.');
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newStartTime || !newEndTime) return;

    const start = new Date(`${newDate}T${newStartTime}`).toISOString();
    const end = new Date(`${newDate}T${newEndTime}`).toISOString();

    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ startTime: start, endTime: end, type: newType })
      });
      if (res.ok) {
        fetchSlots();
        setNewStartTime('');
        setNewEndTime('');
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;
    
    try {
      const res = await fetch(`/api/slots/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSlots();
      } else if (res.status === 401) {
        handleLogout();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-brand-100 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-700">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-semibold text-center text-brand-900 mb-6">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Passwort</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="Passwort eingeben"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button 
              type="submit" 
              className="w-full bg-accent-500 text-white py-3 rounded-xl hover:bg-accent-600 transition-colors font-medium"
            >
              Einloggen
            </button>
            <div className="text-center mt-4">
              <Link to="/" className="text-sm text-brand-600 hover:text-brand-900">Zurück zur Startseite</Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-brand-200 text-brand-700 rounded-xl hover:bg-brand-50 hover:text-brand-900 transition-colors font-medium shadow-sm"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 rounded-2xl p-6 mb-8 text-center border border-red-100">
          <p className="text-red-600 font-medium">Fehler: {errorMsg}</p>
          <p className="text-red-500 text-sm mt-2">
            Bitte überprüfen Sie die Datenbank-Verbindung (Supabase) und die Umgebungsvariablen in Vercel.
            <br />Haben Sie das SQL-Skript (`supabase/schema.sql`) in Ihrem Supabase-Projekt ausgeführt?
          </p>
        </div>
      )}

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
                  <div className="text-center py-8">
                    <p className="text-brand-500 font-medium">Keine Termine angelegt.</p>
                    <p className="text-brand-400 text-sm mt-2">Nutzen Sie das Formular links, um neue Termine zu erstellen.</p>
                  </div>
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
