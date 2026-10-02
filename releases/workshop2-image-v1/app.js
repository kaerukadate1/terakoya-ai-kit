(() => {
  "use strict";
  const KEY = "terakoya-workshop2-image-v1";
  const names = ["エディトリアル", "フォト", "タイポグラフィ"];
  const notes = ["読みやすい余白と明確な情報整理", "写真を中心にサービスの雰囲気を伝える", "大きな文字と色面でひと目で伝える"];
  const form = document.querySelector("#brief-form");
  const designs = document.querySelector("#designs");
  const photoInput = document.querySelector("#photo");
  const photoName = document.querySelector("#photo-name");
  const clearPhoto = document.querySelector("#clear-photo");
  const status = document.querySelector("#export-status");
  let photo = null;
  let photoUrl = null;
  let debounce;

  function read() {
    return Object.fromEntries(new FormData(form).entries());
  }
  function safeStore(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); document.querySelector("#save-status").textContent = "この端末に保存済み"; }
    catch { document.querySelector("#save-status").textContent = "保存不可"; }
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
  function render(ctx, data, concept, medium, image) {
    const isFlyer = medium === "flyer";
    const H = isFlyer ? 1414 : 1250;
    const name = placeholder(data.name, "サービス名");
    const headline = placeholder(data.headline, "伝えたいひとこと");
    const cta = placeholder(data.cta, "次のアクション");
    const summary = String(data.description || "").trim();
    const list = bullets(data);
    const details = meta(data);
    const palette = [
      { bg: "#f7f7f4", ink: "#20363c", accent: "#db664c", soft: "#e1edea" },
      { bg: "#1b3237", ink: "#ffffff", accent: "#e8b46a", soft: "#e8eeeb" },
      { bg: "#d8e8ce", ink: "#162b33", accent: "#ed7254", soft: "#ffffff" }
    ][concept];
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
        if (data.audience) drawText(ctx, data.audience, 102, isFlyer ? 665 : 788, 790, 180, 49, palette.ink);
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
        fill(ctx, palette.accent, 66, 1070, 868, 98);
        drawText(ctx, cta, 96, 1088, 810, 65, 42, "#ffffff");
      }
    } else if (concept === 1) {
      const photoH = isFlyer ? 690 : 700;
      if (image) imageCover(ctx, image, 0, 0, 1000, photoH);
      else fill(ctx, "#517879", 0, 0, 1000, photoH);
      fill(ctx, "rgba(20, 45, 48, 0.78)", 0, 0, 1000, 172);
      fill(ctx, palette.bg, 0, photoH, 1000, H - photoH);
      fill(ctx, palette.accent, 58, 52, 10, 86);
      drawText(ctx, name, 90, 62, 840, 100, 42, "#ffffff");
      drawText(ctx, headline, 58, photoH + 43, 884, isFlyer ? 235 : 285, isFlyer ? 84 : 90, "#ffffff", 800, 38);
      if (isFlyer) {
        drawText(ctx, summary, 58, 995, 884, 92, 33, "#e9f0ec", 500);
        let y = 1090;
        for (const item of list.slice(0, 3)) { fill(ctx, palette.accent, 58, y + 14, 11, 11); drawText(ctx, item, 83, y, 846, 45, 29, "#ffffff", 600); y += 45; }
        drawText(ctx, details, 58, 1234, 884, 68, 25, "#e9f0ec", 600, 20);
        line(ctx, 58, 1310, 884, palette.accent, 3);
        drawText(ctx, cta, 58, 1332, 520, 55, 32, palette.accent);
        drawText(ctx, data.url || "", 600, 1319, 340, 75, 18, "#e9f0ec", 500, 16);
      } else {
        fill(ctx, palette.accent, 58, 1090, 884, 96);
        drawText(ctx, cta, 88, 1108, 824, 66, 42, palette.bg);
      }
    } else {
      fill(ctx, palette.accent, 0, 0, 1000, isFlyer ? 260 : 295);
      drawText(ctx, name, 62, 60, 870, 120, 56, palette.ink);
      fill(ctx, palette.soft, 50, isFlyer ? 298 : 335, 900, isFlyer ? 640 : 650);
      drawText(ctx, headline, 88, isFlyer ? 358 : 400, 824, isFlyer ? 480 : 480, isFlyer ? 103 : 113, palette.ink, 800, 43);
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
        drawText(ctx, cta, image ? 402 : 82, 1050, image ? 514 : 836, 95, 42, "#ffffff");
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
    status.textContent = valid(data) ? "" : "必須項目を入れるとPNGを保存できます";
  }
  function download(canvas, filename) {
    canvas.toBlob(blob => {
      if (!blob) { status.textContent = "PNGを作成できませんでした"; return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  }
  function makeDesigns() {
    designs.innerHTML = names.map((name, i) => `
      <section class="design-section" aria-label="デザイン${i + 1}">
        <div class="design-top"><span class="number">0${i + 1}</span><h3>${name}</h3><p>${notes[i]}</p></div>
        <div class="output-pair">
          <div class="output"><div class="output-head"><strong>チラシ A4</strong><button type="button" data-concept="${i}" data-medium="flyer">PNG保存</button></div><div class="canvas-wrap"><canvas width="420" height="594" data-concept="${i}" data-medium="flyer" aria-label="${name}のチラシプレビュー"></canvas></div><small>2480 × 3508 px</small></div>
          <div class="output"><div class="output-head"><strong>SNS投稿 4:5</strong><button type="button" data-concept="${i}" data-medium="sns">PNG保存</button></div><div class="canvas-wrap"><canvas width="420" height="525" data-concept="${i}" data-medium="sns" aria-label="${name}のSNS画像プレビュー"></canvas></div><small>1080 × 1350 px</small></div>
        </div>
      </section>`).join("");
    designs.addEventListener("click", event => {
      const button = event.target.closest("button[data-medium]");
      if (!button) return;
      const data = read();
      if (!valid(data) || !form.reportValidity()) { status.textContent = "必須項目とURL形式を確認してください"; return; }
      const medium = button.dataset.medium;
      const concept = Number(button.dataset.concept);
      const canvas = document.createElement("canvas");
      canvas.width = medium === "flyer" ? 2480 : 1080;
      canvas.height = medium === "flyer" ? 3508 : 1350;
      render(canvas.getContext("2d"), data, concept, medium, photo);
      download(canvas, `terakoya_${medium}_design0${concept + 1}.png`);
      status.textContent = `${names[concept]}の${medium === "flyer" ? "チラシ" : "SNS画像"}を保存しました`;
    });
  }
  form.addEventListener("input", () => {
    document.querySelector("#save-status").textContent = "保存中";
    clearTimeout(debounce);
    debounce = setTimeout(() => { safeStore(read()); repaint(); }, 120);
  });
  form.addEventListener("submit", event => event.preventDefault());
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
    const sample = { name: "はじめてのAI画像講座", audience: "自分のお店を紹介したい方", headline: "あなたのサービスを、ひと目で伝える。", description: "身近な仕事の課題を題材に、伝わる画像づくりを一緒に体験します。", benefit1: "自分のサービスに合う見せ方を考える", benefit2: "チラシとSNSの違いを学ぶ", benefit3: "持ち帰れる画像を作る", date: "", place: "", price: "", cta: "内容を見る", url: "" };
    for (const [key, value] of Object.entries(sample)) form.elements[key].value = value;
    safeStore(read()); repaint();
  });
  document.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("入力内容を消して新規作成しますか？")) return;
    form.reset(); clearPhoto.click(); safeStore(read()); repaint();
  });
  restore(); makeDesigns(); repaint();
})();
