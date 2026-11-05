// 5K.STUDIO site build — no dependencies. Reads content/site.json + src/*, writes dist/.
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const C = JSON.parse(fs.readFileSync(path.join(root, "content/site.json"), "utf8"));
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const txt = s => esc(s).replace(/\n/g, "<br>");          // line breaks typed in the CMS become <br>
const get = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const media = p => esc(p || "");
const T = (k, v) => `<x-t data-k="${k}">${txt(v)}</x-t>`;   // editable text (edit mode)
const REPO = process.env.GITHUB_REPOSITORY || "park800520-bit/5kstudio-official";

const blocks = {
  HERO_VIDEOS: C.hero.slides.map((s, i) =>
    `<video src="${media(s.video)}" poster="${media(s.poster)}" data-client="${esc(s.client)}" data-title="${esc(s.title)}" data-i="${i}" muted playsinline preload="${i ? "metadata" : "auto"}"${i ? "" : ' class="on"'}></video>`).join("\n  "),
  WHAT_COLUMNS: C.what.columns.map((col, i) =>
    `<ul>${col.items.map((it, j) => `<li>${j === 0 ? `<b>${String(i + 1).padStart(2, "0")}</b> ` : ""}${T(`what.columns.${i}.items.${j}`, it)}</li>`).join("")}</ul>`).join(""),
  APPROACH_ROWS: C.approach.rows.map((r, i) =>
    `<div class="row" tabindex="0"><span class="n">(${String(i + 1).padStart(2, "0")})</span><h3><span class="t">${T(`approach.rows.${i}.title`, r.title)}</span></h3><span></span><p>${T(`approach.rows.${i}.desc`, r.desc)}</p></div>`).join("\n  "),
  CASE_FILTERS: (() => {
    const items = C.cases.items, cats = [...new Set(items.map(c => c.category))];
    const btn = (k, label, n, on) => `<button type="button" data-k="${esc(k)}" aria-pressed="${on}">${esc(label)}<sup>${n}</sup></button>`;
    return [btn("all", "전체", items.length, true)].concat(cats.map(k => btn(k, k, items.filter(c => c.category === k).length, false))).join("");
  })(),
  CASE_META: (() => { const n = C.cases.items.length, b = new Set(C.cases.items.map(c => c.client.trim())).size;
    return `<span>${String(n).padStart(2, "0")} Projects</span><span>${String(b).padStart(2, "0")} Brands</span>`; })(),
  // 카테고리 → 브랜드 → 작품 순서로 묶어서 보여줌 (순서는 목록에 처음 나온 순서)
  CASE_ITEMS: (() => {
    const items = C.cases.items.map((c, i) => ({ ...c, i })), cats = [...new Set(items.map(c => c.category))];
    let no = 0;
    return cats.map((cat, ci) => {
      const inCat = items.filter(c => c.category === cat), brands = [...new Set(inCat.map(c => c.client.trim()))];
      const rows = brands.map(br => {
        const its = inCat.filter(c => c.client.trim() === br), all = items.filter(c => c.client.trim() === br);
        const also = all.slice(1).map(c => `cases.items.${c.i}.client`).join(",");
        const cards = its.map(c => { no++;
          return `<article class="c${c.vertical ? " vert" : ""}" data-cat="${esc(c.category)}" data-i="${c.i}"><div class="v"><img src="${media(c.poster)}" alt="${esc(c.client)} ${esc(c.title)}" loading="lazy" data-mi="cases.items.${c.i}.poster"><video muted loop playsinline preload="none" data-src="${media(c.video)}" data-mv="cases.items.${c.i}.video"></video><span class="no mono">${String(no).padStart(2, "0")}</span></div><div class="cap"><span class="t">${T(`cases.items.${c.i}.title`, c.title)}</span><span class="k mono">${c.vertical ? "Vertical" : "Film"}</span></div></article>`; }).join("");
        const units = its.reduce((n, c) => n + (c.vertical ? 3 : 4), 0);
        return `<div class="wk-brand" style="--span:${Math.min(12, units)};--n:${its.length}"><div class="wk-bh"><h4><x-t data-k="cases.items.${its[0].i}.client" data-also="${also}">${txt(its[0].client)}</x-t></h4><span class="mono">${String(its.length).padStart(2, "0")} ${its.length > 1 ? "Works" : "Work"}</span></div><div class="wk-cards">${cards}</div></div>`;
      }).join("");
      return `<div class="wk-cat" data-cat="${esc(cat)}"><div class="wk-ch"><span class="mono">${String(ci + 1).padStart(2, "0")}</span><h3>${esc(cat)}</h3><span class="mono">${inCat.length} works · ${brands.length} brands</span></div><div class="wk-brands">${rows}</div></div>`;
    }).join("\n    ");
  })(),
  VISION_POINTS: C.vision.points.map((p, i) => `<p><b>${T(`vision.points.${i}.title`, p.title)}</b> ${T(`vision.points.${i}.body`, p.body)}</p>`).join(""),
  STEP_ITEMS: C.steps.items.map((s, i) =>
    `<div><span class="k">[${i + 1}] · ${T(`steps.items.${i}.phase`, s.phase)}</span><h3>${T(`steps.items.${i}.name`, s.name)}</h3><p>${T(`steps.items.${i}.desc`, s.desc)}</p><span class="o">→ ${T(`steps.items.${i}.output`, s.output)}</span></div>`).join(""),
  CLIENT_CATS: C.clients.categories.map((c, i) => `<span>${T(`clients.categories.${i}.name`, c.name)}<sup>(${T(`clients.categories.${i}.count`, c.count)})</sup></span>`).join(""),
  CLIENT_COLS: (() => { const n = C.clients.names, per = Math.ceil(n.length / 3), out = [];
    for (let i = 0; i < 3; i++) out.push(`<ul class="mono">${n.slice(i * per, i * per + per).map((x, j) => `<li>${T(`clients.names.${i * per + j}`, x)}</li>`).join("")}</ul>`);
    return out.join(""); })(),
  YEAR: String(new Date().getFullYear()),
  NAV: (() => { const it = ((C.nav && C.nav.items) || []).map((n, i) => `<a href="#${esc(n.target || "top")}">${T(`nav.items.${i}.label`, n.label)}</a>`);
    const k = it.length; if (k <= 3) return it.map(a => `<div>${a}</div>`).join("");
    return `<div>${it.slice(0, k - 2).join("")}</div><div>${it[k - 2]}</div><div>${it[k - 1]}</div>`; })(),
  REPO: esc(REPO),
  WEBFONTS: fs.readFileSync(path.join(root, "src/fonts.json"), "utf8").replace(/\s+/g, " "),
  FONTLINKS: (() => { const F = JSON.parse(fs.readFileSync(path.join(root, "src/fonts.json"), "utf8")), used = new Set(Object.values((C.layout && C.layout.offsets) || {}).filter(o => o.f && o.fs === "web").map(o => o.f));
    return F.filter(f => used.has(f[0])).map(f => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f[0].replace(/ /g, "+")}${f[1] ? ":" + f[1] : ""}&display=swap">`).join("\n"); })(),
  OFFSETS: JSON.stringify((C.layout && C.layout.offsets) || {}).replace(/</g, "\\u003c"),
};

let html = fs.readFileSync(path.join(root, "src/template.html"), "utf8");
// cache-busting version for css/js so browsers never mix old and new files
const VER = (await import("node:crypto")).createHash("md5").update(["style.css", "site.js", "edit.js"].map(f => fs.readFileSync(path.join(root, "src", f))).join("")).digest("hex").slice(0, 8);
html = html.replace('href="style.css"', `href="style.css?v=${VER}"`).replace('src="site.js"', `src="site.js?v=${VER}"`);

// sections: reorder / hide by content.layout.sections
const SEC_RE = /<section[^>]*data-sec="(\w+)"[\s\S]*?<\/section>\n?/g;
const chunks = {}, tplOrder = [];
html = html.replace(SEC_RE, (m, id) => { chunks[id] = m; tplOrder.push(id); return tplOrder.length === 1 ? "<!--SECTIONS-->" : ""; });
const lay = (C.layout && C.layout.sections) || [];
const order = lay.map(x => x.id).filter(id => chunks[id]).concat(tplOrder.filter(id => !lay.some(x => x.id === id)));
const hidden = new Set(lay.filter(x => x.hidden).map(x => x.id));
const SECTIONS = order.map(id => hidden.has(id) ? chunks[id].replace(/^<section/, "<section hidden") : chunks[id]).join("\n");
html = html.replace("<!--SECTIONS-->", SECTIONS);
html = html.replace(/<!--([A-Z_]+)-->/g, (m, k) => (k in blocks ? blocks[k] : m));
// placeholders in <body> text become editable <x-t>; those in tags/attributes or <head> stay plain
const bodyAt = html.indexOf("<body");
html = html.replace(/\{\{([\w.]+)\}\}/g, (m, k, at, all) => {
  const inTag = all.lastIndexOf("<", at) > all.lastIndexOf(">", at);
  return at > bodyAt && !inTag ? T(k, get(C, k)) : txt(get(C, k));
});

const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, "index.html"), html);
for (const f of ["style.css", "site.js", "edit.js"]) fs.copyFileSync(path.join(root, "src", f), path.join(dist, f));
fs.cpSync(path.join(root, "media"), path.join(dist, "media"), { recursive: true });
if (fs.existsSync(path.join(root, "CNAME"))) fs.copyFileSync(path.join(root, "CNAME"), path.join(dist, "CNAME"));
fs.writeFileSync(path.join(dist, ".nojekyll"), "");
console.log("built dist/index.html", (html.length / 1024).toFixed(1) + "KB");
