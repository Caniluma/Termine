import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import path from 'path';
import jwt from 'jsonwebtoken';
import { getBookingConfirmationEmail, getCancellationEmail, getAdminNotificationEmail } from './src/utils/emailTemplates.js';

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

// Get slots for clients (only future slots, > 24h away)
app.get('/api/slots', async (req, res) => {
  try {
    const supabase = getSupabase();
    
    // Calculate timestamp for 24 hours from now
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const tomorrowIsoString = tomorrow.toISOString();
    
    const { data: slots, error } = await supabase
      .from('slots')
      .select('*, bookings(count)')
      .gte('startTime', tomorrowIsoString)
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

// Get ALL slots for admin (including past ones)
app.get('/api/admin/slots', requireAdmin, async (req, res) => {
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
    console.error('Error fetching admin slots:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch admin slots' });
  }
});

app.post('/api/slots', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { startTime, endTime, type, maxCapacity: reqMaxCapacity, isBooked: reqIsBooked } = req.body;
    
    if (!startTime || !endTime || !type) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    let maxCapacity = 1;
    if (reqMaxCapacity !== undefined) {
      maxCapacity = parseInt(reqMaxCapacity, 10);
    } else {
      maxCapacity = type === 'gruppe' ? 4 : 1;
    }

    const isBooked = reqIsBooked ? 1 : 0;
    
    const { data, error } = await supabase
      .from('slots')
      .insert([{ startTime, endTime, type, maxCapacity, isBooked }])
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
        
        const dateStr = start.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = `${start.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr`;
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
    
    // Parse booking number (e.g., "CNL-10001")
    const match = bookingNumber.match(/CNL-(\d+)/i);
    if (!match) {
      return res.status(400).json({ error: 'Ungültiges Buchungsnummer-Format. Bitte verwenden Sie das Format CNL-XXXXX' });
    }
    
    // Verify the client exists
    const { data: client, error: verifyError } = await supabase
      .from('clients')
      .select('id, email')
      .ilike('clientNumber', bookingNumber.trim())
      .single();
      
    if (verifyError || !client) {
      return res.status(404).json({ error: 'Keine Buchungen mit dieser Nummer gefunden' });
    }
    
    // Fetch all bookings for this client
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, slots(startTime, endTime, type)')
      .eq('clientId', client.id)
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

app.post('/api/forgot-booking-number', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-Mail ist erforderlich' });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('clientNumber, parentName')
      .ilike('email', email.trim())
      .single();

    if (client && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailHtml = `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="color: #4a3b32;">Ihre Zugangsnummer bei Caniluma</h2>
            <p>Hallo ${client.parentName},</p>
            <p>Sie haben Ihre Zugangsnummer angefordert. Mit dieser Nummer können Sie jederzeit Ihre gebuchten Termine einsehen.</p>
            <div style="background-color: #fdf8f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #f5ebe6;">
              <p style="margin: 0; color: #666;">Ihre feste Zugangsnummer:</p>
              <p style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 10px 0 0 0;">${client.clientNumber}</p>
            </div>
            <p>Liebe Grüße,<br>Ihr Caniluma Team</p>
          </div>
        `;
        
        await resend.emails.send({
          from: 'Caniluma <info@termine.caniluma.de>',
          to: [email],
          subject: 'Ihre Zugangsnummer bei Caniluma',
          html: emailHtml
        });
        console.log('Forgot booking number email sent to', email);
      } catch (emailErr) {
        console.error('Failed to send forgot booking number email:', emailErr);
      }
    }

    // Always return success for security (prevent email enumeration)
    res.json({ success: true });
  } catch (err) {
    console.error('Error in forgot-booking-number:', err);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
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
    
    // Find or create client
    let { data: client } = await supabase
      .from('clients')
      .select('*')
      .ilike('email', email.trim())
      .single();

    let clientId;
    let clientNumber;

    if (!client) {
      // Create new client with a temporary number
      const tempNumber = 'TEMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert([{ email: email.trim(), parentName, childName, phone, clientNumber: tempNumber }])
        .select()
        .single();
        
      if (clientErr) throw new Error('Fehler beim Erstellen des Kundenprofils: ' + clientErr.message);
      
      clientId = newClient.id;
      clientNumber = `CNL-${10000 + clientId}`;
      
      // Update with final number
      await supabase.from('clients').update({ clientNumber }).eq('id', clientId);
    } else {
      clientId = client.id;
      clientNumber = client.clientNumber;
    }
    
    // Process each booking sequentially to ensure capacity checks are accurate
    for (const slotId of idsToBook) {
      // 1. Check capacity
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('maxCapacity, isBooked, bookings(count)')
        .eq('id', slotId)
        .single();
        
      if (slotError || !slot) throw new Error(`Slot nicht gefunden`);
      
      const bookedCount = slot.bookings[0]?.count || 0;
      if (slot.isBooked === 1 || bookedCount >= slot.maxCapacity) {
        throw new Error(`Ein Termin ist bereits ausgebucht`);
      }

      // 2. Insert booking
      const { data: booking, error: insertError } = await supabase
        .from('bookings')
        .insert([{ slotId, parentName, childName, email: email.trim(), phone, notes: notes || '', clientId }])
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
            const dateStr = startDate.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = `${startDate.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })} Uhr`;
            const typeStr = slot.type === 'einzel' ? 'Einzelsetting' : 'Gruppensetting';
            return `<li><strong>${dateStr}</strong> (${timeStr}) - ${typeStr}</li>`;
          }).join('') + '</ul>';
        }

        const emailHtml = getBookingConfirmationEmail(
          parentName,
          childName,
          clientNumber,
          slotsHtml
        );

        await resend.emails.send({
          from: 'Caniluma <info@termine.caniluma.de>',
          to: [email],
          subject: 'Ihre Buchungsanfrage bei Caniluma',
          html: emailHtml
        });
        
        console.log('Confirmation email sent to', email);

        // Send notification to admin
        const adminEmailHtml = getAdminNotificationEmail(
          parentName,
          childName,
          email,
          phone,
          notes,
          clientNumber,
          slotsHtml
        );

        const adminEmail = process.env.ADMIN_EMAIL || 'info@caniluma.de';
        await resend.emails.send({
          from: 'Caniluma <info@termine.caniluma.de>',
          to: adminEmail,
          subject: `Neue Buchung: ${childName} (CNL-${10000 + bookingIds[0]})`,
          html: adminEmailHtml
        });
        
        console.log('Admin notification email sent to', adminEmail);
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
        // We don't throw here because the booking was successful
      }
    } else {
      console.log('RESEND_API_KEY not set, skipping email confirmation');
    }

    res.json({ success: true, bookingIds, clientNumber });
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
