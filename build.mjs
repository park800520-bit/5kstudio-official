// 5K.STUDIO site build — no dependencies. Reads content/site.json + src/*, writes dist/.
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const C = JSON.parse(fs.readFileSync(path.join(root, "content/site.json"), "utf8"));
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const txt = s => esc(s).replace(/\n/g, "<br>");          // line breaks typed in the CMS become <br>
const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const media = p => esc(p || "");

const blocks = {
  HERO_VIDEOS: C.hero.slides.map((s, i) =>
    `<video src="${media(s.video)}" poster="${media(s.poster)}" data-client="${esc(s.client)}" data-title="${esc(s.title)}" muted playsinline preload="${i ? "metadata" : "auto"}"${i ? "" : ' class="on"'}></video>`).join("\n  "),
  WHAT_COLUMNS: C.what.columns.map((col, i) =>
    `<ul>${col.items.map((it, j) => `<li>${j === 0 ? `<b>${String(i + 1).padStart(2, "0")}</b> ` : ""}${esc(it)}</li>`).join("")}</ul>`).join(""),
  APPROACH_ROWS: C.approach.rows.map((r, i) =>
    `<div class="row" tabindex="0"><span class="n">(${String(i + 1).padStart(2, "0")})</span><h3><span class="t">${esc(r.title)}</span></h3><span></span><p>${txt(r.desc)}</p></div>`).join("\n  "),
  CASE_FILTERS: (() => {
    const cats = [...new Set(C.cases.items.map(c => c.category))];
    return [`<button type="button" data-k="all" aria-pressed="true">전체 (${C.cases.items.length})</button>`]
      .concat(cats.map(k => `<button type="button" data-k="${esc(k)}" aria-pressed="false">${esc(k)} (${C.cases.items.filter(c => c.category === k).length})</button>`)).join("");
  })(),
  CASE_ITEMS: C.cases.items.map(c =>
    `<article class="c${c.vertical ? " vert" : ""}" data-cat="${esc(c.category)}"><div class="v"><img src="${media(c.poster)}" alt="${esc(c.client)} ${esc(c.title)}" loading="lazy">${c.video ? `<video muted loop playsinline preload="none" data-src="${media(c.video)}"></video>` : ""}</div><div class="cap mono"><span>${esc(c.client)}</span><span>${esc(c.title)}</span></div></article>`).join("\n    "),
  VISION_POINTS: C.vision.points.map(p => `<p><b>${esc(p.title)}</b> ${txt(p.body)}</p>`).join(""),
  STEP_ITEMS: C.steps.items.map((s, i) =>
    `<div><span class="k">[${i + 1}] · ${esc(s.phase)}</span><h3>${esc(s.name)}</h3><p>${txt(s.desc)}</p><span class="o">→ ${esc(s.output)}</span></div>`).join(""),
  CLIENT_CATS: C.clients.categories.map(c => `<span>${esc(c.name)}<sup>(${esc(c.count)})</sup></span>`).join(""),
  CLIENT_COLS: (() => { const n = C.clients.names, per = Math.ceil(n.length / 3), out = [];
    for (let i = 0; i < 3; i++) out.push(`<ul class="mono">${n.slice(i * per, i * per + per).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`);
    return out.join(""); })(),
  YEAR: String(new Date().getFullYear()),
};

let html = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
html = html.replace(/<!--([A-Z_]+)-->/g, (m, k) => (k in blocks ? blocks[k] : m));
html = html.replace(/\{\{([\w.]+)\}\}/g, (m, k) => txt(get(C, k)));

const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, "index.html"), html);
for (const f of ["style.css", "site.js"]) fs.copyFileSync(path.join(root, "src", f), path.join(dist, f));
fs.cpSync(path.join(root, "media"), path.join(dist, "media"), { recursive: true });
if (fs.existsSync(path.join(root, "CNAME"))) fs.copyFileSync(path.join(root, "CNAME"), path.join(dist, "CNAME"));
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
console.log("built dist/index.html", (html.length / 1024).toFixed(1) + "KB");
