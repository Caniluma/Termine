import https from 'https';
import fs from 'fs';

const file = fs.createWriteStream("public/icon.png");
https.get("https://caniluma.de/wp-content/uploads/2026/03/Caniluma-App-Icon.png", function(response) {
  response.pipe(file);
});
