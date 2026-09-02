#!/usr/bin/env node
/*
 * Bumps APP_VERSION in index.html and keeps the service worker's cache name in
 * step, so a new version always serves fresh files instead of a stale cache.
 *
 *   node tools/bump.js            # patch: 1.2.3 -> 1.2.4
 *   node tools/bump.js minor      # 1.2.3 -> 1.3.0
 *   node tools/bump.js major      # 1.2.3 -> 2.0.0
 *   node tools/bump.js 2.5.1      # set it explicitly
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HTML = path.join(ROOT, "index.html");
const SW = path.join(ROOT, "sw.js");
const VERSION_RE = /const APP_VERSION = "(\d+)\.(\d+)\.(\d+)";/;
const CACHE_RE = /const CACHE = "time-manager-[^"]*";/;

function bump(current, how) {
  if (/^\d+\.\d+\.\d+$/.test(how || "")) return how;
  let [maj, min, pat] = current.split(".").map(Number);
  if (how === "major") return `${maj + 1}.0.0`;
  if (how === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

const html = fs.readFileSync(HTML, "utf8");
const m = html.match(VERSION_RE);
if (!m) { console.error("bump: APP_VERSION not found in index.html"); process.exit(1); }

const current = `${m[1]}.${m[2]}.${m[3]}`;
const next = bump(current, process.argv[2]);
if (next === current) { console.log(`bump: already ${current}`); process.exit(0); }

fs.writeFileSync(HTML, html.replace(VERSION_RE, `const APP_VERSION = "${next}";`));

const sw = fs.readFileSync(SW, "utf8");
if (!CACHE_RE.test(sw)) { console.error("bump: CACHE not found in sw.js"); process.exit(1); }
fs.writeFileSync(SW, sw.replace(CACHE_RE, `const CACHE = "time-manager-${next}";`));

console.log(`bump: ${current} -> ${next}`);
