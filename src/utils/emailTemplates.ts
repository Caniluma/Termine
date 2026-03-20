export const getAdminNotificationEmail = (
  parentName: string,
  childName: string,
  email: string,
  phone: string,
  notes: string,
  bookingNumber: string,
  slotsHtml: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #3f3a34; 
          line-height: 1.6; 
          margin: 0;
          padding: 0;
          background-color: #f6f3ed;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px; 
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border: 1px solid #e9e2d7;
        }
        .header { 
          margin: 0;
          padding: 0;
          background-color: #c7c1b3;
        }
        .header-image { 
          width: 100%;
          display: block;
          height: auto;
        }
        .content { 
          font-size: 16px;
          padding: 36px 40px 30px 40px;
        }
        h2 {
          color: #5f6b53;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 26px;
        }
        p {
          margin: 0 0 16px 0;
        }
        .info-box {
          background-color: #fcfaf7;
          border: 1px solid #e4dbcf;
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: 600;
          color: #8a6a5a;
          display: inline-block;
          width: 120px;
        }
        .slots-container {
          background-color: #fcfaf7;
          border: 1px solid #e4dbcf;
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0 24px 0;
        }
        .btn-wrap {
          text-align: center;
          margin-top: 30px;
        }
        .btn { 
          display: inline-block; 
          padding: 14px 28px; 
          background-color: #8d9b79;
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 999px; 
          font-weight: 600; 
          text-align: center;
        }
        .footer { 
          text-align: center; 
          font-size: 13px; 
          color: #7b746a; 
          padding: 22px 30px 28px 30px; 
          border-top: 1px solid #eee6db;
          background-color: #fcfaf7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img
            src="https://caniluma.de/wp-content/uploads/2026/03/Caniluma-Email-Header.png"
            alt="Caniluma Header"
            class="header-image"
          />
        </div>
        
        <div class="content">
          <h2>Neue Buchung eingegangen!</h2>
          <p>Es wurde soeben ein neuer Termin über die App gebucht.</p>
          
          <div class="info-box">
            <div class="info-row"><span class="info-label">Buchungsnr:</span> ${bookingNumber}</div>
            <div class="info-row"><span class="info-label">Elternteil:</span> ${parentName}</div>
            <div class="info-row"><span class="info-label">Kind:</span> ${childName}</div>
            <div class="info-row"><span class="info-label">E-Mail:</span> <a href="mailto:${email}">${email}</a></div>
            <div class="info-row"><span class="info-label">Telefon:</span> ${phone}</div>
            <div class="info-row"><span class="info-label">Anmerkungen:</span> ${notes || '-'}</div>
          </div>
          
          <p><strong>Gebuchte Termine:</strong></p>
          <div class="slots-container">
            ${slotsHtml}
          </div>
          
          <div class="btn-wrap">
            <a href="https://termine-theta.vercel.app/admin" class="btn">Zum Admin-Dashboard</a>
          </div>
        </div>

        <div class="footer">
          <p><strong>Caniluma</strong> – Tiergestützte Förderung für Kinder und Jugendliche</p>
          <p>Diese E-Mail wurde automatisch vom Buchungssystem generiert.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
export const getBookingConfirmationEmail = (
  parentName: string,
  childName: string,
  bookingNumber: string,
  slotsHtml: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #3f3a34; 
          line-height: 1.6; 
          margin: 0;
          padding: 0;
          background-color: #f6f3ed;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px; 
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border: 1px solid #e9e2d7;
        }
        .header { 
          margin: 0;
          padding: 0;
          background-color: #c7c1b3;
        }
        .header-image { 
          width: 100%;
          display: block;
          height: auto;
        }
        .content { 
          font-size: 16px;
          padding: 36px 40px 30px 40px;
        }
        h2 {
          color: #5f6b53;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 26px;
        }
        p {
          margin: 0 0 16px 0;
        }
        .booking-number { 
          background-color: #f3eee6; 
          padding: 16px; 
          border-radius: 10px; 
          font-family: monospace; 
          font-size: 20px; 
          text-align: center; 
          margin: 28px 0; 
          color: #3f3a34;
          border: 1px solid #ddd2c2; 
        }
        .slots-container {
          background-color: #fcfaf7;
          border: 1px solid #e4dbcf;
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0 24px 0;
        }
        .btn-wrap {
          text-align: center;
          margin-top: 30px;
        }
        .btn { 
          display: inline-block; 
          padding: 14px 28px; 
          background-color: #8d9b79;
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 999px; 
          font-weight: 600; 
          text-align: center;
        }
        .footer { 
          text-align: center; 
          font-size: 13px; 
          color: #7b746a; 
          padding: 22px 30px 28px 30px; 
          border-top: 1px solid #eee6db;
          background-color: #fcfaf7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img
            src="https://caniluma.de/wp-content/uploads/2026/03/Caniluma-Email-Header.png"
            alt="Caniluma Header"
            class="header-image"
          />
        </div>
        
        <div class="content">
          <h2>Ihre Terminbestätigung</h2>
          <p>Hallo ${parentName},</p>
          <p>vielen Dank für Ihre Buchung bei Caniluma für <strong>${childName}</strong>.</p>
          <p>hiermit bestätigen wir Ihren gebuchten Termin verbindlich.</p>
          
          <div class="booking-number">
            Ihre Buchungsnummer: <strong>${bookingNumber}</strong>
          </div>
          
          <p>Folgender Termin wurde für Sie reserviert:</p>
          <div class="slots-container">
            ${slotsHtml}
          </div>
          
          <p>Wir freuen uns darauf, Sie bei Caniluma begrüßen zu dürfen.</p>
          
          <div class="btn-wrap">
            <a href="https://termine-theta.vercel.app/?booking=${bookingNumber}" class="btn">Zu meiner Buchungsübersicht</a>
          </div>
        </div>

        <div class="footer">
          <p><strong>Caniluma</strong> – Tiergestützte Förderung für Kinder und Jugendliche</p>
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie bei Fragen direkt auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getCancellationEmail = (
  parentName: string,
  childName: string,
  bookingNumber: string,
  dateStr: string,
  timeStr: string,
  typeStr: string
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #3f3a34; 
          line-height: 1.6; 
          margin: 0;
          padding: 0;
          background-color: #f6f3ed;
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: #ffffff;
          border-radius: 16px; 
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border: 1px solid #e9e2d7;
        }
        .header { 
          margin: 0;
          padding: 0;
          background-color: #c7c1b3;
        }
        .header-image { 
          width: 100%;
          display: block;
          height: auto;
        }
        .content { 
          font-size: 16px;
          padding: 36px 40px 30px 40px;
        }
        h2 {
          color: #8a6a5a;
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 26px;
        }
        p {
          margin: 0 0 16px 0;
        }
        .alert-box { 
          background-color: #f8f3ef; 
          border-left: 4px solid #b9846b; 
          padding: 20px; 
          margin: 26px 0; 
          border-radius: 0 10px 10px 0;
          color: #4a4139;
        }
        .btn-wrap {
          text-align: center;
          margin-top: 30px;
        }
        .btn { 
          display: inline-block; 
          padding: 14px 28px; 
          background-color: #7f8c6d;
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 999px; 
          font-weight: 600; 
          text-align: center;
        }
        .footer { 
          text-align: center; 
          font-size: 13px; 
          color: #7b746a; 
          padding: 22px 30px 28px 30px; 
          border-top: 1px solid #eee6db;
          background-color: #fcfaf7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img
            src="https://caniluma.de/wp-content/uploads/2026/03/Caniluma-Email-Header.png"
            alt="Caniluma Header"
            class="header-image"
          />
        </div>
        
        <div class="content">
          <h2>Stornierung Ihres Termins</h2>
          <p>Hallo ${parentName},</p>
          <p>wir müssen Ihnen leider mitteilen, dass Ihr Termin bei Caniluma für <strong>${childName}</strong> (Buchungsnummer: ${bookingNumber}) storniert wurde.</p>
          
          <div class="alert-box">
            <p style="margin: 0 0 10px 0;"><strong>Datum:</strong> ${dateStr}</p>
            <p style="margin: 0 0 10px 0;"><strong>Uhrzeit:</strong> ${timeStr}</p>
            <p style="margin: 0;"><strong>Art:</strong> ${typeStr}</p>
          </div>
          
          <p>Falls Sie Fragen haben oder einen Ersatztermin vereinbaren möchten, antworten Sie gerne auf diese E-Mail oder buchen Sie einen neuen Termin über unsere App.</p>
          
          <div class="btn-wrap">
            <a href="https://termine-theta.vercel.app/" class="btn">Jetzt neuen Termin buchen</a>
          </div>
        </div>

        <div class="footer">
          <p><strong>Caniluma</strong> – Tiergestützte Förderung für Kinder und Jugendliche</p>
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie bei Fragen direkt auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
