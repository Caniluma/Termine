import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, Dog, Heart, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  isBooked: number;
  type: 'einzel' | 'gruppe';
  maxCapacity: number;
  bookedCount: number;
}

export default function ClientBooking() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [formData, setFormData] = useState({
    parentName: '',
    childName: '',
    email: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/slots');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error('Failed to fetch slots', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleSlot = (slot: Slot) => {
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.id === slot.id);
      if (isSelected) {
        return prev.filter(s => s.id !== slot.id);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) return;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIds: selectedSlots.map(s => s.id),
          ...formData
        })
      });

      if (res.ok) {
        setBookingSuccess(true);
        setSelectedSlots([]);
        fetchSlots();
      } else {
        const error = await res.json();
        alert(error.error || 'Fehler bei der Buchung');
      }
    } catch (err) {
      console.error('Booking error', err);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-accent-500"><Dog size={32} /></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <img 
          src="https://caniluma.de/wp-content/uploads/2025/11/Logo-ohen-Hintergrund.png" 
          alt="Caniluma Logo" 
          className="h-32 md:h-48 mx-auto mb-8 object-contain"
          referrerPolicy="no-referrer"
        />
        <p className="text-lg text-brand-700 max-w-2xl mx-auto leading-relaxed">
          Tiergestützte Förderung mit Hunden für Kinder und Jugendliche. 
          Ein achtsamer, verlässlicher Rahmen, in dem Kinder gesehen werden dürfen, so wie sie sind.
        </p>
      </div>

      {bookingSuccess ? (
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm text-center max-w-2xl mx-auto border border-brand-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-3xl font-medium mb-4">Termin erfolgreich angefragt!</h2>
          <p className="text-brand-700 mb-8">
            Vielen Dank für Ihr Vertrauen. Wir haben Ihre Anfrage erhalten und werden uns in Kürze bei Ihnen melden.
          </p>
          <button 
            onClick={() => {
              setBookingSuccess(false);
              setFormData({ parentName: '', childName: '', email: '', phone: '', notes: '' });
            }}
            className="bg-accent-500 text-white px-8 py-3 rounded-full hover:bg-accent-600 transition-colors"
          >
            Weitere Termine ansehen
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-12">
          {/* Slots Selection */}
          <div>
            <h2 className="text-2xl font-medium mb-6 flex items-center gap-2">
              <Calendar className="text-accent-500" /> Verfügbare Termine
            </h2>
            
            {slots.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-brand-100">
                <Heart className="mx-auto text-brand-300 mb-4" size={32} />
                <p className="text-brand-600">Aktuell sind leider keine Termine verfügbar. Bitte schauen Sie später wieder vorbei.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {slots.map((slot) => {
                  const start = parseISO(slot.startTime);
                  const end = parseISO(slot.endTime);
                  const isSelected = selectedSlots.some(s => s.id === slot.id);
                  const isBooked = slot.bookedCount >= slot.maxCapacity;
                  const spotsLeft = slot.maxCapacity - slot.bookedCount;
                  
                  return (
                    <button
                      key={slot.id}
                      onClick={() => !isBooked && toggleSlot(slot)}
                      disabled={isBooked}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border transition-all duration-200 relative",
                        isBooked 
                          ? "opacity-50 bg-brand-50/50 border-brand-200 cursor-not-allowed"
                          : isSelected 
                            ? "border-accent-500 bg-brand-100 shadow-sm" 
                            : "border-brand-200 bg-white hover:border-accent-500 hover:shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-1">
                          <div className={cn("font-medium text-lg", isBooked ? "text-brand-600" : "")}>
                            {format(start, 'EEEE, d. MMMM yyyy', { locale: de })}
                          </div>
                          <span className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded-md w-fit",
                            slot.type === 'einzel' 
                              ? "bg-brand-200 text-brand-800" 
                              : "bg-accent-500/10 text-accent-600"
                          )}>
                            {slot.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting'}
                          </span>
                        </div>
                        {isBooked ? (
                          <span className="text-xs font-medium bg-brand-200 text-brand-700 px-2.5 py-1 rounded-full">
                            Nicht verfügbar
                          </span>
                        ) : slot.type === 'gruppe' ? (
                          <span className="text-xs font-medium bg-brand-100 text-brand-800 border border-brand-200 px-2.5 py-1 rounded-full">
                            Freie Plätze: {spotsLeft}/{slot.maxCapacity}
                          </span>
                        ) : null}
                      </div>
                      <div className={cn("flex items-center gap-2 mt-3", isBooked ? "text-brand-500" : "text-brand-600")}>
                        <Clock size={16} />
                        <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')} Uhr</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div>
            <div className={cn(
              "bg-white rounded-3xl p-8 shadow-sm border border-brand-100 transition-opacity duration-300",
              selectedSlots.length === 0 && "opacity-50 pointer-events-none"
            )}>
              <h2 className="text-2xl font-medium mb-6">Ihre Daten</h2>
              
              {selectedSlots.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h3 className="text-sm font-medium text-brand-700">Ausgewählte Termine:</h3>
                  {selectedSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-100">
                      <div>
                        <div className="font-medium text-brand-900 text-sm flex items-center gap-2">
                          {format(parseISO(slot.startTime), 'EEEE, d. MMM', { locale: de })}
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                            slot.type === 'einzel' ? "bg-brand-200 text-brand-800" : "bg-accent-500/10 text-accent-600"
                          )}>
                            {slot.type === 'einzel' ? 'Einzel' : 'Gruppe'}
                          </span>
                        </div>
                        <div className="text-brand-600 flex items-center gap-1 text-xs mt-0.5">
                          <Clock size={12} />
                          {format(parseISO(slot.startTime), 'HH:mm')} - {format(parseISO(slot.endTime), 'HH:mm')}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className="text-xs text-brand-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Name eines Elternteils *</label>
                  <input 
                    required
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-brand-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Name des Kindes *</label>
                  <input 
                    required
                    type="text"
                    name="childName"
                    value={formData.childName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-brand-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">E-Mail *</label>
                    <input 
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-brand-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">Telefon *</label>
                    <input 
                      required
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-brand-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Anmerkungen (Optional)</label>
                  <textarea 
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-brand-50 resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={selectedSlots.length === 0}
                  className="w-full bg-accent-500 text-white font-medium py-4 rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {selectedSlots.length > 0 
                    ? `${selectedSlots.length} Termin${selectedSlots.length > 1 ? 'e' : ''} verbindlich anfragen` 
                    : 'Bitte wählen Sie Termine'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
