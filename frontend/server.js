const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HTML_FILE = path.join(__dirname, "public", "index.html");

const server = http.createServer((req, res) => {
  // Always serve index.html for SPA routes
  fs.readFile(HTML_FILE, "utf8", (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Internal Server Error: ${err.message}`);
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ▲ SOLANA VAULT DASHBOARD`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://127.0.0.1:${PORT}\n`);
  console.log(`  ✓ Ready and active. Press Ctrl+C to stop.\n`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
