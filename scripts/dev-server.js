#!/usr/bin/env node
/**
 * Zero-dependency static file server for local preview.
 * Needed because fetch() of local CSV files is blocked by CORS under
 * file://, so opening index.html directly won't load the dashboards.
 *
 * Usage:  node scripts/dev-server.js [port]
 * Then open http://localhost:<port>/
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null; // block path traversal
  return resolved;
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(ROOT, req.url);
  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        const notFoundPath = path.join(ROOT, '404.html');
        fs.readFile(notFoundPath, (nfErr, nfData) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(nfErr ? 'Not found' : nfData);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Pick Smarter dev server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
