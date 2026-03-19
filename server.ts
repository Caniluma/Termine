import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import path from 'path';
import jwt from 'jsonwebtoken';
import { getBookingConfirmationEmail, getCancellationEmail } from './src/utils/emailTemplates.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Supabase Client
// We use lazy initialization so the app doesn't crash on startup if keys are missing
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// Admin Authentication Middleware
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback_secret';

  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'object' && decoded.role === 'admin') {
      next();
    } else {
      return res.status(401).json({ error: 'Invalid token role' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized or expired token' });
  }
};

// API Routes
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Passwort wird benötigt' });
  }

  try {
    const supabase = getSupabase();
    
    // Check 'Settings' table
    let { data: settingsData, error } = await supabase.from('Settings').select('*');
    
    // If error, try 'settings' table
    if (error || !settingsData) {
      const res2 = await supabase.from('settings').select('*');
      settingsData = res2.data;
    }

    if (!settingsData || settingsData.length === 0) {
      return res.status(500).json({ error: 'Konfigurationstabelle nicht gefunden oder leer' });
    }

    // Find password setting
    const pwdRow = settingsData.find(row => {
      const k = String(row.key || row.Key || '').toLowerCase();
      return k.includes('password') || k.includes('passwort');
    });

    if (!pwdRow) {
      return res.status(500).json({ error: 'Passwort-Eintrag in der Datenbank nicht gefunden' });
    }

    const storedPassword = String(pwdRow.value || pwdRow.Value || '');

    if (password === storedPassword) {
      const jwtSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback_secret';
      const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '24h' });
      return res.json({ success: true, token });
    } else {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
app.get('/api/test-schema', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('bookings').select('*').limit(1);
    res.json({ data, error });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/api/slots', async (req, res) => {
  try {
    const supabase = getSupabase();
    
    const { data: slots, error } = await supabase
      .from('slots')
      .select('*, bookings(count)')
      .order('startTime', { ascending: true });
      
    if (error) throw error;
    
    // Format the response to match the expected frontend structure
    const formattedSlots = slots.map(slot => ({
      ...slot,
      bookedCount: slot.bookings[0]?.count || 0
    }));
    
    res.json(formattedSlots);
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch slots' });
  }
});

app.post('/api/slots', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { startTime, endTime, type } = req.body;
    
    if (!startTime || !endTime || !type) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    const maxCapacity = type === 'gruppe' ? 4 : 1;
    
    const { data, error } = await supabase
      .from('slots')
      .insert([{ startTime, endTime, type, maxCapacity }])
      .select()
      .single();
      
    if (error) throw error;
    
    res.json({ ...data, bookedCount: 0 });
  } catch (err) {
    console.error('Error creating slot:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create slot' });
  }
});

app.delete('/api/slots/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    
    // Check if booked
    const { data: slot, error: fetchError } = await supabase
      .from('slots')
      .select('bookings(count)')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    
    const bookedCount = slot.bookings[0]?.count || 0;
    if (bookedCount > 0) {
      return res.status(400).json({ error: 'Cannot delete a slot with bookings' });
    }
    
    const { error: deleteError } = await supabase
      .from('slots')
      .delete()
      .eq('id', id);
      
    if (deleteError) throw deleteError;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting slot:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete slot' });
  }
});

app.get('/api/bookings', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, slots(startTime, endTime, type)')
      .order('createdAt', { ascending: false });
      
    if (error) throw error;
    
    // Flatten the response
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      startTime: booking.slots.startTime,
      endTime: booking.slots.endTime,
      type: booking.slots.type
    }));
    
    // Sort by startTime
    formattedBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    res.json(formattedBookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch bookings' });
  }
});

app.delete('/api/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    
    // Get the booking details to send cancellation email
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, slots(startTime, endTime, type)')
      .eq('id', id)
      .single();
      
    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Delete the booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
      
    if (deleteError) throw deleteError;
    
    // Check remaining bookings for the slot
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('maxCapacity, bookings(count)')
      .eq('id', booking.slotId)
      .single();
      
    if (!slotError && slot) {
      const bookedCount = slot.bookings[0]?.count || 0;
      if (bookedCount < slot.maxCapacity) {
        // Update slot to not fully booked
        await supabase
          .from('slots')
          .update({ isBooked: 0 })
          .eq('id', booking.slotId);
      }
    }
    
    // Send cancellation email
    if (process.env.RESEND_API_KEY && booking.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const start = new Date(booking.slots.startTime);
        const end = new Date(booking.slots.endTime);
        
        const dateStr = start.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
        const typeStr = booking.slots.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting';
        
        const emailHtml = getCancellationEmail(
          booking.parentName,
          booking.childName,
          `CNL-${10000 + parseInt(id, 10)}`,
          dateStr,
          timeStr,
          typeStr
        );
        
        await resend.emails.send({
          from: 'Caniluma <info@termine.caniluma.de>',
          to: booking.email,
          subject: 'Stornierung Ihres Termins bei Caniluma',
          html: emailHtml
        });
      } catch (emailErr) {
        console.error('Failed to send cancellation email:', emailErr);
        // We don't fail the deletion if the email fails
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete booking' });
  }
});

