import React, { useState, useEffect, useMemo } from 'react';
import { ViewMode, HennaBooking, DisabledSlot, ServiceCategoryKey } from '../types';
import { STUDIO_INFO } from '../data/mockData';

interface CheckAvailabilityViewProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  hennaBookings?: HennaBooking[];
  disabledSlots?: DisabledSlot[];
}

export const CheckAvailabilityView: React.FC<CheckAvailabilityViewProps> = ({
  onNavigate,
  hennaBookings = [],
  disabledSlots = [],
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Check if a slot is already booked
  const isSlotBooked = useMemo(() => (date: string, timeSlot: string) => {
    return hennaBookings.some(
      (b) => b.date === date && b.timeSlot === timeSlot && b.status !== 'Cancelled'
    );
  }, [hennaBookings]);

  // Check if a slot is disabled by admin
  const isSlotDisabled = useMemo(() => (date: string, timeSlot: string) => {
    return disabledSlots.some((s) => s.date === date && s.timeSlot === timeSlot);
  }, [disabledSlots]);

  // Get availability for a date
  const getAvailability = useMemo(() => (date: string) => {
    const slots = [
      { id: 'morning', label: 'Morning Slot', time: '09:00 AM - 01:00 PM', icon: '🌅', fullSlot: 'Morning Slot (09:00 AM - 01:00 PM)' },
      { id: 'evening', label: 'Evening Slot', time: '04:00 PM - 09:00 PM', icon: '🌙', fullSlot: 'Evening Slot (04:00 PM - 09:00 PM)' },
    ];
    
    return slots.map((slot) => ({
      ...slot,
      isBooked: isSlotBooked(date, slot.fullSlot),
      isDisabled: isSlotDisabled(date, slot.fullSlot),
      status: isSlotBooked(date, slot.fullSlot) ? 'booked' : 
              isSlotDisabled(date, slot.fullSlot) ? 'disabled' : 'available',
    }));
  }, [isSlotBooked, isSlotDisabled]);

  // Get availability for a week (7 days)
  const getWeekAvailability = useMemo(() => (startDate: string) => {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const availability = getAvailability(dateStr);
      const hasAvailable = availability.some((s) => s.status === 'available');
      const allBooked = availability.every((s) => s.status === 'booked');
      const allDisabled = availability.every((s) => s.status === 'disabled');
      
      dates.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        availability,
        hasAvailable,
        isFullyBooked: allBooked,
        isFullyDisabled: allDisabled,
        isPast: date < new Date(new Date().setHours(0,0,0,0)),
      });
    }
    return dates;
  }, [getAvailability]);

  const weekData = getWeekAvailability(selectedDate);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div className="pt-20 pb-16 px-2 sm:px-4 md:px-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center py-8 px-6 space-y-3 bg-[var(--sc-bg-soft)] border border-[var(--sc-border)] rounded-3xl">
        <p className="text-[10px] md:text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">
          ✦ CHECK SLOT AVAILABILITY ✦
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-[var(--sc-text)] font-bold tracking-tight">
          Mehendi Appointment Availability
        </h1>
        <p className="text-xs md:text-sm text-[var(--sc-text-dim)] max-w-2xl mx-auto">
          Select a date to see available Morning and Evening slots for Bridal & Occasion Mehendi appointments.
          No login required - just pick a date and check!
        </p>
      </div>

      {/* Date Selector & Week View */}
      <div className="bg-[var(--sc-surface)] text-[var(--sc-text)] rounded-3xl overflow-hidden border border-[var(--sc-border)] lux-card-shadow">
        {/* Date Picker Header */}
        <div className="bg-[var(--sc-bg-soft)] border-b border-[var(--sc-border)]/60 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--sc-emerald)] text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">event_available</span>
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg md:text-xl text-[var(--sc-text)]">
                  Select Date
                </h2>
                <p className="text-xs text-[var(--sc-text-dim)]">Choose a date to view slot availability</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-4 py-3 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-sm font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Week Calendar View */}
        <div className="p-4 sm:p-6">
          <p className="text-xs text-[var(--sc-text-dim)] mb-4">Week Overview</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--sc-bg-soft)] text-[var(--sc-text-dim)] uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3">Day</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Morning Slot<br/>(09:00 AM - 01:00 PM)</th>
                  <th className="p-3">Evening Slot<br/>(04:00 PM - 09:00 PM)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sc-border)]">
                {weekData.map((day) => {
                  const morning = day.availability.find((s) => s.id === 'morning');
                  const evening = day.availability.find((s) => s.id === 'evening');
                  
                  return (
                    <tr key={day.date} className={`hover:bg-[var(--sc-accent-warm)] transition-colors ${day.isPast ? 'opacity-50' : ''}`}>
                      <td className="p-3 font-semibold text-[var(--sc-text)]">
                        {day.dayName}
                      </td>
                      <td className="p-3 text-[var(--sc-text)]">
                        {day.dayNum} {day.month}
                      </td>
                      <td className="p-3">
                        {morning && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
                            morning.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                            morning.status === 'booked' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {morning.status === 'available' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                            {morning.status === 'booked' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            {morning.status === 'disabled' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                            {morning.status === 'available' ? 'Available' : morning.status === 'booked' ? 'Booked' : 'Not Available'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {evening && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
                            evening.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                            evening.status === 'booked' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {evening.status === 'available' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                            {evening.status === 'booked' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            {evening.status === 'disabled' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                            {evening.status === 'available' ? 'Available' : evening.status === 'booked' ? 'Booked' : 'Not Available'}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {day.isPast ? (
                          <span className="text-[10px] text-[var(--sc-text-dimmer)]">Past Date</span>
                        ) : day.hasAvailable ? (
                          <span className="text-[10px] text-emerald-700 font-medium">Slots Available</span>
                        ) : day.isFullyBooked ? (
                          <span className="text-[10px] text-red-700 font-medium">Fully Booked</span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium">Not Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Date Detail */}
        <div className="bg-[var(--sc-bg-soft)] border-t border-[var(--sc-border)]/60 p-4 sm:p-6">
          <h3 className="font-serif font-bold text-lg text-[var(--sc-text)] mb-4">
            Availability for {formatDate(selectedDate)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {weekData.find((d) => d.date === selectedDate)?.availability.map((slot) => (
              <div
                key={slot.id}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  slot.status === 'available'
                    ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                    : slot.status === 'booked'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl">{slot.icon}</span>
                  <h4 className="font-serif font-bold text-xl text-[var(--sc-text)]">{slot.label}</h4>
                </div>
                <p className="text-sm text-[var(--sc-text-dim)] mb-3">{slot.time}</p>
                <div className="flex items-center justify-center gap-2">
                  {slot.status === 'available' && (
                    <>
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-emerald-800 text-lg">Available</span>
                    </>
                  )}
                  {slot.status === 'booked' && (
                    <>
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="font-bold text-red-800 text-lg">Booked</span>
                    </>
                  )}
                  {slot.status === 'disabled' && (
                    <>
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="font-bold text-amber-800 text-lg">Not Available</span>
                    </>
                  )}
                </div>
                {slot.status === 'available' && (
                  <button
                    onClick={() => onNavigate('henna-booking', 'mehendi')}
                    className="mt-4 w-full py-3 bg-[var(--sc-emerald)] text-white font-bold rounded-xl hover:bg-[var(--sc-emerald-light)] transition-all"
                  >
                    Book This Slot
                  </button>
                )}
                {slot.status === 'booked' && (
                  <p className="mt-4 text-xs text-red-700">This slot has been booked by another client</p>
                )}
                {slot.status === 'disabled' && (
                  <p className="mt-4 text-xs text-amber-700">This slot is not available for booking</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-[var(--sc-surface)] rounded-2xl p-4 border border-[var(--sc-border)]">
        <h4 className="font-semibold text-sm text-[var(--sc-text)] mb-3">Availability Legend</h4>
        <div className="flex flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-[var(--sc-text)]">Available - Click to book</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-[var(--sc-text)]">Booked - Already reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-[var(--sc-text)]">Not Available - Disabled by studio</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <p className="text-sm text-[var(--sc-text-dim)] mb-4">Ready to book your Mehendi appointment?</p>
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('henna-booking', 'mehendi');
            }
          }}
          className="px-8 py-4 bg-[var(--sc-emerald)] text-white font-bold rounded-xl hover:bg-[var(--sc-emerald-light)] transition-all shadow-lg inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined">palette</span>
          <span>Book Mehendi Appointment</span>
        </button>
      </div>
    </div>
  );
};