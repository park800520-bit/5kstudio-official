/* 5K.STUDIO 편집 모드 — 홈페이지 주소 뒤에 ?edit 를 붙여 열면 켜집니다.
   글자를 클릭해 바로 고치고, 영상·이미지는 버튼으로 교체한 뒤 [저장하기]를 누르면
   GitHub에 한 번에 저장되고 1~2분 뒤 사이트에 반영됩니다. */
(function () {
  const REPO = (document.querySelector('meta[name="k-repo"]') || {}).content || "park800520-bit/5kstudio-official";
  const API = "https://api.github.com/repos/" + REPO;
  const TOK_KEY = "5k_edit_token";
  const MAX_MB = 25, WARN_MB = 10;
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} } };

  let tok = store.get(TOK_KEY), J = null;
  const sets = new Map(), del = new Set(), adds = [], media = new Map();
  let moved = 0;
  const SEC = { top: "맨 위(메인 영상)", statement: "소개 문장", what: "우리가 하는 일", approach: "일하는 방식", featured: "대표 작품", cases: "주요 작업", cta: "문의 유도 문구", vision: "핵심 가치", steps: "9단계 프로세스", clients: "클라이언트", contact: "문의(맨 아래)" };

  /* ---------- helpers ---------- */
  const $ = (t, a = {}, kids = []) => { const e = document.createElement(t); for (const k in a) k === "style" ? e.style.cssText = a[k] : k.startsWith("on") ? e.addEventListener(k.slice(2), a[k]) : e.setAttribute(k, a[k]); [].concat(kids).forEach(c => e.append(c)); return e };
  const getP = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
  const setP = (o, p, v) => { const ks = p.split("."); let a = o; ks.slice(0, -1).forEach(k => a = a[k]); a[ks.at(-1)] = v };
  const val = p => { if (sets.has(p)) return sets.get(p); const ks = p.split(".");
    for (let n = ks.length - 1; n > 0; n--) { const pre = ks.slice(0, n).join("."); if (sets.has(pre)) return getP(sets.get(pre), ks.slice(n).join(".")) }
    return getP(J, p) };
  const blobs = new Map(), src = p => blobs.get(p) || p || "";
  const hdr = () => ({ Authorization: "Bearer " + tok, Accept: "application/vnd.github+json" });
  async function gh(path, opt = {}) {
    const r = await fetch(API + path, { ...opt, headers: { ...hdr(), ...(opt.body ? { "Content-Type": "application/json" } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
    return r.json();
  }
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
  const readB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(f) });
  const pick = accept => new Promise(ok => { const i = $("input", { type: "file", accept }); i.onchange = () => ok(i.files[0] || null); i.click() });
  const count = () => sets.size + del.size + adds.length + moved;

  /* ---------- styles ---------- */
  document.head.append($("style", {}, `
  .k-edit x-t[contenteditable]{display:inline;outline:1px dashed rgba(255,80,0,.55);outline-offset:2px;cursor:text;border-radius:2px}
  .k-edit x-t[contenteditable]:hover{outline-color:#ff5000}
  .k-edit x-t[contenteditable]:focus{outline:2px solid #ff5000;background:rgba(255,80,0,.08)}
  .k-edit .row p{max-height:none!important;opacity:1!important;margin-top:10px!important}
  .k-tb{position:absolute;top:8px;left:8px;z-index:40;display:flex;gap:6px;flex-wrap:wrap;max-width:calc(100% - 16px)}
  .k-btn,.k-tb select{font:600 12px/1 "Pretendard Variable",Pretendard,sans-serif;background:#111;color:#fff;border:0;border-radius:999px;padding:8px 12px;cursor:pointer;letter-spacing:-.01em}
  .k-btn.w{background:#fff;color:#111;border:1px solid #111}.k-btn.o{background:#ff5000}.k-btn:disabled{opacity:.4;cursor:default}
  .k-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;background:#111;color:#fff;padding:10px 12px;border-radius:999px;box-shadow:0 10px 40px rgba(0,0,0,.35);font:500 13px/1.2 "Pretendard Variable",Pretendard,sans-serif;max-width:calc(100% - 24px)}
  .k-bar .k-btn{background:#2a2a2a}.k-bar .k-btn.o{background:#ff5000}
  .k-msg{padding:0 6px;color:#bbb}
  .k-hl{position:fixed;z-index:9000;display:none;pointer-events:none;outline:1.5px dashed #2962ff;border-radius:4px}
  .k-h{position:absolute;pointer-events:auto;width:26px;height:26px;border-radius:50%;background:#2962ff;color:#fff;display:flex;align-items:center;justify-content:center;font:700 14px/1 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);user-select:none;touch-action:none}
  .k-hm{left:-14px;top:-14px;cursor:move}.k-hs{right:-14px;bottom:-14px;cursor:nwse-resize}
  .k-acting,.k-acting *{user-select:none!important;-webkit-user-select:none!important}
  .k-edit .dots .hint{pointer-events:auto}
  .k-ov{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}
  .k-md{background:#fff;color:#111;border-radius:16px;padding:24px;width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;font:15px/1.5 "Pretendard Variable",Pretendard,sans-serif}
  .k-md h3{margin:0 0 6px;font-size:20px}.k-md p{margin:0 0 14px;color:#555;font-size:14px}
  .k-md label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}
  .k-md input[type=text],.k-md input[type=password],.k-md textarea,.k-md select{width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:8px;padding:10px;font:inherit}
  .k-md .row2{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
  .k-md .slide{border-top:1px solid #eee;margin-top:14px;padding-top:8px}
  .k-md ol{padding-left:20px;margin:0 0 12px;font-size:14px}.k-md ol li{margin:4px 0}
  `));

  /* ---------- modal ---------- */
  function modal(build, lock) { const ov = $("div", { class: "k-ov" + (lock ? " k-lock" : "") }), md = $("div", { class: "k-md" }); ov.append(md); const close = () => ov.remove(); if (!lock) ov.addEventListener("mousedown", e => { if (e.target === ov) close() }); build(md, close); document.body.append(ov); return close }

  /* ---------- 1. 열쇠(토큰) ---------- */
  function login(err) {
    modal((md, close) => {
      const inp = $("input", { type: "password", placeholder: "ghp_ 로 시작하는 열쇠를 붙여넣기" });
      const go = async () => { tok = inp.value.trim(); if (!tok) return; btn.disabled = true; btn.textContent = "확인 중…"; try { await start(); store.set(TOK_KEY, tok); close() } catch (e) { tok = null; btn.disabled = false; btn.textContent = "확인"; msg.textContent = "열쇠가 맞지 않아요. 다시 확인해 주세요. (" + e.message.slice(0, 60) + ")" } };
      const btn = $("button", { class: "k-btn o", onclick: go }, "확인");
      const msg = $("p", { style: "color:#d33;margin-top:10px" }, err || "");
      inp.addEventListener("keydown", e => e.key === "Enter" && go());
      md.append($("h3", {}, "편집 모드 시작"),
        $("p", {}, "이 브라우저에서 처음 한 번만 GitHub '열쇠'를 넣으면 돼요. 열쇠는 이 브라우저에만 저장됩니다."),
        $("ol", {}, [
          $("li", {}, ["아래 ", $("b", {}, "열쇠 만들기"), "를 눌러 GitHub 화면을 엽니다."]),
          $("li", {}, ["Expiration(유효기간)을 ", $("b", {}, "No expiration"), " 으로 고르고, 맨 아래 초록 버튼 ", $("b", {}, "Generate token"), "을 누릅니다."]),
          $("li", {}, ["나온 열쇠(ghp_…)를 복사해서 아래 칸에 붙여넣고 ", $("b", {}, "확인"), "을 누릅니다."])]),
        $("div", { class: "row2", style: "margin:0 0 4px" }, [$("a", { class: "k-btn w", target: "_blank", rel: "noopener", href: "https://github.com/settings/tokens/new?scopes=public_repo&description=" + encodeURIComponent("5K.STUDIO 홈페이지 편집"), style: "text-decoration:none" }, "열쇠 만들기 ↗")]),
        $("label", {}, "열쇠 붙여넣기"), inp, $("div", { class: "row2" }, [btn, $("button", { class: "k-btn w", onclick: () => { close(); exit() } }, "취소")]), msg);
      setTimeout(() => inp.focus(), 50);
    });
  }

  async function start() {
    const repo = await gh("");
    if (!repo.permissions || !repo.permissions.push) throw new Error("이 저장소에 쓰기 권한이 없는 열쇠");
    J = JSON.parse(b64dec((await gh("/contents/content/site.json?ref=main")).content));
    enable();
  }

  /* ---------- 2. 편집 켜기 ---------- */
  function enable() {
    document.body.classList.add("k-edit");
    document.querySelectorAll("x-t[data-k]").forEach(editable);
    document.addEventListener("click", e => { if (e.target.closest("x-t[contenteditable]")) e.preventDefault() }, true);
    mediaBars(); caseBars(); bar(); handles();
    addEventListener("beforeunload", e => { if (count()) { e.preventDefault(); e.returnValue = "" } });
  }
  function editable(x) {
      if (x.closest(".now")) return;
      x.setAttribute("contenteditable", "plaintext-only"); x.spellcheck = false;
      x.addEventListener("focus", () => { x._rec = false; x._start = x.innerText });
      x.addEventListener("input", () => {
        if (!x._rec) { rec(); x._rec = true }
        const k = x.dataset.k, v = x.innerText.replace(/\n$/, "");
        sets.set(k, v);
        document.querySelectorAll(`x-t[data-k="${k}"]`).forEach(o => { if (o !== x) o.innerText = v });
        if (k === "hero.wordmark") dispatchEvent(new Event("resize"));
        refresh();
      });
      x.addEventListener("keydown", e => { if (e.key === "Escape") x.blur(); if (e.key === "Enter" && x.closest("header")) { e.preventDefault(); x.blur() } });
  }

  /* ---------- 미디어 ---------- */
  async function takeFile(kind) {
    const f = await pick(kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp");
    if (!f) return null;
    const mb = f.size / 1048576;
    if (mb > MAX_MB) { toast(`파일이 ${mb.toFixed(0)}MB라 너무 커요. ${MAX_MB}MB 이하로 줄여서 올려 주세요. (웹용 10MB 이하 권장)`); return null }
    if (mb > WARN_MB) toast(`${mb.toFixed(0)}MB — 올릴 수는 있지만 사이트가 느려질 수 있어요. 10MB 이하를 권장해요.`);
    const ext = (f.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
    const slug = f.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || kind;
    const path = `media/u${Date.now().toString(36)}-${slug}.${ext}`;
    media.set(path, await readB64(f)); const url = URL.createObjectURL(f); blobs.set(path, url);
    return { path, url, file: f };
  }
  // 영상 첫 장면(1초)을 썸네일 jpg로
  function posterFrom(url) {
    return new Promise(ok => {
      const v = $("video", { muted: "", playsinline: "", preload: "auto" }); v.muted = true; v.src = url;
      v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3) };
      v.onseeked = () => { const w = Math.min(1280, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth), c = $("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h); c.toBlob(b => ok(b), "image/jpeg", .85) };
      v.onerror = () => ok(null); setTimeout(() => ok(null), 8000);
    });
  }
  async function autoPoster(url, key) {
    const b = await posterFrom(url); if (!b) return null;
    const path = `media/u${Date.now().toString(36)}-poster.jpg`;
    const ou = URL.createObjectURL(b); media.set(path, await readB64(b)); blobs.set(path, ou); sets.set(key, path); return ou;
  }

  function mediaBars() {
    const groups = new Map();
    document.querySelectorAll("[data-mv],[data-mi],[data-mp]").forEach(el => {
      if (el.closest(".hero")) return;
      const box = el.closest(".v,.bg,.m") || el.parentElement;
      if (!groups.has(box)) groups.set(box, []); groups.get(box).push(el);
    });
    groups.forEach((els, box) => {
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      const tb = $("div", { class: "k-tb" });
      els.forEach(el => {
        if (el.dataset.mv) tb.append($("button", { class: "k-btn", onclick: async e => { e.stopPropagation(); const r = await takeFile("video"); if (!r) return; rec(); sets.set(el.dataset.mv, r.path); el.dataset.src = r.url; el.src = r.url; el.play().catch(() => {});
          const art = el.closest("article.c"); if (art) { const u = await autoPoster(r.url, `cases.items.${art.dataset.i}.poster`); const im = art.querySelector("img"); if (u && im) im.src = u }
          refresh() } }, "영상 교체"));
        const pk = el.dataset.mi || el.dataset.mp;
        if (pk) tb.append($("button", { class: "k-btn w", onclick: async e => { e.stopPropagation(); const r = await takeFile("image"); if (!r) return; rec(); sets.set(pk, r.path); el.tagName === "IMG" ? el.src = r.url : el.poster = r.url; refresh() } }, el.closest(".bg") ? "배경 이미지 교체" : "썸네일 교체"));
      });
      box.append(tb);
    });
  }

  /* ---------- 작품(케이스) ---------- */
  const cats = () => [...new Set(J.cases.items.map(c => c.category).concat(adds.map(a => a.category)))];
  function caseBars() {
    document.querySelectorAll("#grid article.c[data-i]").forEach(art => {
      const i = art.dataset.i, tb = art.querySelector(".k-tb"); if (!tb) return;
      const sel = $("select", { title: "분류", onclick: e => e.stopPropagation(), onchange: () => { rec(); sets.set(`cases.items.${i}.category`, sel.value); art.dataset.cat = sel.value; refresh() } }, cats().map(c => $("option", { value: c }, c)));
      sel.value = val(`cases.items.${i}.category`);
      const vert = $("button", { class: "k-btn w", onclick: e => { e.stopPropagation(); rec(); const v = !val(`cases.items.${i}.vertical`); sets.set(`cases.items.${i}.vertical`, v); art.classList.toggle("vert", v); vert.textContent = v ? "세로형 ✓" : "가로형"; refresh() } }, val(`cases.items.${i}.vertical`) ? "세로형 ✓" : "가로형");
      const mv = d => $("button", { class: "k-btn w", title: d < 0 ? "앞으로" : "뒤로", onclick: e => { e.stopPropagation(); moveCase(art, d) } }, d < 0 ? "◀" : "▶");
      tb.prepend(mv(-1), mv(1));
      art._sel = sel; art._vert = vert;
      tb.append(sel, vert, $("button", { class: "k-btn", style: "background:#c62828", onclick: e => { e.stopPropagation(); rec(); del.add(+i); art.style.display = "none"; refresh(); toast("작품을 뺐어요. 저장하면 사이트에서 사라져요.") } }, "삭제"));
    });
  }
  function moveCase(art, d) {
    const vis = [...document.querySelectorAll("#grid article.c")].filter(a => a.style.display !== "none");
    const k = vis.indexOf(art), t = vis[k + d]; if (!t) return;
    rec(); d < 0 ? t.before(art) : t.after(art); moved++; refresh(); art.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function addCase() {
    modal((md, close) => {
      const client = $("input", { type: "text", placeholder: "예: 미래에셋증권" }), title = $("input", { type: "text", placeholder: "예: 브랜드 캠페인 필름" });
      const cat = $("select", {}, cats().map(c => $("option", { value: c }, c))), vert = $("input", { type: "checkbox" });
      let vid = null, img = null;
      const vb = $("button", { class: "k-btn w", onclick: async () => { const r = await takeFile("video"); if (r) { vid = r; vb.textContent = "영상 ✓ " + r.file.name } } }, "영상 고르기 (짧은 mp4)");
      const ib = $("button", { class: "k-btn w", onclick: async () => { const r = await takeFile("image"); if (r) { img = r; ib.textContent = "썸네일 ✓ " + r.file.name } } }, "썸네일 고르기 (선택)");
      const msg = $("p", { style: "color:#d33;margin-top:10px" });
      const ok = $("button", { class: "k-btn o", onclick: async () => {
        if (!client.value.trim() || !title.value.trim() || !vid) { msg.textContent = "클라이언트, 작품명, 영상은 꼭 넣어 주세요."; return }
        ok.disabled = true; ok.textContent = "준비 중…";
        let posterPath = img && img.path, posterUrl = img && img.url;
        if (!img) { const b = await posterFrom(vid.url); if (b) { posterPath = `media/u${Date.now().toString(36)}-poster.jpg`; media.set(posterPath, await readB64(b)); posterUrl = URL.createObjectURL(b); blobs.set(posterPath, posterUrl) } }
        const item = { client: client.value.trim(), title: title.value.trim(), category: cat.value, vertical: vert.checked, video: vid.path, poster: posterPath || "" };
        rec(); adds.push(item);
        const art = $("article", { class: "c" + (item.vertical ? " vert" : ""), "data-cat": item.category, "data-new": adds.length - 1 }, [
          $("div", { class: "v" }, [$("img", { src: posterUrl || "", alt: "" }), $("video", { src: vid.url, muted: "", loop: "", playsinline: "", autoplay: "" })]),
          $("div", { class: "cap mono" }, [$("span", {}, item.client), $("span", {}, item.title)])]);
        art.querySelector("video").muted = true; art.classList.add("playing");
        document.getElementById("grid").prepend(art); refresh(); close(); toast("새 작품을 맨 앞에 넣었어요. [저장하기]를 눌러야 사이트에 올라가요.");
      } }, "추가");
      md.append($("h3", {}, "작품 추가"), $("p", {}, "주요 작업 맨 앞에 들어가요. 영상은 짧은 웹용 루프(10MB 이하)를 권장해요. 썸네일을 안 고르면 영상에서 자동으로 만들어요."),
        $("label", {}, "클라이언트"), client, $("label", {}, "작품명"), title, $("label", {}, "분류"), cat,
        $("label", {}, [vert, " 세로형(쇼츠) 영상이에요"]), $("div", { class: "row2" }, [vb, ib]),
        $("div", { class: "row2" }, [ok, $("button", { class: "k-btn w", onclick: close }, "취소")]), msg);
    });
  }

  /* ---------- 메인 영상 / 기본 정보 ---------- */
  function field(md, label, key, area) {
    const inp = $(area ? "textarea" : "input", area ? { rows: 3 } : { type: "text" }); inp.value = val(key) ?? "";
    inp.addEventListener("focus", () => inp._rec = false);
    inp.addEventListener("input", () => { if (!inp._rec) { rec(); inp._rec = true } sets.set(key, inp.value); refresh(); onField(key, inp.value) });
    md.append($("label", {}, label), inp);
  }
  function onField(key, v) {
    const m = key.match(/^hero\.slides\.(\d+)\.(client|title)$/), H = window.__hero;
    if (m && H) { const vEl = H.vids[+m[1]]; if (vEl) vEl.dataset[m[2]] = v; if (H.cur === +m[1]) H.show(H.cur) }
  }
  function heroPanel() {
    modal((md, close) => {
      md.append($("h3", {}, "메인 영상"), $("p", {}, "맨 위에서 돌아가는 가로형 영상들이에요. 순서대로 재생돼요."));
      field(md, "재생 표시 문구", "hero.now_label");
      (J.hero.slides || []).forEach((s, i) => {
        const box = $("div", { class: "slide" }); md.append(box);
        box.append($("b", {}, `영상 ${i + 1}`));
        field(box, "클라이언트", `hero.slides.${i}.client`); field(box, "작품명", `hero.slides.${i}.title`);
        box.append($("div", { class: "row2" }, [
          $("button", { class: "k-btn w", onclick: () => { window.__hero && window.__hero.show(i); close() } }, "이 영상 보기"),
          $("button", { class: "k-btn", onclick: async () => { const r = await takeFile("video"); if (!r) return; rec(); sets.set(`hero.slides.${i}.video`, r.path); const v = window.__hero && window.__hero.vids[i]; if (v) { v.src = r.url; const u = await autoPoster(r.url, `hero.slides.${i}.poster`); if (u) v.poster = u } refresh(); toast(`영상 ${i + 1}을 바꿨어요.`) } }, "영상 교체")]));
      });
      md.append($("div", { class: "row2" }, [$("button", { class: "k-btn o", onclick: close }, "닫기")]));
    });
  }
  /* 상단 메뉴 */
  function navItems() { return (val("nav.items") || []).map((n, i) => ({ label: val(`nav.items.${i}.label`) ?? n.label, target: n.target })) }
  function renderNav(items) {
    const nav = document.querySelector("header nav"), a = items.map((n, i) => $("a", { href: "#" + n.target }, [$("x-t", { "data-k": `nav.items.${i}.label` }, n.label)]));
    nav.innerHTML = ""; const k = a.length;
    if (k <= 3) a.forEach(x => nav.append($("div", {}, x))); else nav.append($("div", {}, a.slice(0, k - 2)), $("div", {}, a[k - 2]), $("div", {}, a[k - 1]));
    nav.querySelectorAll("x-t").forEach(editable);
  }
  function navPanel() {
    let items = navItems();
    const commit = () => { [...sets.keys()].forEach(k => k.startsWith("nav.items.") && sets.delete(k)); sets.set("nav.items", items.map(n => ({ ...n }))); renderNav(items); refresh() };
    modal((md, close) => {
      const list = $("div");
      const draw = () => { list.innerHTML = ""; items.forEach((n, i) => {
        const lab = $("input", { type: "text", value: n.label, style: "flex:1;min-width:110px" }); lab.value = n.label;
        lab.addEventListener("focus", () => lab._rec = false);
        lab.addEventListener("input", () => { if (!lab._rec) { rec(); lab._rec = true } n.label = lab.value; commit() });
        const tg = $("select", { style: "flex:1;min-width:140px" }, Object.keys(SEC).map(k => $("option", { value: k }, SEC[k]))); tg.value = n.target;
        tg.addEventListener("change", () => { rec(); n.target = tg.value; commit() });
        const b = (t, f, cls = "w") => $("button", { class: "k-btn " + cls, onclick: () => { rec(); f(); commit(); draw() } }, t);
        list.append($("div", { class: "row2", style: "align-items:center;margin-top:10px" }, [lab, tg,
          b("↑", () => i && items.splice(i - 1, 0, items.splice(i, 1)[0])), b("↓", () => i < items.length - 1 && items.splice(i + 1, 0, items.splice(i, 1)[0])),
          b("삭제", () => items.splice(i, 1), "")]));
      }) };
      draw();
      md.append($("h3", {}, "상단 메뉴"), $("p", {}, "메뉴 이름을 고치고, 누르면 이동할 섹션을 고르세요. 왼쪽부터 순서대로 보여요. (휴대폰에서는 가운데 칸 메뉴가 숨겨져요)"), list,
        $("div", { class: "row2" }, [$("button", { class: "k-btn w", onclick: () => { rec(); items.push({ label: "새 메뉴", target: "top" }); commit(); draw() } }, "+ 메뉴 추가"), $("button", { class: "k-btn o", onclick: close }, "닫기")]));
    });
  }
  /* 섹션 순서 */
  function secPanel() {
    let lay = (val("layout.sections") || []).map(x => ({ ...x }));
    document.querySelectorAll("section[data-sec]").forEach(s => { if (!lay.some(x => x.id === s.dataset.sec)) lay.push({ id: s.dataset.sec, hidden: false }) });
    const apply = () => { rec(); const foot = document.querySelector("footer");
      lay.forEach(x => { const s = document.querySelector(`section[data-sec="${x.id}"]`); if (!s) return; foot.before(s); s.hidden = !!x.hidden });
      sets.set("layout.sections", lay.map(x => ({ ...x }))); dispatchEvent(new Event("resize")); refresh() };
    modal((md, close) => {
      const list = $("div");
      const draw = () => { list.innerHTML = ""; lay.forEach((x, i) => {
        const cb = $("input", { type: "checkbox" }); cb.checked = !x.hidden; cb.onchange = () => { x.hidden = !cb.checked; apply() };
        const b = (t, f) => $("button", { class: "k-btn w", onclick: () => { f(); apply(); draw() } }, t);
        list.append($("div", { class: "row2", style: "align-items:center;margin-top:8px;border-bottom:1px solid #eee;padding-bottom:8px" }, [
          $("b", { style: "flex:1;min-width:140px" }, `${i + 1}. ${SEC[x.id] || x.id}`), $("label", { style: "margin:0;font-weight:500" }, [cb, " 보이기"]),
          b("↑", () => i && lay.splice(i - 1, 0, lay.splice(i, 1)[0])), b("↓", () => i < lay.length - 1 && lay.splice(i + 1, 0, lay.splice(i, 1)[0]))]));
      }) };
      draw();
      md.append($("h3", {}, "섹션 순서"), $("p", {}, "메인 영상 아래 섹션들의 순서를 바꾸거나 숨길 수 있어요. 바로 화면에 적용돼요."), list,
        $("div", { class: "row2" }, [$("button", { class: "k-btn o", onclick: close }, "닫기")]));
    });
  }
  function infoPanel() {
    modal((md, close) => {
      md.append($("h3", {}, "기본 정보"), $("p", {}, "검색·카카오톡 공유 미리보기에 나오는 정보와 문의 이메일이에요."));
      field(md, "사이트 제목", "meta.title"); field(md, "사이트 설명", "meta.description", true); field(md, "문의 이메일", "meta.email");
      md.append($("div", { class: "row2" }, [$("button", { class: "k-btn o", onclick: close }, "닫기"),
        $("button", { class: "k-btn w", onclick: () => { store.set(TOK_KEY, null); toast("이 브라우저에서 열쇠를 지웠어요."); close() } }, "이 브라우저에서 열쇠 지우기")]));
    });
  }

  /* ---------- 마우스로 위치·크기 (글자에 마우스를 올리면 손잡이가 나타남) ---------- */
  let cur = null, act = null, dragArt = null, hl, hm, hs;
  const keyOf = x => { const k = x.dataset.k, all = [...document.querySelectorAll(`x-t[data-k="${k}"]`)], n = all.indexOf(x); return n > 0 ? `${k}@${n}` : k };
  const offs = () => JSON.parse(JSON.stringify(val("layout.offsets") || {}));
  const fitted = b => !!(b.closest("#word") || b.id === "huge");
  const applied = new Set(Object.keys(window.__koff || {}));
  function setOff(key, o) { applied.add(key); const all = offs(); if (o && (o.x || o.y || (o.s && o.s !== 1))) all[key] = o; else delete all[key]; sets.set("layout.offsets", all); window.__koff = all; refresh() }
  function look(b, o) { const z = !fitted(b) && o.s && o.s !== 1 ? o.s : 1; b.style.zoom = z !== 1 ? z : ""; b.style.translate = (o.x || o.y) ? `${(o.x || 0) / z}vw ${(o.y || 0) / z}vw` : "" }
  function target(t) {
    if (!t || !t.closest || t.closest(".k-bar,.k-ov,.k-tb,.k-hl,#grid,.now")) return null;
    let x = t.closest("x-t[data-k]");
    if (!x && t.querySelector) { const y = t.querySelector("x-t[data-k]"); if (y && window.__kblock(y) === t) x = y }
    if (!x) return null;
    const b = window.__kblock(x); return { b, key: keyOf(b.querySelector("x-t[data-k]") || x) };
  }
  function place() { if (!cur) { hl.style.display = "none"; return } const r = cur.b.getBoundingClientRect();
    Object.assign(hl.style, { display: "block", left: r.left - 4 + "px", top: r.top - 4 + "px", width: r.width + 8 + "px", height: r.height + 8 + "px" }); hs.style.display = fitted(cur.b) ? "none" : "";
    // 손잡이가 화면 밖으로 나가지 않게 안쪽으로 당김
    const bar = document.querySelector(".k-bar"), barTop = bar ? bar.getBoundingClientRect().top - 8 : innerHeight;
    hm.style.left = r.left < 18 ? "4px" : ""; hm.style.top = r.top < 18 ? "4px" : "";
    hs.style.right = r.right > innerWidth - 22 ? "4px" : ""; hs.style.bottom = r.bottom > barTop - 18 ? Math.min(r.height - 30, r.bottom - barTop + 22) + "px" : "" }
  function handles() {
    hm = $("b", { class: "k-h k-hm", title: "끌어서 옮기기 · 더블클릭하면 제자리" }, "✥");
    hs = $("b", { class: "k-h k-hs", title: "끌어서 크기 조절 · 더블클릭하면 원래 크기" }, "⤡");
    hl = $("div", { class: "k-hl" }, [hm, hs]); document.body.append(hl);
    // 손잡이로 가는 동안 다른 글자로 바뀌지 않도록: 현재 글자 영역·손잡이 근처에 있으면 유지
    const near = (e, el) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6 };
    const nearH = e => [hm, hs].some(h => { const r = h.getBoundingClientRect(); return r.width && Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 18 });
    document.addEventListener("pointermove", e => { if (act) return; if (cur && (nearH(e) || near(e, cur.b))) return;
      const m = target(e.target); if (m && (!cur || m.b !== cur.b)) { cur = m; place() } });
    addEventListener("scroll", () => !act && place(), { passive: true }); addEventListener("resize", () => place());
    window.__kstate = () => ({ cur: cur && cur.key, act: !!act, inDoc: !!(cur && cur.b.isConnected) });
    const start = (kind, e) => { if (!cur) return; e.preventDefault(); e.stopPropagation(); const o = offs()[cur.key] || {};
      act = { kind, ...cur, sx: e.clientX, sy: e.clientY, o: { x: o.x || 0, y: o.y || 0, s: o.s || 1 }, w: cur.b.getBoundingClientRect().width }; act.n = { ...act.o };
      document.body.classList.add("k-acting"); if (innerWidth < 900) toast("위치·크기 조정은 PC 화면(가로 900px 이상)에서만 적용돼요") };
    hm.addEventListener("pointerdown", e => start("move", e)); hs.addEventListener("pointerdown", e => start("size", e));
    addEventListener("pointermove", e => { if (!act) return; if (!act.recd) { rec(); act.recd = true } const dx = e.clientX - act.sx, dy = e.clientY - act.sy;
      if (act.kind === "move") { const vw = 100 / innerWidth; act.n.x = +(act.o.x + dx * vw).toFixed(2); act.n.y = +(act.o.y + dy * vw).toFixed(2) }
      else act.n.s = +Math.min(4, Math.max(.3, act.o.s * (1 + (dx + dy) / 2 / Math.max(120, act.w * .6)))).toFixed(2);
      look(act.b, act.n); place() });
    addEventListener("pointerup", () => { if (!act) return; setOff(act.key, act.n); act = null; document.body.classList.remove("k-acting"); place() });
    hm.addEventListener("dblclick", () => { if (!cur) return; rec(); const o = offs()[cur.key] || {}; const n = { ...o, x: 0, y: 0 }; look(cur.b, n); setOff(cur.key, n); place() });
    hs.addEventListener("dblclick", () => { if (!cur) return; rec(); const o = offs()[cur.key] || {}; const n = { ...o, s: 1 }; look(cur.b, n); setOff(cur.key, n); place() });
    // 작품 카드: ✥ 손잡이를 잡고 끌어서 순서 변경
    const grid = document.getElementById("grid");
    grid.querySelectorAll("article.c .k-tb").forEach(tb => tb.prepend($("button", { class: "k-btn", title: "끌어서 순서 변경", style: "cursor:grab", onpointerdown: e => { e.target.closest("article.c").draggable = true } }, "✥")));
    grid.addEventListener("dragstart", e => { dragArt = e.target.closest && e.target.closest("article.c"); if (!dragArt) return; rec(); e.dataTransfer.effectAllowed = "move"; dragArt.style.opacity = .4 });
    grid.addEventListener("dragover", e => { if (!dragArt) return; e.preventDefault(); const t = e.target.closest("article.c"); if (!t || t === dragArt) return; const r = t.getBoundingClientRect(); e.clientX < r.left + r.width / 2 ? t.before(dragArt) : t.after(dragArt) });
    grid.addEventListener("dragend", () => { if (!dragArt) return; dragArt.style.opacity = ""; dragArt.draggable = false; dragArt = null; moved++; refresh() });
  }

  /* ---------- 되돌리기 (최대 20단계) ---------- */
  const hist = [], redo = [], LIMIT = 20; let undoBtn;
  const clone = v => v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
  const gridEl = () => document.getElementById("grid");
  const snapshot = () => ({ sets: new Map([...sets].map(([k, v]) => [k, clone(v)])), del: new Set(del), adds: adds.slice(), moved, order: [...gridEl().querySelectorAll("article.c")] });
  function rec() { hist.push(snapshot()); if (hist.length > LIMIT) hist.shift(); redo.length = 0; refresh() }
  function restore(sn) {
    sets.clear(); sn.sets.forEach((v, k) => sets.set(k, clone(v))); del.clear(); sn.del.forEach(i => del.add(i));
    adds.splice(0, adds.length, ...sn.adds); moved = sn.moved;
    document.querySelectorAll(".k-ov:not(.k-lock)").forEach(o => o.remove());
    sync(sn.order); refresh();
  }
  function undo() { if (!hist.length) return toast("더 되돌릴 게 없어요"); redo.push(snapshot()); restore(hist.pop()); toast(`되돌렸어요 · 남은 단계 ${hist.length}`) }
  function redoFn() { if (!redo.length) return; hist.push(snapshot()); restore(redo.pop()); toast("다시 했어요") }
  // 현재 상태(sets 등)를 화면에 다시 맞춤
  function sync(order) {
    renderNav(navItems());
    document.querySelectorAll("x-t[data-k]").forEach(x => { const v = val(x.dataset.k); if (v != null && typeof v !== "object" && x.innerText !== String(v)) x.innerText = String(v) });
    // 위치·크기
    const O = val("layout.offsets") || {}; window.__koff = O;
    new Set([...applied, ...Object.keys(O)]).forEach(k => { const x = window.__kfind(k); if (x) look(window.__kblock(x), O[k] || {}); applied.add(k) });
    // 섹션
    const foot = document.querySelector("footer");
    (val("layout.sections") || []).forEach(x => { const sc = document.querySelector(`section[data-sec="${x.id}"]`); if (sc) { foot.before(sc); sc.hidden = !!x.hidden } });
    // 메인 영상
    const H = window.__hero;
    if (H) { let ch = false; H.vids.forEach((v, i) => { const c = val(`hero.slides.${i}.client`), t = val(`hero.slides.${i}.title`), vs = src(val(`hero.slides.${i}.video`)), ps = src(val(`hero.slides.${i}.poster`));
      if (v.dataset.client !== c || v.dataset.title !== t) { v.dataset.client = c; v.dataset.title = t; ch = true }
      if (v.getAttribute("src") !== vs) { v.src = vs; ch = true } if (v.getAttribute("poster") !== ps) v.poster = ps }); if (ch) H.show(H.cur) }
    // 대표 작품·배경 이미지
    document.querySelectorAll("[data-mv],[data-mp],img[data-mi]").forEach(el => { if (el.closest("article.c,.hero")) return;
      if (el.dataset.mv) { const s2 = src(val(el.dataset.mv)); if (el.getAttribute("src") !== s2) el.src = s2 }
      if (el.dataset.mp) el.poster = src(val(el.dataset.mp));
      if (el.dataset.mi) { const s2 = src(val(el.dataset.mi)); if (el.getAttribute("src") !== s2) el.src = s2 } });
    // 작품
    const g = gridEl();
    g.querySelectorAll("article.c").forEach(a => { if (!order.includes(a)) a.remove() });
    order.forEach(a => g.append(a));
    order.forEach(a => { if (a.dataset.i == null) return; const i = +a.dataset.i;
      a.style.display = del.has(i) ? "none" : "";
      const c = val(`cases.items.${i}.category`), vt = !!val(`cases.items.${i}.vertical`);
      a.dataset.cat = c; if (a._sel) a._sel.value = c; a.classList.toggle("vert", vt); if (a._vert) a._vert.textContent = vt ? "세로형 ✓" : "가로형";
      const v = a.querySelector("video"), im = a.querySelector("img"), vs = src(val(`cases.items.${i}.video`)), ps = src(val(`cases.items.${i}.poster`));
      if (v && v.dataset.src !== vs) { v.dataset.src = vs; if (v.getAttribute("src")) v.src = vs }
      if (im && im.getAttribute("src") !== ps) im.src = ps });
    dispatchEvent(new Event("resize")); if (cur) place();
  }
  document.addEventListener("keydown", e => {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || !J) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) {
      const changed = a.isContentEditable ? a.innerText !== a._start : a._rec;
      if (changed) return;               // 글자 입력 중이면 브라우저 기본 되돌리기
      a.blur();
    }
    e.preventDefault(); e.shiftKey ? redoFn() : undo();
  });

  /* ---------- 저장 ---------- */
  let saveBtn, msgEl;
  function bar() {
    saveBtn = $("button", { class: "k-btn o", onclick: save }, "저장하기");
    undoBtn = $("button", { class: "k-btn", title: "되돌리기 (⌘Z) · 다시 하기 (⌘⇧Z)", onclick: undo }, "↶ 되돌리기");
    msgEl = $("span", { class: "k-msg" }, "글자 클릭: 수정 · 파란 손잡이: ✥ 이동 ⤡ 크기");
    document.body.append($("div", { class: "k-bar" }, [$("b", { style: "padding:0 6px" }, "편집 모드"), msgEl,
      $("button", { class: "k-btn", onclick: heroPanel }, "메인 영상"),
      $("button", { class: "k-btn", onclick: addCase }, "+ 작품 추가"),
      $("button", { class: "k-btn", onclick: navPanel }, "상단 메뉴"),
      $("button", { class: "k-btn", onclick: secPanel }, "섹션 순서"),
      $("button", { class: "k-btn", onclick: infoPanel }, "기본 정보"),
      undoBtn, saveBtn, $("button", { class: "k-btn", onclick: exit }, "나가기")]));
    refresh();
  }
  function refresh() { if (undoBtn) { undoBtn.disabled = !hist.length; undoBtn.textContent = hist.length ? `↶ 되돌리기 (${hist.length})` : "↶ 되돌리기" } if (!saveBtn) return; const n = count(); saveBtn.textContent = n ? `저장하기 (${n})` : "저장하기"; saveBtn.disabled = !n }
  let tt; function toast(t) { if (!msgEl) return alertBox(t); msgEl.textContent = t; clearTimeout(tt); tt = setTimeout(() => msgEl.textContent = "글자 클릭: 수정 · 파란 손잡이: ✥ 이동 ⤡ 크기", 7000) }
  function alertBox(t) { modal((md, close) => md.append($("p", {}, t), $("button", { class: "k-btn o", onclick: close }, "확인"))) }

  async function save() {
    if (!count()) return;
    saveBtn.disabled = true; toast("저장 중… 창을 닫지 마세요");
    try {
      const head = (await gh("/git/ref/heads/main")).object.sha;
      const baseTree = (await gh("/git/commits/" + head)).tree.sha;
      const fresh = JSON.parse(b64dec((await gh("/contents/content/site.json?ref=" + head)).content));
      [...sets].sort((a, b) => a[0].split(".").length - b[0].split(".").length).forEach(([k, v]) => { try { setP(fresh, k, v) } catch (e) {} });
      if (del.size || adds.length || moved) { const old = fresh.cases.items;
        fresh.cases.items = [...document.querySelectorAll("#grid article.c")].map(a => a.dataset.new != null ? adds[+a.dataset.new] : (a.dataset.i != null && !del.has(+a.dataset.i) ? old[+a.dataset.i] : null)).filter(Boolean); }
      const tree = [];
      let n = 0;
      const js = JSON.stringify(fresh), used = [...media].filter(([path]) => js.includes(path));
      for (const [path, b64] of used) { toast(`영상·이미지 올리는 중… (${++n}/${used.length})`); const b = await gh("/git/blobs", { method: "POST", body: { content: b64, encoding: "base64" } }); tree.push({ path, mode: "100644", type: "blob", sha: b.sha }) }
      const jb = await gh("/git/blobs", { method: "POST", body: { content: JSON.stringify(fresh, null, 2) + "\n", encoding: "utf-8" } });
      tree.push({ path: "content/site.json", mode: "100644", type: "blob", sha: jb.sha });
      const t = await gh("/git/trees", { method: "POST", body: { base_tree: baseTree, tree } });
      const c = await gh("/git/commits", { method: "POST", body: { message: "홈페이지 편집 (편집 모드)", tree: t.sha, parents: [head] } });
      await gh("/git/refs/heads/main", { method: "PATCH", body: { sha: c.sha } });
      J = fresh; sets.clear(); del.clear(); adds.length = 0; media.clear(); moved = 0; hist.length = 0; redo.length = 0; refresh();
      const wait = modal(md => md.append($("h3", {}, "저장 완료 ✓"), $("p", { id: "k-wait" }, "사이트에 반영하는 중이에요 (보통 1~2분). 끝나면 자동으로 새로고침돼서 바로 이어서 편집할 수 있어요.")), true);
      watch(c.sha, wait);
    } catch (e) {
      saveBtn.disabled = false; toast("저장 실패: " + e.message.slice(0, 80));
      if (/^401/.test(e.message)) { store.set(TOK_KEY, null); login("열쇠가 만료됐거나 지워졌어요. 새 열쇠를 넣어 주세요.") }
    }
  }
  async function watch(sha, wait) {
    const reload = () => location.replace(location.pathname + "?edit&v=" + Date.now());
    for (let k = 0; k < 30; k++) {
      await new Promise(r => setTimeout(r, 8000));
      try { const r = (await gh("/actions/runs?head_sha=" + sha)).workflow_runs[0];
        if (r && r.status === "completed") {
          if (r.conclusion === "success") { setTimeout(reload, 4000); const w = document.getElementById("k-wait"); if (w) w.textContent = "반영 완료! 다른 사람에게도 이제 보여요. 곧 새로고침돼요…"; }
          else { wait(); toast("반영 중 문제가 생겼어요. 저장 내용은 GitHub에 남아 있어요. Claude에게 알려 주세요.") }
          return } } catch (e) {}
    }
    reload();
  }
  function exit() { if (count() && !window.confirm("저장하지 않은 수정이 있어요. 그래도 나갈까요?")) return; sets.clear(); del.clear(); adds.length = 0; location.href = location.pathname }

  /* ---------- go ---------- */
  if (tok) start().catch(e => { store.set(TOK_KEY, null); tok = null; login(/^401/.test(e.message) ? "열쇠가 만료됐어요. 새 열쇠를 넣어 주세요." : "") });
  else login();
})();
