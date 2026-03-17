export interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  isBooked: number;
  type: 'einzel' | 'gruppe';
  maxCapacity: number;
  bookedCount?: number;
}

export interface Booking {
  id: number;
  slotId: number;
  parentName: string;
  childName: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  slots?: Slot;
}

export interface FormattedBooking extends Booking {
  startTime: string;
  endTime: string;
  type: 'einzel' | 'gruppe';
}