app.post('/api/my-bookings', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { bookingNumber } = req.body;
    
    if (!bookingNumber) {
      return res.status(400).json({ error: 'Buchungsnummer ist erforderlich' });
    }
    
    // Parse booking number (e.g., "CNL-10001" -> 1)
    const match = bookingNumber.match(/CNL-(\d+)/i);
    if (!match) {
      return res.status(400).json({ error: 'Ungültiges Buchungsnummer-Format. Bitte verwenden Sie das Format CNL-XXXXX' });
    }
    
    const id = parseInt(match[1], 10) - 10000;
    
    // Verify the booking exists to get the email
    const { data: verifyBooking, error: verifyError } = await supabase
      .from('bookings')
      .select('email')
      .eq('id', id)
      .single();
      
    if (verifyError || !verifyBooking) {
      return res.status(404).json({ error: 'Keine Buchung mit dieser Nummer gefunden' });
    }
    
    const email = verifyBooking.email;
    
    // Fetch all bookings for this email
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, slots(startTime, endTime, type)')
      .ilike('email', email)
      .order('createdAt', { ascending: false });
      
    if (error) throw error;
    
    // Flatten the response
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      startTime: booking.slots.startTime,
      endTime: booking.slots.endTime,
      type: booking.slots.type
    }));
    
    // Sort by startTime
    formattedBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    res.json(formattedBookings);
  } catch (err) {
    console.error('Error fetching my bookings:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Fehler beim Laden der Buchungen' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { slotIds, parentName, childName, email, phone, notes } = req.body;
    
    const idsToBook = Array.isArray(slotIds) ? slotIds : (req.body.slotId ? [req.body.slotId] : []);

    if (idsToBook.length === 0 || !parentName || !childName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingIds = [];
    
    // Process each booking sequentially to ensure capacity checks are accurate
    for (const slotId of idsToBook) {
      // 1. Check capacity
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('maxCapacity, bookings(count)')
        .eq('id', slotId)
        .single();
        
      if (slotError || !slot) throw new Error(`Slot nicht gefunden`);
      
      const bookedCount = slot.bookings[0]?.count || 0;
      if (bookedCount >= slot.maxCapacity) {
        throw new Error(`Ein Termin ist bereits ausgebucht`);
      }

      // 2. Insert booking
      const { data: booking, error: insertError } = await supabase
        .from('bookings')
        .insert([{ slotId, parentName, childName, email, phone, notes: notes || '' }])
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      bookingIds.push(booking.id);
      
      // 3. Update slot isBooked status if it's now full
      if (bookedCount + 1 >= slot.maxCapacity) {
        await supabase
          .from('slots')
          .update({ isBooked: 1 })
          .eq('id', slotId);
      }
    }

    // 4. Send confirmation email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // Fetch the booked slots to include dates in the email
        const { data: bookedSlots } = await supabase
          .from('slots')
          .select('startTime, endTime, type')
          .in('id', idsToBook)
          .order('startTime', { ascending: true });

        let slotsHtml = '';
        if (bookedSlots && bookedSlots.length > 0) {
          slotsHtml = '<ul>' + bookedSlots.map(slot => {
            const startDate = new Date(slot.startTime);
            const endDate = new Date(slot.endTime);
            const dateStr = startDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = `${startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
            const typeStr = slot.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting';
            return `<li><strong>${dateStr}</strong> (${timeStr}) - ${typeStr}</li>`;
          }).join('') + '</ul>';
        }

        const emailHtml = getBookingConfirmationEmail(
          parentName,
          childName,
          `CNL-${10000 + bookingIds[0]}`,
          slotsHtml
        );

        await resend.emails.send({
          from: 'Caniluma <info@termine.caniluma.de>',
          to: [email],
          subject: 'Ihre Buchungsanfrage bei Caniluma',
          html: emailHtml
        });
        
        console.log('Confirmation email sent to', email);
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
        // We don't throw here because the booking was successful
      }
    } else {
      console.log('RESEND_API_KEY not set, skipping email confirmation');
    }

    res.json({ success: true, bookingIds });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Booking failed' });
  }
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Express error:', err);
  res.status(500).json({ error: 'Internal Server Error: ' + (err.message || String(err)) });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const viteModule = 'vite';
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server automatically if we are NOT running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

// Export the Express app for Vercel Serverless Functions
export default app;
