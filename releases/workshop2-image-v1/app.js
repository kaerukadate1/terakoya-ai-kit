(() => {
  "use strict";
  const KEY = "terakoya-workshop2-image-v1";
  const SETTINGS_KEY = "terakoya-workshop2-image-settings-v1";
  const THEME_KEY = "terakoya-workshop2-image-theme-v1";
  const HIDDEN_KEY = "terakoya-workshop2-image-hidden-v1";
  const form = document.querySelector("#brief-form");
  const designSettings = document.querySelector("#design-settings");
  const structureRoot = document.querySelector(".structure-columns");
  const libraryGroups = {
    flyer: document.querySelector("#library-flyer"),
    portrait: document.querySelector("#library-sns-portrait"),
    square: document.querySelector("#library-sns-square"),
    landscape: document.querySelector("#library-sns-landscape")
  };
  const photoInput = document.querySelector("#photo");
  const photoName = document.querySelector("#photo-name");
  const clearPhoto = document.querySelector("#clear-photo");
  const status = document.querySelector("#work-status");
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
    if (step === "library") refreshLibrary();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }
  function renderStructureSettings() {
    for (const key of Object.keys(settings.flyer)) {
      const node = structureRoot.querySelector(`#flyer-fields [name="${key}"]`);
      if (node) node.checked = settings.flyer[key];
    }
    for (const id of Object.keys(settings.outputs)) {
      const node = structureRoot.querySelector(`[data-output="${id}"]`);
      if (node) node.checked = settings.outputs[id];
    }
    document.querySelector("#sns-support").value = settings.snsSupport;
    updateGenerateButton();
  }
  function updateGenerateButton() {
    const count = ImageWork.plan(settings).count;
    document.querySelector("#open-work").textContent = `ChatGPTで${count}枚を生成`;
  }
  function groupKey(entry) {
    if (entry.format && libraryGroups[entry.format]) return entry.format;
    return entry.medium === "flyer" ? "flyer" : "portrait";
  }
  function renderDesignSettings() {
    designSettings.innerHTML = settings.designs.map((design, index) => {
      const palette = ImageState.palette(design);
      const options = ImageState.LAYOUTS.map((label, value) => `<option value="${value}"${design.layout === value ? " selected" : ""}>${label}</option>`).join("");
      const swatches = Object.entries(ImageState.PALETTES).map(([key, item]) => `<button class="palette-choice" type="button" data-preset="${key}" data-slot="${index}" style="background:${item.accent}" title="${item.label}" aria-label="${item.label}の配色にする"></button>`).join("");
      return `<section class="design-slot"><span class="number">0${index + 1}</span><h2>デザイン ${index + 1}</h2><label class="include-design"><input type="checkbox" data-include data-slot="${index}"${design.include ? " checked" : ""}>この案を作る</label><label>デザインの雰囲気<select data-layout data-slot="${index}" aria-label="デザイン${index + 1}の雰囲気">${options}</select></label><div class="swatch-preview" style="background:${palette.bg};color:${palette.ink};border-top:6px solid ${palette.accent}">${ImageState.LAYOUTS[design.layout]}</div><p>${ImageState.NOTES[design.layout]}</p><div class="palette-choices" role="group" aria-label="デザイン${index + 1}の配色例">${swatches}</div><div class="color-fields"><label>背景色<input type="color" data-color="bg" data-slot="${index}" value="${design.bg}"></label><label>アクセント色<input type="color" data-color="accent" data-slot="${index}" value="${design.accent}"></label></div></section>`;
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
  function valid(data) {
    return ["name", "headline", "cta"].every(key => String(data[key] || "").trim());
  }
  function repaint() {
    const data = read();
    status.textContent = !valid(data) ? "必須項目を入れると生成できます" :
      Array.from(String(data.headline || "")).length > 38 ? "見出しが長めです。生成時に改行と文字の収まりを確認してください" : "";
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
    renderStructureSettings(); renderDesignSettings();
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
      let local = [], remote = [], remoteError = "", localError = "";
      try { local = await ImageLibrary.list(); }
      catch { localError = "旧版の端末保存画像を開けません"; }
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
      for (const group of Object.values(libraryGroups)) group.replaceChildren();
      if (!entries.length) { message.textContent = remoteError || localError || "完成画像はまだありません。画像を仕上げる画面から生成してください。"; }
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
        const meta = document.createElement("p"); meta.textContent = `${ImageWork.labelFor(entry)} / デザイン ${entry.slot + 1} / ${entry.createdAt ? new Date(entry.createdAt).toLocaleString("ja-JP") : "日時未記録"}${entry.source === "local" ? " / 旧版の端末保存" : ""}`;
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
        body.append(title, meta, actions); card.append(frame, body); libraryGroups[groupKey(entry)].append(card);
      }
      for (const [key, group] of Object.entries(libraryGroups)) {
        if (!entries.some(entry => groupKey(entry) === key)) {
          const empty = document.createElement("p"); empty.className = "library-empty"; empty.textContent = "まだ完成画像はありません"; group.append(empty);
        }
      }
      if (entries.length) message.textContent = `${entries.length}件を表示中${remoteError ? `。${remoteError}` : ""}${localError ? `。${localError}` : ""}`;
    } catch (error) { message.textContent = error.message || "画像一覧を開けませんでした"; }
  }
  form.addEventListener("input", () => {
    document.querySelector("#save-status").textContent = "保存中";
    clearTimeout(debounce);
    debounce = setTimeout(() => { safeStore(read()); repaint(); }, 120);
  });
  form.addEventListener("submit", event => event.preventDefault());
  structureRoot.addEventListener("change", event => {
    const output = event.target.dataset.output;
    if (output && Object.hasOwn(settings.outputs, output)) settings.outputs[output] = event.target.checked;
    else if (Object.hasOwn(settings.flyer, event.target.name)) settings.flyer[event.target.name] = event.target.checked;
    else return;
    settings = ImageState.normalize(settings);
    storeSettings(); renderStructureSettings(); repaint();
  });
  document.querySelector("#sns-support").addEventListener("change", event => {
    settings.snsSupport = event.target.value;
    settings = ImageState.normalize(settings); storeSettings(); updateGenerateButton(); repaint();
  });
  designSettings.addEventListener("change", event => {
    const slot = Number(event.target.dataset.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) return;
    if (event.target.matches("input[data-include]")) settings.designs[slot].include = event.target.checked;
    else if (event.target.matches("select[data-layout]")) settings.designs[slot].layout = Number(event.target.value);
    else if (event.target.matches("input[data-color]")) settings.designs[slot][event.target.dataset.color] = event.target.value;
    else return;
    settings = ImageState.normalize(settings); storeSettings(); renderDesignSettings(); updateGenerateButton(); repaint();
  });
  designSettings.addEventListener("click", event => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    const slot = Number(button.dataset.slot), key = button.dataset.preset;
    const preset = ImageState.PALETTES[key];
    if (!preset || !Number.isInteger(slot) || slot < 0 || slot > 2) return;
    settings.designs[slot] = { ...settings.designs[slot], palette: key, bg: preset.bg, accent: preset.accent };
    settings = ImageState.normalize(settings); storeSettings(); renderDesignSettings(); repaint();
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
    for (const [key, value] of Object.entries(ImageConsult.SAMPLE_FIELDS)) form.elements[key].value = value;
    safeStore(read()); repaint();
  });
  document.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("入力内容と設定を新しい案件に置き換えますか？ 完成画像の一覧は残ります。")) return;
    form.reset(); clearPhoto.click(); settings = ImageState.normalize(null);
    safeStore(read()); storeSettings(); renderStructureSettings(); renderDesignSettings(); repaint(); go("info");
  });
  consultButton.addEventListener("click", () => {
    const fields = ImageConsult.prepareFields(read());
    for (const [key, value] of Object.entries(fields)) form.elements[key].value = value;
    safeStore(read()); repaint();
    document.querySelector("#consult-answer").value = "";
    document.querySelector("#consult-overwrite").checked = false;
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
  restore(); restoreSettings(); restoreHidden(); theme(); renderStructureSettings(); renderDesignSettings(); repaint(); receiveConsultLink();
})();
