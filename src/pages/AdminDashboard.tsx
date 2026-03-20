import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Plus, Trash2, Users, Clock, LogOut, Lock, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Slot, FormattedBooking } from '../types';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<FormattedBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'slots' | 'bookings'>('slots');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New slot form
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newType, setNewType] = useState<'einzel' | 'gruppe'>('einzel');
  const [newMaxCapacity, setNewMaxCapacity] = useState<number>(4);
  const [isMarketingBlocked, setIsMarketingBlocked] = useState<boolean>(false);

  // Modals & Toasts
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<number | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchSlots(savedToken);
      fetchBookings(savedToken);
    } else {
      fetchSlots(null);
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
        fetchSlots(data.token);
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

  const fetchSlots = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/slots', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) {
        let errData = { error: `HTTP error! status: ${res.status}` };
        try { errData = await res.json(); } catch (e) {}
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter out past slots that have NO bookings
        const now = new Date();
        const filteredSlots = data.filter(slot => {
          const slotEnd = new Date(slot.endTime);
          const isPast = slotEnd < now;
          const hasBookings = slot.bookedCount > 0;
          
          // Keep if it's in the future OR if it's in the past but has bookings
          return !isPast || hasBookings;
        });
        
        setSlots(filteredSlots);
        setErrorMsg(null);
      } else {
        setSlots([]);
        setErrorMsg('Unerwartetes Datenformat vom Server.');
      }
    } catch (err) {
      console.error('Failed to fetch slots', err);
      setSlots([]);
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Laden der Termine.');
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
    } catch (err) {
      console.error('Failed to fetch bookings', err);
      setBookings([]);
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Laden der Buchungen.');
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
        body: JSON.stringify({ 
          startTime: start, 
          endTime: end, 
          type: newType,
          maxCapacity: newType === 'gruppe' ? newMaxCapacity : 1,
          isBooked: isMarketingBlocked ? 1 : 0
        })
      });
      if (res.ok) {
        fetchSlots();
        setNewStartTime('');
        setNewEndTime('');
        setIsMarketingBlocked(false);
        showToast('Termin erfolgreich erstellt!');
      } else if (res.status === 401) {
        handleLogout();
      } else {
        showToast('Fehler beim Erstellen des Termins', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Erstellen des Termins', 'error');
    }
  };

  const handleDeleteSlot = (id: number) => {
    setSlotToDelete(id);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    
    try {
      const res = await fetch(`/api/slots/${slotToDelete}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSlots();
        showToast('Termin erfolgreich gelöscht!');
      } else if (res.status === 401) {
        handleLogout();
      } else {
        const err = await res.json();
        showToast(err.error || 'Fehler beim Löschen', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Löschen', 'error');
    } finally {
      setSlotToDelete(null);
    }
  };

  const handleDeleteBooking = (id: number) => {
    setBookingToDelete(id);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    
    try {
      const res = await fetch(`/api/bookings/${bookingToDelete}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBookings();
        fetchSlots(); // Update slots as well since capacity changed
        showToast('Buchung erfolgreich storniert!');
      } else if (res.status === 401) {
        handleLogout();
      } else {
        const err = await res.json();
        showToast(err.error || 'Fehler beim Stornieren', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Fehler beim Stornieren', 'error');
    } finally {
      setBookingToDelete(null);
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
                    <option value="gruppe">Gruppensetting (Mehrere Plätze)</option>
                  </select>
                </div>
                
                {newType === 'gruppe' && (
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">Anzahl der Plätze (max. 12)</label>
                    <input 
                      type="number" 
                      min="2"
                      max="12"
                      required
                      value={newMaxCapacity}
                      onChange={e => setNewMaxCapacity(parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border border-brand-200 bg-brand-50"
                    />
                  </div>
                )}

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

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="marketingBlock"
                    checked={isMarketingBlocked}
                    onChange={e => setIsMarketingBlocked(e.target.checked)}
                    className="w-4 h-4 text-accent-600 rounded border-brand-300 focus:ring-accent-500"
                  />
                  <label htmlFor="marketingBlock" className="text-sm text-brand-700">
                    Als "Ausgebucht" markieren (Marketing-Aktion)
                  </label>
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
                    const isFullyBooked = slot.isBooked === 1 || slot.bookedCount >= slot.maxCapacity;
                    
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
                              {slot.isBooked === 1 && slot.bookedCount === 0 ? 'Blockiert (Marketing)' : `Ausgebucht (${slot.bookedCount}/${slot.maxCapacity})`}
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
                        <div className="text-brand-500 text-sm mt-1">Buchungs-Nr: CNL-{10000 + booking.id}</div>
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
                    
                    <div className="mt-4 pt-4 border-t border-brand-200 flex justify-end">
                      <button 
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        Buchung stornieren
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-lg border ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={20} className="text-green-600" /> : <AlertCircle size={20} className="text-red-600" />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 text-current opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Slot Modal */}
      {slotToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-medium text-brand-900 mb-4">Termin löschen</h3>
            <p className="text-brand-600 mb-8">Möchten Sie diesen Termin wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setSlotToDelete(null)}
                className="px-6 py-2.5 rounded-xl font-medium text-brand-700 hover:bg-brand-50 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmDeleteSlot}
                className="px-6 py-2.5 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Modal */}
      {bookingToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-medium text-brand-900 mb-4">Buchung stornieren</h3>
            <p className="text-brand-600 mb-8">Möchten Sie diese Buchung wirklich stornieren? Der Termin wird dadurch wieder freigegeben. Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setBookingToDelete(null)}
                className="px-6 py-2.5 rounded-xl font-medium text-brand-700 hover:bg-brand-50 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={confirmDeleteBooking}
                className="px-6 py-2.5 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Stornieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
