(() => {
  "use strict";
  const KEY = "terakoya-workshop2-image-v1";
  const SETTINGS_KEY = "terakoya-workshop2-image-settings-v1";
  const THEME_KEY = "terakoya-workshop2-image-theme-v1";
  const HIDDEN_KEY = "terakoya-workshop2-image-hidden-v1";
  const form = document.querySelector("#brief-form");
  const designs = document.querySelector("#designs");
  const designSettings = document.querySelector("#design-settings");
  const structureFields = document.querySelector(".structure-list");
  const libraryList = document.querySelector("#library-list");
  const photoInput = document.querySelector("#photo");
  const photoName = document.querySelector("#photo-name");
  const clearPhoto = document.querySelector("#clear-photo");
  const status = document.querySelector("#export-status");
  const consultPanel = document.querySelector("#consult-panel");
  const consultButton = document.querySelector("#consult");
  const consultStatus = document.querySelector("#consult-status");
  let settings = ImageState.normalize(null);
  let photo = null;
  let photoUrl = null;
  let libraryUrls = [];
  let hidden = [];
  let debounce;

  function theme() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(THEME_KEY) || "{}"); } catch { /* keep defaults */ }
    const mode = ["light", "dark", "system"].includes(saved.mode) ? saved.mode : "system";
    const main = ImageState.color(saved.main, "#086c7e");
    const sub = ImageState.color(saved.sub, "#b78b3c");
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.setProperty("--brand", main);
    document.documentElement.style.setProperty("--brand-ink", ImageState.contrast(main));
    document.documentElement.style.setProperty("--sub-brand", sub);
    document.querySelector("#theme-mode").value = mode;
    document.querySelector("#theme-main").value = main;
    document.querySelector("#theme-sub").value = sub;
  }
  function saveTheme() {
    try { localStorage.setItem(THEME_KEY, JSON.stringify({ mode: document.querySelector("#theme-mode").value, main: document.querySelector("#theme-main").value, sub: document.querySelector("#theme-sub").value })); }
    catch { document.querySelector("#save-status").textContent = "外観を保存できません"; }
    theme();
  }
  function restoreHidden() {
    try { hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); if (!Array.isArray(hidden)) hidden = []; }
    catch { hidden = []; }
  }
  function hideEntry(id) {
    hidden = [...new Set([...hidden, id])];
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)); }
    catch { document.querySelector("#library-status").textContent = "一覧から外す設定を保存できません"; }
  }

  function read() {
    return Object.fromEntries(new FormData(form).entries());
  }
  function safeStore(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); document.querySelector("#save-status").textContent = "この端末に保存済み"; }
    catch { document.querySelector("#save-status").textContent = "保存不可"; }
  }
  function storeSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch { document.querySelector("#save-status").textContent = "設定を保存できません"; }
  }
  function restoreSettings() {
    try { settings = ImageState.normalize(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null")); }
    catch { settings = ImageState.normalize(null); }
  }
  function go(step) {
    for (const panel of document.querySelectorAll(".panel")) panel.classList.toggle("active", panel.id === step);
    for (const button of document.querySelectorAll(".step")) {
      const active = button.dataset.step === step;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
    if (step === "preview") repaint();
    if (step === "library") refreshLibrary();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }
  function renderStructureSettings() {
    for (const key of Object.keys(settings.flyer)) structureFields.querySelector(`[name="${key}"]`).checked = settings.flyer[key];
    document.querySelector("#sns-support").value = settings.snsSupport;
  }
  function renderDesignSettings() {
    designSettings.innerHTML = settings.designs.map((design, index) => {
      const palette = ImageState.palette(design);
      const options = ImageState.LAYOUTS.map((label, value) => `<option value="${value}"${design.layout === value ? " selected" : ""}>${label}</option>`).join("");
      const swatches = Object.entries(ImageState.PALETTES).map(([key, item]) => `<button class="palette-choice" type="button" data-preset="${key}" data-slot="${index}" style="background:${item.accent}" title="${item.label}" aria-label="${item.label}の配色にする"></button>`).join("");
      return `<section class="design-slot"><span class="number">0${index + 1}</span><h2>デザイン ${index + 1}</h2><label>レイアウト<select data-layout data-slot="${index}" aria-label="デザイン${index + 1}のレイアウト">${options}</select></label><div class="swatch-preview" style="background:${palette.bg};color:${palette.ink};border-top:6px solid ${palette.accent}">${ImageState.LAYOUTS[design.layout]}</div><p>${ImageState.NOTES[design.layout]}</p><div class="palette-choices" role="group" aria-label="デザイン${index + 1}の配色例">${swatches}</div><div class="color-fields"><label>背景色<input type="color" data-color="bg" data-slot="${index}" value="${design.bg}"></label><label>アクセント色<input type="color" data-color="accent" data-slot="${index}" value="${design.accent}"></label></div></section>`;
    }).join("");
  }
  function setConsultOpen(open) {
    consultPanel.hidden = !open;
    consultButton.setAttribute("aria-expanded", String(open));
  }
  function applyConsult(answer, overwrite = false) {
    const result = ImageConsult.applyFields(read(), answer, overwrite);
    if (!result.applied) { consultStatus.textContent = "反映できる入力案がありませんでした"; return; }
    for (const key of ImageConsult.KEYS) form.elements[key].value = result.fields[key] || "";
    safeStore(read()); repaint(); setConsultOpen(false);
    status.textContent = `${result.applied}項目を反映しました`;
    consultStatus.textContent = "";
  }
  function receiveConsultLink() {
    if (!location.hash.startsWith("#image-intake=")) return;
    const encoded = location.hash.slice("#image-intake=".length);
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* File URLs may refuse history changes. */ }
    try {
      if (!/^[A-Za-z0-9_-]{1,40000}$/.test(encoded)) throw new Error("入力案のリンクが無効です");
      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      applyConsult(JSON.parse(new TextDecoder().decode(bytes)));
    } catch { setConsultOpen(true); consultStatus.textContent = "入力案のリンクを読み込めませんでした。JSONを貼り付けてください"; }
  }
  function openWithPrompt(prompt) {
    const link = document.createElement("a");
    link.href = `https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`;
    link.target = "_blank"; link.rel = "noopener noreferrer"; link.referrerPolicy = "no-referrer";
    document.body.append(link); link.click(); link.remove();
  }
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      for (const [key, value] of Object.entries(data)) if (form.elements[key]) form.elements[key].value = value;
    } catch { /* invalid local data is ignored */ }
  }
  function placeholder(value, fallback) { return String(value || "").trim() || fallback; }
  function setFont(ctx, size, weight = 700) { ctx.font = `${weight} ${size}px "Yu Gothic", Meiryo, sans-serif`; }
  function breakLines(ctx, text, maxWidth) {
    const lines = [];
    for (const paragraph of String(text || "").split(/\n/)) {
      if (!paragraph) { lines.push(""); continue; }
      let line = "";
      for (const char of Array.from(paragraph)) {
        if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = char; }
        else line += char;
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  function drawText(ctx, text, x, y, width, height, startSize, color, weight = 700, minSize = 25) {
    text = String(text || "").trim();
    if (!text) return y;
    let size = startSize, lines = [];
    while (size >= minSize) {
      setFont(ctx, size, weight);
      lines = breakLines(ctx, text, width);
      if (lines.length * size * 1.32 <= height) break;
      size -= 2;
    }
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    const maxLines = Math.floor(height / (size * 1.32));
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) ctx.fillText(lines[i], x, y + i * size * 1.32);
    ctx.restore();
    return y + Math.min(lines.length, maxLines) * size * 1.32;
  }
  function fill(ctx, color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  function imageCover(ctx, image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
  }
  function line(ctx, x, y, w, color = "#b9c7c7", thick = 2) { fill(ctx, color, x, y, w, thick); }
  function bullets(data) { return [data.benefit1, data.benefit2, data.benefit3].filter(v => String(v || "").trim()); }
  function meta(data) { return [data.date, data.place, data.price].filter(v => String(v || "").trim()).join("  /  "); }
  function render(ctx, rawData, slot, medium, image) {
    const data = ImageState.displayData(rawData, medium, settings);
    const concept = settings.designs[slot].layout;
    const isFlyer = medium === "flyer";
    const H = isFlyer ? 1414 : 1250;
    const name = placeholder(data.name, "サービス名");
    const headline = placeholder(data.headline, "伝えたいひとこと");
    const cta = placeholder(data.cta, "次のアクション");
    const summary = String(data.description || "").trim();
    const list = bullets(data);
    const details = meta(data);
    const palette = ImageState.palette(settings.designs[slot]);
    const support = isFlyer ? "" : ImageState.snsSupport(rawData, settings);
    ctx.save();
    ctx.setTransform(ctx.canvas.width / 1000, 0, 0, ctx.canvas.height / H, 0, 0);
    ctx.clearRect(0, 0, 1000, H);
    fill(ctx, palette.bg, 0, 0, 1000, H);

    if (concept === 0) {
      fill(ctx, palette.accent, 0, 0, 1000, 14);
      drawText(ctx, name, 66, 58, 870, 70, 36, palette.ink);
      line(ctx, 66, 143, 868, "#8ca4a5", 2);
      drawText(ctx, headline, 66, 195, 870, isFlyer ? 360 : 470, isFlyer ? 95 : 112, palette.ink, 800, 42);
      if (image) imageCover(ctx, image, 66, isFlyer ? 580 : 710, 868, isFlyer ? 345 : 300);
      else {
        fill(ctx, palette.soft, 66, isFlyer ? 580 : 710, 868, isFlyer ? 345 : 300);
        if (data.audience) drawText(ctx, data.audience, 102, isFlyer ? 665 : 788, 790, 180, 49, palette.softInk);
      }
      if (isFlyer) {
        drawText(ctx, summary, 66, 956, 868, 104, 34, palette.ink, 500);
        let y = 1070;
        for (const item of list.slice(0, 3)) { fill(ctx, palette.accent, 66, y + 14, 10, 10); drawText(ctx, item, 94, y, 840, 54, 29, palette.ink, 600); y += 51; }
        drawText(ctx, details, 66, 1230, 868, 75, 26, palette.ink, 600, 20);
        line(ctx, 66, 1310, 868, palette.accent, 3);
        drawText(ctx, cta, 66, 1330, 530, 55, 31, palette.ink);
        drawText(ctx, data.url || "", 600, 1319, 334, 75, 19, palette.ink, 500, 16);
      } else {
        drawText(ctx, support, 66, 1020, 868, 43, 29, palette.ink, 600, 22);
        fill(ctx, palette.accent, 66, 1070, 868, 98);
        drawText(ctx, cta, 96, 1088, 810, 65, 42, palette.ink);
      }
    } else if (concept === 1) {
      const photoH = isFlyer ? 690 : 700;
      if (image) imageCover(ctx, image, 0, 0, 1000, photoH);
      else fill(ctx, "#517879", 0, 0, 1000, photoH);
      fill(ctx, "rgba(20, 45, 48, 0.78)", 0, 0, 1000, 172);
      fill(ctx, palette.bg, 0, photoH, 1000, H - photoH);
      fill(ctx, palette.accent, 58, 52, 10, 86);
      drawText(ctx, name, 90, 62, 840, 100, 42, "#ffffff");
      drawText(ctx, headline, 58, photoH + 43, 884, isFlyer ? 235 : 285, isFlyer ? 84 : 90, palette.ink, 800, 38);
      if (isFlyer) {
        drawText(ctx, summary, 58, 995, 884, 92, 33, palette.ink, 500);
        let y = 1090;
        for (const item of list.slice(0, 3)) { fill(ctx, palette.accent, 58, y + 14, 11, 11); drawText(ctx, item, 83, y, 846, 45, 29, palette.ink, 600); y += 45; }
        drawText(ctx, details, 58, 1234, 884, 68, 25, palette.ink, 600, 20);
        line(ctx, 58, 1310, 884, palette.accent, 3);
        drawText(ctx, cta, 58, 1332, 520, 55, 32, palette.accent);
        drawText(ctx, data.url || "", 600, 1319, 340, 75, 18, palette.ink, 500, 16);
      } else {
        drawText(ctx, support, 58, 1035, 884, 43, 29, palette.ink, 600, 22);
        fill(ctx, palette.accent, 58, 1090, 884, 96);
        drawText(ctx, cta, 88, 1108, 824, 66, 42, palette.onAccent);
      }
    } else if (concept === 2) {
      fill(ctx, palette.accent, 0, 0, 1000, isFlyer ? 260 : 295);
      drawText(ctx, name, 62, 60, 870, 120, 56, palette.onAccent);
      fill(ctx, palette.soft, 50, isFlyer ? 298 : 335, 900, isFlyer ? 640 : 650);
      drawText(ctx, headline, 88, isFlyer ? 358 : 400, 824, isFlyer ? 480 : 480, isFlyer ? 103 : 113, palette.softInk || palette.ink, 800, 43);
      if (isFlyer) {
        if (image) imageCover(ctx, image, 50, 968, 320, 310);
        else fill(ctx, "#a7c8bd", 50, 968, 320, 310);
        drawText(ctx, summary, 405, 976, 540, 96, 31, palette.ink, 500);
        let y = 1080;
        for (const item of list.slice(0, 3)) { fill(ctx, palette.accent, 405, y + 14, 10, 10); drawText(ctx, item, 430, y, 510, 54, 25, palette.ink, 600); y += 57; }
        drawText(ctx, details, 50, 1287, 900, 48, 23, palette.ink, 600, 20);
        drawText(ctx, cta, 50, 1350, 550, 50, 34, palette.ink);
        drawText(ctx, data.url || "", 600, 1319, 345, 75, 18, palette.ink, 500, 16);
      } else {
        if (image) imageCover(ctx, image, 50, 1005, 290, 175);
        fill(ctx, palette.ink, image ? 370 : 50, 1020, image ? 580 : 900, 155);
        drawText(ctx, cta, image ? 402 : 82, 1050, image ? 514 : 836, 95, 42, palette.bg);
        drawText(ctx, support, 50, 940, 900, 43, 29, palette.ink, 600, 22);
      }
    } else if (concept === 3) {
      fill(ctx, palette.accent, 0, 0, 415, H);
      drawText(ctx, name, 52, 66, 310, 170, 42, palette.onAccent);
      drawText(ctx, headline, 52, 285, 320, 620, 66, palette.onAccent, 800, 31);
      if (image) imageCover(ctx, image, 450, 55, 500, isFlyer ? 685 : 760);
      else fill(ctx, palette.soft, 450, 55, 500, isFlyer ? 685 : 760);
      drawText(ctx, isFlyer ? summary : support, 470, isFlyer ? 780 : 850, 460, 185, 37, palette.ink, 600);
      if (isFlyer) { let y = 980; for (const item of list) { drawText(ctx, item, 470, y, 460, 65, 29, palette.ink); y += 68; } drawText(ctx, details, 470, 1210, 460, 70, 24, palette.ink); }
      drawText(ctx, cta, 470, H - 115, 460, 75, 38, palette.accent);
    } else if (concept === 4) {
      drawText(ctx, name, 56, 52, 888, 90, 44, palette.ink);
      fill(ctx, palette.accent, 56, 160, 888, isFlyer ? 455 : 590);
      drawText(ctx, headline, 94, 205, 810, isFlyer ? 345 : 480, 86, palette.onAccent, 800, 39);
      if (image) imageCover(ctx, image, 56, isFlyer ? 645 : 780, 430, isFlyer ? 450 : 310);
      else fill(ctx, palette.soft, 56, isFlyer ? 645 : 780, 430, isFlyer ? 450 : 310);
      drawText(ctx, isFlyer ? summary : support, 520, isFlyer ? 672 : 812, 410, 200, 36, palette.ink, 600);
      if (isFlyer) { let y = 898; for (const item of list) { drawText(ctx, item, 520, y, 410, 62, 27, palette.ink); y += 68; } drawText(ctx, details, 56, 1165, 880, 80, 24, palette.ink); }
      fill(ctx, palette.ink, 56, H - 130, 888, 90); drawText(ctx, cta, 90, H - 111, 820, 60, 38, palette.bg);
    } else if (concept === 5) {
      if (image) imageCover(ctx, image, 0, 0, 1000, isFlyer ? 790 : 800);
      else fill(ctx, palette.soft, 0, 0, 1000, isFlyer ? 790 : 800);
      fill(ctx, palette.accent, 70, 70, 860, isFlyer ? 610 : 630);
      drawText(ctx, name, 112, 114, 780, 80, 40, palette.onAccent);
      drawText(ctx, headline, 112, 230, 780, isFlyer ? 380 : 400, 100, palette.onAccent, 800, 42);
      drawText(ctx, isFlyer ? summary : support, 80, isFlyer ? 844 : 850, 840, 170, 36, palette.ink, 600);
      if (isFlyer) { let y = 1035; for (const item of list) { drawText(ctx, item, 80, y, 840, 58, 28, palette.ink); y += 59; } drawText(ctx, details, 80, 1240, 840, 60, 24, palette.ink); }
      drawText(ctx, cta, 80, H - 100, 840, 75, 39, palette.accent);
    } else if (concept === 6) {
      line(ctx, 70, 65, 860, palette.accent, 8);
      drawText(ctx, name, 70, 95, 860, 75, 32, palette.ink);
      drawText(ctx, headline, 70, 265, 860, isFlyer ? 570 : 610, 118, palette.ink, 800, 45);
      drawText(ctx, isFlyer ? summary : support, 70, isFlyer ? 880 : 915, 860, 145, 36, palette.ink, 500);
      if (isFlyer) { let y = 1050; for (const item of list) { drawText(ctx, item, 70, y, 860, 57, 29, palette.ink); y += 62; } drawText(ctx, details, 70, 1245, 860, 60, 23, palette.ink); }
      fill(ctx, palette.accent, 70, H - 95, 860, 7); drawText(ctx, cta, 70, H - 78, 860, 60, 31, palette.ink);
    } else if (concept === 7) {
      fill(ctx, palette.accent, 0, 0, 1000, 28);
      drawText(ctx, name, 66, 68, 868, 65, 32, palette.ink);
      line(ctx, 66, 150, 868, palette.ink, 3);
      if (image) imageCover(ctx, image, 66, 185, 868, isFlyer ? 430 : 480);
      else fill(ctx, palette.soft, 66, 185, 868, isFlyer ? 430 : 480);
      drawText(ctx, headline, 66, isFlyer ? 655 : 705, 868, isFlyer ? 320 : 330, 82, palette.ink, 800, 37);
      drawText(ctx, isFlyer ? summary : support, 66, isFlyer ? 1005 : 1060, 868, 115, 32, palette.ink, 500);
      if (isFlyer) { let y = 1130; for (const item of list.slice(0, 2)) { drawText(ctx, item, 66, y, 868, 54, 27, palette.ink); y += 53; } drawText(ctx, details, 66, 1250, 868, 58, 23, palette.ink); }
      drawText(ctx, cta, 66, H - 92, 868, 62, 34, palette.accent);
    } else {
      fill(ctx, palette.accent, 42, 42, 916, H - 84);
      fill(ctx, palette.bg, 64, 64, 872, H - 128);
      drawText(ctx, name, 100, 108, 800, 92, 43, palette.ink);
      if (image) imageCover(ctx, image, 100, 215, 800, isFlyer ? 380 : 400);
      else fill(ctx, palette.soft, 100, 215, 800, isFlyer ? 380 : 400);
      drawText(ctx, headline, 100, isFlyer ? 635 : 660, 800, isFlyer ? 300 : 350, 90, palette.ink, 800, 38);
      drawText(ctx, isFlyer ? summary : support, 100, isFlyer ? 970 : 1030, 800, 130, 34, palette.ink, 500);
      if (isFlyer) { let y = 1110; for (const item of list.slice(0, 2)) { drawText(ctx, item, 100, y, 800, 53, 27, palette.ink); y += 55; } drawText(ctx, details, 100, 1230, 800, 55, 23, palette.ink); }
      drawText(ctx, cta, 100, H - 110, 800, 70, 38, palette.accent);
    }
    ctx.restore();
  }
  function valid(data) {
    return ["name", "headline", "cta"].every(key => String(data[key] || "").trim());
  }
  function repaint() {
    const data = read();
    for (const canvas of designs.querySelectorAll("canvas")) {
      render(canvas.getContext("2d"), data, Number(canvas.dataset.concept), canvas.dataset.medium, photo);
    }
    status.textContent = valid(data) ? "" : "必須項目を入れると画像を保存できます";
  }
  function blobFrom(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNGを作成できませんでした")), "image/png"));
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function restoreEntry(entry) {
    if (!confirm("今の入力を保存画像の設定に置き換えますか？ 写真は再選択が必要です。")) return;
    for (const key of ImageConsult.KEYS) form.elements[key].value = typeof entry.fields?.[key] === "string" ? entry.fields[key] : "";
    clearPhoto.click(); settings = ImageState.normalize(entry.settings);
    renderStructureSettings(); renderDesignSettings(); makeDesigns();
    safeStore(read()); storeSettings(); go("info");
    document.querySelector("#save-status").textContent = "設定を読み込みました。写真は再選択してください";
  }
  function action(label, style, handler) {
    const button = document.createElement("button"); button.type = "button"; button.className = style; button.textContent = label;
    button.addEventListener("click", handler); return button;
  }
  async function refreshLibrary() {
    const message = document.querySelector("#library-status");
    message.textContent = "完成画像を確認中";
    try {
      const local = await ImageLibrary.list();
      let remote = [], remoteError = "";
      if (ImageWork.toolUrl(location.href)) {
        try {
          const response = await fetch(`completed-images.json?ts=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
          if (response.ok) remote = ImageWork.parseManifest(await response.json(), location.origin + "/");
          else if (response.status !== 404) remoteError = `Work画像一覧を取得できません (${response.status})`;
        } catch { remoteError = "Work画像一覧を取得できません"; }
      }
      const entries = [...remote.map(item => ({ ...item, source: "work" })), ...local.map(item => ({ ...item, source: "local" }))]
        .filter(item => !hidden.includes(`${item.source}:${item.id}`))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      for (const url of libraryUrls) URL.revokeObjectURL(url);
      libraryUrls = [];
      libraryList.replaceChildren();
      if (!entries.length) { message.textContent = remoteError || "完成画像はまだありません。画像を仕上げる画面から生成してください。"; return; }
      for (const entry of entries) {
        const card = document.createElement("article"); card.className = "library-card";
        const frame = document.createElement("div"); frame.className = "library-image";
        const img = document.createElement("img"); img.alt = `${entry.name}の保存画像`;
        if (entry.source === "local") {
          const imageUrl = URL.createObjectURL(entry.previewBlob || entry.imageBlob);
          libraryUrls.push(imageUrl); img.src = imageUrl;
        } else img.src = entry.thumbnail;
        frame.append(img);
        const body = document.createElement("div"); body.className = "library-body";
        const title = document.createElement("h2"); title.textContent = entry.name || "名称未設定";
        const meta = document.createElement("p"); meta.textContent = `${entry.medium === "flyer" ? "チラシ A4" : "SNS投稿 4:5"} / デザイン ${entry.slot + 1} / ${entry.createdAt ? new Date(entry.createdAt).toLocaleString("ja-JP") : "日時未記録"}${entry.source === "local" ? " / 旧版の端末保存" : ""}`;
        const actions = document.createElement("div"); actions.className = "library-actions";
        if (entry.source === "local") actions.append(action("PNG保存", "primary-button", () => downloadBlob(entry.imageBlob, entry.filename)));
        else actions.append(action("画像を開く", "primary-button", () => { const link = document.createElement("a"); link.href = entry.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click(); }));
        actions.append(action("設定を開く", "subtle-button", () => restoreEntry(entry)));
        if (entry.source === "work") actions.append(action("修正を依頼", "subtle-button", () => {
          if (!entry.settings || !Object.keys(entry.fields).length) { message.textContent = "元の入力情報がありません。設定を確認してから修正してください"; return; }
          openWithPrompt(ImageWork.prompt(entry.fields, ImageState.normalize(entry.settings), location.href, entry));
          message.textContent = "開いたChatGPTで修正内容を伝えてください。元画像は残します";
        }));
        actions.append(action("一覧から削除", "subtle-button", () => {
          if (!confirm(`「${entry.name}」を一覧から削除しますか？\n画像ファイル自体は削除されません。\nこの端末の一覧からのみ外れます。`)) return;
          hideEntry(`${entry.source}:${entry.id}`); refreshLibrary();
        }));
        body.append(title, meta, actions); card.append(frame, body); libraryList.append(card);
      }
      message.textContent = `${entries.length}件を表示中${remoteError ? `。${remoteError}` : ""}`;
    } catch (error) { message.textContent = error.message || "画像一覧を開けませんでした"; }
  }
  function makeDesigns() {
    designs.innerHTML = settings.designs.map((design, i) => `
      <section class="design-section" aria-label="デザイン${i + 1}">
        <div class="design-top"><span class="number">0${i + 1}</span><h3>${ImageState.LAYOUTS[design.layout]}</h3><p>${ImageState.NOTES[design.layout]}</p></div>
        <div class="output-pair">
          <div class="output"><div class="output-head"><strong>チラシ A4</strong><div class="output-actions"><button class="subtle-button" type="button" data-action="download" data-concept="${i}" data-medium="flyer">下見PNGを保存</button></div></div><div class="canvas-wrap"><canvas width="420" height="594" data-concept="${i}" data-medium="flyer" aria-label="デザイン${i + 1}のチラシ構成下見"></canvas></div><small>構成下見 / 2480 × 3508 px</small></div>
          <div class="output"><div class="output-head"><strong>SNS投稿 4:5</strong><div class="output-actions"><button class="subtle-button" type="button" data-action="download" data-concept="${i}" data-medium="sns">下見PNGを保存</button></div></div><div class="canvas-wrap"><canvas width="420" height="525" data-concept="${i}" data-medium="sns" aria-label="デザイン${i + 1}のSNS構成下見"></canvas></div><small>構成下見 / 1080 × 1350 px</small></div>
        </div>
      </section>`).join("");
  }
  designs.addEventListener("click", async event => {
    const button = event.target.closest("button[data-medium]");
    if (!button) return;
    const data = read();
    if (!valid(data) || !form.reportValidity()) { status.textContent = "必須項目とURL形式を確認してください"; return; }
    const medium = button.dataset.medium;
    const slot = Number(button.dataset.concept);
    const filename = `terakoya_preview_${medium}_design0${slot + 1}.png`;
    button.disabled = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = medium === "flyer" ? 2480 : 1080;
      canvas.height = medium === "flyer" ? 3508 : 1350;
      render(canvas.getContext("2d"), data, slot, medium, photo);
      const imageBlob = await blobFrom(canvas);
      downloadBlob(imageBlob, filename);
      status.textContent = "構成下見のPNGを保存しました。完成画像は次の工程で生成します";
    } catch (error) { status.textContent = error.name === "QuotaExceededError" ? "保存容量が不足しています。PNG保存をお試しください" : error.message || "画像を保存できませんでした。PNG保存をお試しください"; }
    finally { button.disabled = false; }
  });
  form.addEventListener("input", () => {
    document.querySelector("#save-status").textContent = "保存中";
    clearTimeout(debounce);
    debounce = setTimeout(() => { safeStore(read()); repaint(); }, 120);
  });
  form.addEventListener("submit", event => event.preventDefault());
  structureFields.addEventListener("change", event => {
    const key = event.target.name;
    if (!Object.hasOwn(settings.flyer, key)) return;
    settings.flyer[key] = event.target.checked;
    storeSettings(); repaint();
  });
  document.querySelector("#sns-support").addEventListener("change", event => {
    settings.snsSupport = event.target.value;
    settings = ImageState.normalize(settings); storeSettings(); repaint();
  });
  designSettings.addEventListener("change", event => {
    const slot = Number(event.target.dataset.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return;
    if (event.target.matches("select[data-layout]")) settings.designs[slot].layout = Number(event.target.value);
    else if (event.target.matches("input[data-color]")) settings.designs[slot][event.target.dataset.color] = event.target.value;
    settings = ImageState.normalize(settings); storeSettings(); renderDesignSettings(); makeDesigns(); repaint();
  });
  designSettings.addEventListener("click", event => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    const slot = Number(button.dataset.slot), key = button.dataset.preset;
    const preset = ImageState.PALETTES[key];
    if (!preset || !Number.isInteger(slot) || slot < 0 || slot > 2) return;
    settings.designs[slot] = { ...settings.designs[slot], palette: key, bg: preset.bg, accent: preset.accent };
    settings = ImageState.normalize(settings); storeSettings(); renderDesignSettings(); makeDesigns(); repaint();
  });
  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) { status.textContent = "PNG・JPEG・WebPの12MB以下を選んでください"; photoInput.value = ""; return; }
    const nextUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = nextUrl; photo = img; photoName.textContent = file.name; clearPhoto.hidden = false; repaint();
    };
    img.onerror = () => { URL.revokeObjectURL(nextUrl); status.textContent = "画像を読み込めませんでした"; };
    img.src = nextUrl;
  });
  clearPhoto.addEventListener("click", () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = null; photo = null; photoInput.value = ""; photoName.textContent = "未選択"; clearPhoto.hidden = true; repaint();
  });
  document.querySelector("#load-sample").addEventListener("click", () => {
    if (Object.values(read()).some(value => String(value).trim()) && !confirm("今の入力を記入例に置き換えますか？")) return;
    const sample = { name: "はじめてのAI画像講座", audience: "自分のお店を紹介したい方", headline: "あなたのサービスを、ひと目で伝える。", description: "身近な仕事の課題を題材に、伝わる画像づくりを一緒に体験します。", benefit1: "自分のサービスに合う見せ方を考える", benefit2: "チラシとSNSの違いを学ぶ", benefit3: "持ち帰れる画像を作る", date: "", place: "", price: "", cta: "内容を見る", url: "" };
    for (const [key, value] of Object.entries(sample)) form.elements[key].value = value;
    safeStore(read()); repaint();
  });
  document.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("入力内容と設定を新しい案件に置き換えますか？ 完成画像の一覧は残ります。")) return;
    form.reset(); clearPhoto.click(); settings = ImageState.normalize(null);
    safeStore(read()); storeSettings(); renderStructureSettings(); renderDesignSettings(); makeDesigns(); repaint(); go("info");
  });
  consultButton.addEventListener("click", () => {
    setConsultOpen(true);
    const origin = /^https?:$/.test(location.protocol) ? location.origin + "/" : "";
    openWithPrompt(ImageConsult.buildPrompt(read(), origin));
    consultStatus.textContent = "新しいタブの依頼文を確認して送信してください";
  });
  function workPrompt() {
    if (!valid(read()) || !form.reportValidity()) { document.querySelector("#work-status").textContent = "必須項目とURL形式を確認してください"; return ""; }
    return ImageWork.prompt(read(), ImageState.normalize(settings), location.href);
  }
  document.querySelector("#open-work").addEventListener("click", () => {
    const prompt = workPrompt(); if (!prompt) return;
    openWithPrompt(prompt);
    document.querySelector("#work-status").textContent = "開いたChatGPTで依頼文を確認して送信してください。生成後、同じサイトの一覧に反映できたか確認します";
  });
  document.querySelector("#copy-work").addEventListener("click", async () => {
    const prompt = workPrompt(); if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); document.querySelector("#work-status").textContent = "依頼文をコピーしました"; }
    catch { document.querySelector("#work-status").textContent = "コピーできませんでした。ChatGPTで開くボタンをお試しください"; }
  });
  document.querySelector("#restore-hidden").addEventListener("click", () => {
    if (!hidden.length) { document.querySelector("#library-status").textContent = "非表示の画像はありません"; return; }
    hidden = []; try { localStorage.setItem(HIDDEN_KEY, "[]"); } catch { /* current session still updates */ }
    refreshLibrary();
  });
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    const panel = document.querySelector("#theme-panel"); panel.hidden = !panel.hidden;
    document.querySelector("#theme-toggle").setAttribute("aria-expanded", String(!panel.hidden));
  });
  for (const id of ["theme-mode", "theme-main", "theme-sub"]) document.querySelector(`#${id}`).addEventListener("change", saveTheme);
  document.querySelector("#apply-consult").addEventListener("click", () => {
    try { applyConsult(ImageConsult.parseAnswer(document.querySelector("#consult-answer").value), document.querySelector("#consult-overwrite").checked); }
    catch (error) { consultStatus.textContent = error.message || "入力案を読み込めませんでした"; }
  });
  document.querySelector("#close-consult").addEventListener("click", () => setConsultOpen(false));
  document.querySelectorAll(".step").forEach(button => button.addEventListener("click", () => go(button.dataset.step)));
  document.querySelectorAll(".next-step").forEach(button => button.addEventListener("click", () => go(button.dataset.next)));
  document.querySelector("#refresh-library").addEventListener("click", refreshLibrary);
  restore(); restoreSettings(); restoreHidden(); theme(); renderStructureSettings(); renderDesignSettings(); makeDesigns(); repaint(); receiveConsultLink();
})();
