(() => {
  "use strict";
  const KEY = "terakoya-workshop2-image-v1";
  const SETTINGS_KEY = "terakoya-workshop2-image-settings-v1";
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
  let debounce;

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
      const palette = ImageState.PALETTES[design.palette];
      const options = ImageState.LAYOUTS.map((label, value) => `<option value="${value}"${design.layout === value ? " selected" : ""}>${label}</option>`).join("");
      const swatches = Object.entries(ImageState.PALETTES).map(([key, item]) => `<label class="palette-choice" style="background:${item.accent}" title="${item.label}"><input type="radio" name="palette-${index}" value="${key}" data-slot="${index}" aria-label="${item.label}"${design.palette === key ? " checked" : ""}></label>`).join("");
      return `<section class="design-slot"><span class="number">0${index + 1}</span><h2>デザイン ${index + 1}</h2><label>レイアウト<select data-slot="${index}" aria-label="デザイン${index + 1}のレイアウト">${options}</select></label><div class="swatch-preview" style="background:${palette.bg};color:${palette.ink};border-top:6px solid ${palette.accent}">${ImageState.LAYOUTS[design.layout]}</div><p>${ImageState.NOTES[design.layout]}</p><div class="palette-choices" role="group" aria-label="デザイン${index + 1}の色">${swatches}</div></section>`;
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
    consultStatus.textContent = "新しいタブの依頼文を確認して送信してください";
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
    const palette = ImageState.PALETTES[settings.designs[slot].palette];
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
    } else {
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
  async function refreshLibrary() {
    const message = document.querySelector("#library-status");
    message.textContent = "完成画像を確認中";
    try {
      const entries = await ImageLibrary.list();
      for (const url of libraryUrls) URL.revokeObjectURL(url);
      libraryUrls = [];
      libraryList.replaceChildren();
      if (!entries.length) { message.textContent = "完成画像はまだありません。画像を比べる画面から保存してください。"; return; }
      for (const entry of entries) {
        const card = document.createElement("article"); card.className = "library-card";
        const frame = document.createElement("div"); frame.className = "library-image";
        const img = document.createElement("img"); img.alt = `${entry.name}の保存画像`;
        const imageUrl = URL.createObjectURL(entry.previewBlob || entry.imageBlob);
        libraryUrls.push(imageUrl); img.src = imageUrl; frame.append(img);
        const body = document.createElement("div"); body.className = "library-body";
        const title = document.createElement("h2"); title.textContent = entry.name || "名称未設定";
        const meta = document.createElement("p"); meta.textContent = `${entry.medium === "flyer" ? "チラシ A4" : "SNS投稿 4:5"} / デザイン ${entry.slot + 1} / ${new Date(entry.createdAt).toLocaleString("ja-JP")}`;
        const actions = document.createElement("div"); actions.className = "library-actions";
        const downloadButton = document.createElement("button"); downloadButton.className = "primary-button"; downloadButton.type = "button"; downloadButton.textContent = "PNG保存";
        downloadButton.addEventListener("click", () => downloadBlob(entry.imageBlob, entry.filename));
        const editButton = document.createElement("button"); editButton.className = "subtle-button"; editButton.type = "button"; editButton.textContent = "設定を開く";
        editButton.addEventListener("click", () => {
          if (!confirm("今の入力を保存画像の設定に置き換えますか？ 写真は再選択が必要です。")) return;
          for (const key of ImageConsult.KEYS) form.elements[key].value = typeof entry.fields?.[key] === "string" ? entry.fields[key] : "";
          clearPhoto.click(); settings = ImageState.normalize(entry.settings);
          renderStructureSettings(); renderDesignSettings(); makeDesigns();
          safeStore(read()); storeSettings(); go("info");
          document.querySelector("#save-status").textContent = "設定を読み込みました。写真は再選択してください";
        });
        actions.append(downloadButton, editButton); body.append(title, meta, actions); card.append(frame, body); libraryList.append(card);
      }
      message.textContent = `${entries.length}件をこのブラウザに保存中。必要な画像はPNGも保存してください。`;
    } catch (error) { message.textContent = error.message || "画像一覧を開けませんでした"; }
  }
  function makeDesigns() {
    designs.innerHTML = settings.designs.map((design, i) => `
      <section class="design-section" aria-label="デザイン${i + 1}">
        <div class="design-top"><span class="number">0${i + 1}</span><h3>${ImageState.LAYOUTS[design.layout]}</h3><p>${ImageState.NOTES[design.layout]}</p></div>
        <div class="output-pair">
          <div class="output"><div class="output-head"><strong>チラシ A4</strong><div class="output-actions"><button class="subtle-button" type="button" data-action="download" data-concept="${i}" data-medium="flyer">PNG保存</button><button class="primary-button" type="button" data-action="save" data-concept="${i}" data-medium="flyer">完成画像に保存</button></div></div><div class="canvas-wrap"><canvas width="420" height="594" data-concept="${i}" data-medium="flyer" aria-label="デザイン${i + 1}のチラシプレビュー"></canvas></div><small>2480 × 3508 px</small></div>
          <div class="output"><div class="output-head"><strong>SNS投稿 4:5</strong><div class="output-actions"><button class="subtle-button" type="button" data-action="download" data-concept="${i}" data-medium="sns">PNG保存</button><button class="primary-button" type="button" data-action="save" data-concept="${i}" data-medium="sns">完成画像に保存</button></div></div><div class="canvas-wrap"><canvas width="420" height="525" data-concept="${i}" data-medium="sns" aria-label="デザイン${i + 1}のSNS画像プレビュー"></canvas></div><small>1080 × 1350 px</small></div>
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
    const filename = `terakoya_${medium}_design0${slot + 1}.png`;
    button.disabled = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = medium === "flyer" ? 2480 : 1080;
      canvas.height = medium === "flyer" ? 3508 : 1350;
      render(canvas.getContext("2d"), data, slot, medium, photo);
      const imageBlob = await blobFrom(canvas);
      if (button.dataset.action === "download") {
        downloadBlob(imageBlob, filename);
        status.textContent = "PNGを保存しました";
      } else {
        const preview = designs.querySelector(`canvas[data-concept="${slot}"][data-medium="${medium}"]`);
        const previewBlob = await blobFrom(preview);
        await ImageLibrary.save({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: data.name, medium, slot, filename,
          createdAt: new Date().toISOString(), fields: data, settings: ImageState.normalize(settings), imageBlob, previewBlob });
        status.textContent = "完成画像に保存しました。完成画像から再取得できます";
      }
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
    if (event.target.matches("select")) settings.designs[slot].layout = Number(event.target.value);
    else if (event.target.matches('input[type="radio"]')) settings.designs[slot].palette = event.target.value;
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
  });
  document.querySelector("#apply-consult").addEventListener("click", () => {
    try { applyConsult(ImageConsult.parseAnswer(document.querySelector("#consult-answer").value), document.querySelector("#consult-overwrite").checked); }
    catch (error) { consultStatus.textContent = error.message || "入力案を読み込めませんでした"; }
  });
  document.querySelector("#close-consult").addEventListener("click", () => setConsultOpen(false));
  document.querySelectorAll(".step").forEach(button => button.addEventListener("click", () => go(button.dataset.step)));
  document.querySelectorAll(".next-step").forEach(button => button.addEventListener("click", () => go(button.dataset.next)));
  document.querySelector("#refresh-library").addEventListener("click", refreshLibrary);
  restore(); restoreSettings(); renderStructureSettings(); renderDesignSettings(); makeDesigns(); repaint(); receiveConsultLink();
})();
