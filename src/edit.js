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

  /* ---------- helpers ---------- */
  const $ = (t, a = {}, kids = []) => { const e = document.createElement(t); for (const k in a) k === "style" ? e.style.cssText = a[k] : k.startsWith("on") ? e.addEventListener(k.slice(2), a[k]) : e.setAttribute(k, a[k]); [].concat(kids).forEach(c => e.append(c)); return e };
  const getP = (o, p) => p.split(".").reduce((a, k) => a == null ? a : a[k], o);
  const setP = (o, p, v) => { const ks = p.split("."); let a = o; ks.slice(0, -1).forEach(k => a = a[k]); a[ks.at(-1)] = v };
  const val = p => sets.has(p) ? sets.get(p) : getP(J, p);
  const hdr = () => ({ Authorization: "Bearer " + tok, Accept: "application/vnd.github+json" });
  async function gh(path, opt = {}) {
    const r = await fetch(API + path, { ...opt, headers: { ...hdr(), ...(opt.body ? { "Content-Type": "application/json" } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
    return r.json();
  }
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
  const readB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(f) });
  const pick = accept => new Promise(ok => { const i = $("input", { type: "file", accept }); i.onchange = () => ok(i.files[0] || null); i.click() });
  const count = () => sets.size + del.size + adds.length;

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
  function modal(build) { const ov = $("div", { class: "k-ov" }), md = $("div", { class: "k-md" }); ov.append(md); const close = () => ov.remove(); ov.addEventListener("mousedown", e => { if (e.target === ov) close() }); build(md, close); document.body.append(ov); return close }

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
    document.querySelectorAll("x-t[data-k]").forEach(x => {
      if (x.closest(".now")) return;
      x.setAttribute("contenteditable", "plaintext-only"); x.spellcheck = false;
      x.addEventListener("input", () => {
        const k = x.dataset.k, v = x.innerText.replace(/\n$/, "");
        sets.set(k, v);
        document.querySelectorAll(`x-t[data-k="${k}"]`).forEach(o => { if (o !== x) o.innerText = v });
        if (k === "hero.wordmark") dispatchEvent(new Event("resize"));
        refresh();
      });
      x.addEventListener("keydown", e => { if (e.key === "Escape") x.blur() });
    });
    document.addEventListener("click", e => { if (e.target.closest("x-t[contenteditable]")) e.preventDefault() }, true);
    mediaBars(); caseBars(); bar();
    addEventListener("beforeunload", e => { if (count()) { e.preventDefault(); e.returnValue = "" } });
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
    media.set(path, await readB64(f));
    return { path, url: URL.createObjectURL(f), file: f };
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
    media.set(path, await readB64(b)); sets.set(key, path); return URL.createObjectURL(b);
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
        if (el.dataset.mv) tb.append($("button", { class: "k-btn", onclick: async e => { e.stopPropagation(); const r = await takeFile("video"); if (!r) return; sets.set(el.dataset.mv, r.path); el.dataset.src = r.url; el.src = r.url; el.play().catch(() => {});
          const art = el.closest("article.c"); if (art) { const u = await autoPoster(r.url, `cases.items.${art.dataset.i}.poster`); const im = art.querySelector("img"); if (u && im) im.src = u }
          refresh() } }, "영상 교체"));
        const pk = el.dataset.mi || el.dataset.mp;
        if (pk) tb.append($("button", { class: "k-btn w", onclick: async e => { e.stopPropagation(); const r = await takeFile("image"); if (!r) return; sets.set(pk, r.path); el.tagName === "IMG" ? el.src = r.url : el.poster = r.url; refresh() } }, el.closest(".bg") ? "배경 이미지 교체" : "썸네일 교체"));
      });
      box.append(tb);
    });
  }

  /* ---------- 작품(케이스) ---------- */
  const cats = () => [...new Set(J.cases.items.map(c => c.category).concat(adds.map(a => a.category)))];
  function caseBars() {
    document.querySelectorAll("#grid article.c[data-i]").forEach(art => {
      const i = art.dataset.i, tb = art.querySelector(".k-tb"); if (!tb) return;
      const sel = $("select", { title: "분류", onclick: e => e.stopPropagation(), onchange: () => { sets.set(`cases.items.${i}.category`, sel.value); art.dataset.cat = sel.value; refresh() } }, cats().map(c => $("option", { value: c }, c)));
      sel.value = val(`cases.items.${i}.category`);
      const vert = $("button", { class: "k-btn w", onclick: e => { e.stopPropagation(); const v = !val(`cases.items.${i}.vertical`); sets.set(`cases.items.${i}.vertical`, v); art.classList.toggle("vert", v); vert.textContent = v ? "세로형 ✓" : "가로형"; refresh() } }, val(`cases.items.${i}.vertical`) ? "세로형 ✓" : "가로형");
      tb.append(sel, vert, $("button", { class: "k-btn", style: "background:#c62828", onclick: e => { e.stopPropagation(); del.add(+i); art.style.display = "none"; refresh(); toast("작품을 뺐어요. 저장하면 사이트에서 사라져요.") } }, "삭제"));
    });
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
        if (!img) { const b = await posterFrom(vid.url); if (b) { posterPath = `media/u${Date.now().toString(36)}-poster.jpg`; media.set(posterPath, await readB64(b)); posterUrl = URL.createObjectURL(b) } }
        const item = { client: client.value.trim(), title: title.value.trim(), category: cat.value, vertical: vert.checked, video: vid.path, poster: posterPath || "" };
        adds.push(item);
        const art = $("article", { class: "c" + (item.vertical ? " vert" : ""), "data-cat": item.category }, [
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
    inp.addEventListener("input", () => { sets.set(key, inp.value); refresh(); onField(key, inp.value) });
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
          $("button", { class: "k-btn", onclick: async () => { const r = await takeFile("video"); if (!r) return; sets.set(`hero.slides.${i}.video`, r.path); const v = window.__hero && window.__hero.vids[i]; if (v) { v.src = r.url; const u = await autoPoster(r.url, `hero.slides.${i}.poster`); if (u) v.poster = u } refresh(); toast(`영상 ${i + 1}을 바꿨어요.`) } }, "영상 교체")]));
      });
      md.append($("div", { class: "row2" }, [$("button", { class: "k-btn o", onclick: close }, "닫기")]));
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

  /* ---------- 저장 ---------- */
  let saveBtn, msgEl;
  function bar() {
    saveBtn = $("button", { class: "k-btn o", onclick: save }, "저장하기");
    msgEl = $("span", { class: "k-msg" }, "글자를 클릭해서 고치세요");
    document.body.append($("div", { class: "k-bar" }, [$("b", { style: "padding:0 6px" }, "편집 모드"), msgEl,
      $("button", { class: "k-btn", onclick: heroPanel }, "메인 영상"),
      $("button", { class: "k-btn", onclick: addCase }, "+ 작품 추가"),
      $("button", { class: "k-btn", onclick: infoPanel }, "기본 정보"),
      saveBtn, $("button", { class: "k-btn", onclick: exit }, "나가기")]));
    refresh();
  }
  function refresh() { if (!saveBtn) return; const n = count(); saveBtn.textContent = n ? `저장하기 (${n})` : "저장하기"; saveBtn.disabled = !n }
  let tt; function toast(t) { if (!msgEl) return alertBox(t); msgEl.textContent = t; clearTimeout(tt); tt = setTimeout(() => msgEl.textContent = "글자를 클릭해서 고치세요", 7000) }
  function alertBox(t) { modal((md, close) => md.append($("p", {}, t), $("button", { class: "k-btn o", onclick: close }, "확인"))) }

  async function save() {
    if (!count()) return;
    saveBtn.disabled = true; toast("저장 중… 창을 닫지 마세요");
    try {
      const head = (await gh("/git/ref/heads/main")).object.sha;
      const baseTree = (await gh("/git/commits/" + head)).tree.sha;
      const fresh = JSON.parse(b64dec((await gh("/contents/content/site.json?ref=" + head)).content));
      sets.forEach((v, k) => { try { setP(fresh, k, v) } catch (e) {} });
      if (del.size || adds.length) fresh.cases.items = adds.slice().reverse().concat(fresh.cases.items.filter((_, i) => !del.has(i)));
      const tree = [];
      let n = 0;
      for (const [path, b64] of media) { toast(`영상·이미지 올리는 중… (${++n}/${media.size})`); const b = await gh("/git/blobs", { method: "POST", body: { content: b64, encoding: "base64" } }); tree.push({ path, mode: "100644", type: "blob", sha: b.sha }) }
      const jb = await gh("/git/blobs", { method: "POST", body: { content: JSON.stringify(fresh, null, 2) + "\n", encoding: "utf-8" } });
      tree.push({ path: "content/site.json", mode: "100644", type: "blob", sha: jb.sha });
      const t = await gh("/git/trees", { method: "POST", body: { base_tree: baseTree, tree } });
      const c = await gh("/git/commits", { method: "POST", body: { message: "홈페이지 편집 (편집 모드)", tree: t.sha, parents: [head] } });
      await gh("/git/refs/heads/main", { method: "PATCH", body: { sha: c.sha } });
      J = fresh; sets.clear(); del.clear(); adds.length = 0; media.clear(); refresh();
      toast("저장 완료! 사이트에 반영 중… (1~2분)"); watch(c.sha);
    } catch (e) {
      saveBtn.disabled = false; toast("저장 실패: " + e.message.slice(0, 80));
      if (/^401/.test(e.message)) { store.set(TOK_KEY, null); login("열쇠가 만료됐거나 지워졌어요. 새 열쇠를 넣어 주세요.") }
    }
  }
  async function watch(sha) {
    for (let k = 0; k < 30; k++) {
      await new Promise(r => setTimeout(r, 8000));
      try { const r = (await gh("/actions/runs?head_sha=" + sha)).workflow_runs[0];
        if (r && r.status === "completed") { toast(r.conclusion === "success" ? "반영 완료! 다른 사람에게도 이제 보여요." : "반영 중 문제가 생겼어요. 저장 내용은 남아 있어요."); return } } catch (e) {}
    }
  }
  function exit() { if (count() && !window.confirm("저장하지 않은 수정이 있어요. 그래도 나갈까요?")) return; sets.clear(); del.clear(); adds.length = 0; location.href = location.pathname }

  /* ---------- go ---------- */
  if (tok) start().catch(e => { store.set(TOK_KEY, null); tok = null; login(/^401/.test(e.message) ? "열쇠가 만료됐어요. 새 열쇠를 넣어 주세요." : "") });
  else login();
})();
