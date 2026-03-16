-- Supabase Database Schema

CREATE TABLE IF NOT EXISTS public.slots (
  id SERIAL PRIMARY KEY,
  "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
  "isBooked" INTEGER DEFAULT 0,
  type TEXT DEFAULT 'einzel',
  "maxCapacity" INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id SERIAL PRIMARY KEY,
  "slotId" INTEGER REFERENCES public.slots(id) ON DELETE CASCADE,
  "parentName" TEXT NOT NULL,
  "childName" TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to slots (for the frontend to see available slots)
CREATE POLICY "Allow public read access to slots" ON public.slots FOR SELECT USING (true);

-- Allow anonymous insert access to bookings (for the frontend to book slots)
CREATE POLICY "Allow public insert access to bookings" ON public.bookings FOR INSERT WITH CHECK (true);

-- Allow anonymous read access to bookings (for the frontend to see booked slots count)
CREATE POLICY "Allow public read access to bookings" ON public.bookings FOR SELECT USING (true);

-- Allow anonymous update access to slots (to update isBooked status)
CREATE POLICY "Allow public update access to slots" ON public.slots FOR UPDATE USING (true);

-- Note: In a production environment, you should restrict these policies further,
-- especially for the admin dashboard which should require authentication.
