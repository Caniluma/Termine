# Caniluma Terminbuchung

Terminbuchungs-App für Caniluma mit öffentlicher Buchungsseite, Admin-Verwaltung, Supabase-Backend und E-Mail-Versand über Resend.

## Verwendeter Stack

- React + Vite
- TypeScript
- Express
- Supabase
- Resend
- Tailwind CSS v4

## Lokale Entwicklung

1. Abhängigkeiten installieren
   `npm install`
2. Umgebungsvariablen anlegen
   `.env` oder `.env.local` auf Basis von `.env.example` erstellen
3. Entwicklungsserver starten
   `npm run dev`

Die App läuft standardmäßig unter `http://localhost:3000`.

## Benötigte Umgebungsvariablen

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`

## Hinweise

- Die SQL-Struktur liegt in `supabase/schema.sql`.
- Antworten auf E-Mails gehen nur dann sicher an die gewünschte Adresse, wenn `EMAIL_REPLY_TO` gesetzt ist.
- Für den produktiven Versand muss die Absender-Domain in Resend verifiziert sein.
