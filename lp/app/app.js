(function () {
  "use strict";
  const Core = window.LpCore;
  const Library = window.LpLibrary;
  const KEY = "terakoya-lp-maker-v1";
  const LIBRARY_KEY = "terakoya-lp-maker-library-v1";
  const FIELD_INFO = [
    ["title", "商品・セミナー名", "何を案内しますか？", true],
    ["purpose", "LPの目的", "例：セミナーへの参加申込み", false],
    ["audience", "対象者", "誰に向けたものですか？", true],
    ["problem", "対象者の悩み", "実際によく聞く悩み・困りごと", false, true],
    ["outcome", "提供できる価値", "参加後に何を持ち帰れますか？", false, true],
    ["offer", "講座・サービス内容", "何を、どのように提供しますか？", true, true],
    ["details", "具体的な内容", "扱うテーマ、進め方、所要時間など", false, true],
    ["date", "日時・期間", "決まっていなければ空欄", false],
    ["place", "場所・開催方法", "会場、オンラインなど", false],
    ["price", "価格", "確定した金額だけ", false],
    ["application", "申込の案内文", "例：参加申込はこちら", false],
    ["applicationUrl", "申込URL", "https://... 未定なら空欄", false],
    ["host", "主催者・講師", "名称が決まっている場合", false],
    ["profile", "プロフィール原文", "入力した事実だけを使います", false, true],
    ["proof", "実績の実素材", "根拠のある数字や事例のみ", false, true],
    ["testimonials", "お客様の声の実素材", "許可を得た原文のみ", false, true],
    ["bonus", "確定済みの特典", "未確定の案は入れません", false, true],
    ["faq", "入れたいFAQ", "実際によくある質問と回答", false, true],
    ["notes", "その他の意向", "必ず伝えたいこと、避けたい表現など", false, true]
  ];
  let project;
  try { project = Core.normalizeProject(JSON.parse(localStorage.getItem(KEY) || "null")); }
  catch { project = Core.blankProject(); }
  let currentStep = "info";
  let library = [];
  try { library = Library.normalizeList(JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]"), location.href); }
  catch { library = []; }
  let toastTimer;
  const $ = (id) => document.getElementById(id);

  function notify(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(project));
      $("save-status").textContent = "この端末に自動保存済み";
    } catch {
      $("save-status").textContent = "保存できませんでした";
      notify("端末への保存に失敗しました。.jsonでも保存してください。");
    }
  }
  function saveLibrary() {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)); }
    catch { notify("一覧の端末保存に失敗しました"); }
  }
  function renderLibrary() {
    const box = $("library-grid"); box.replaceChildren();
    if (!library.length) {
      box.append(element("p", "library-empty", "完成したLPはまだありません。Workで制作するとここに並びます。"));
      return;
    }
    for (const entry of library) {
      const card = element("article", "library-card");
      const image = element("div", "library-image");
      if (entry.thumbnail) {
        const img = document.createElement("img"); img.src = entry.thumbnail; img.alt = `${entry.title}のサムネイル`; img.loading = "lazy";
        img.onerror = () => { img.remove(); image.textContent = "画像なし"; };
        image.append(img);
      } else if (new URL(entry.url).origin === location.origin) {
        const frame = document.createElement("iframe"); frame.src = entry.url; frame.title = `${entry.title}のプレビュー`; frame.loading = "lazy"; frame.tabIndex = -1;
        image.append(frame);
      } else image.textContent = "画像なし";
      const body = element("div", "library-card-body");
      body.append(element("h2", "", entry.title), element("p", "", [entry.design, entry.createdAt.slice(0, 10)].filter(Boolean).join(" · ")));
      const actions = element("div", "library-card-actions");
      const link = element("a", "", "LPを開く ↗"); link.href = entry.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      actions.append(link);
      if (entry.projectSettings) {
        const edit = element("button", "subtle-button", "この設定を編集"); edit.type = "button";
        edit.addEventListener("click", () => restoreLibrarySettings(entry));
        actions.append(edit);
      }
      body.append(actions); card.append(image, body); box.append(card);
    }
  }
  async function refreshLibrary() {
    $("library-status").textContent = "一覧を確認中…";
    try {
      const response = await fetch(`completed-lps.json?ts=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = Library.normalizeList(await response.json(), location.href);
      library = Library.mergeLists(library, remote, location.href);
      saveLibrary(); renderLibrary(); renderHistory();
      $("library-status").textContent = `${library.length}件を表示中。Workで追加したLPはここに反映されます。`;
    } catch {
      $("library-status").textContent = "サイトの一覧に接続できません。端末に保存済みのLPを表示しています。";
      renderLibrary(); renderHistory();
    }
  }
  function restoreLibrarySettings(entry) {
    if (Object.values(project.fields).some((value) => value.trim()) && !confirm("現在の入力を、保存した制作設定に切り替えますか？")) return;
    project = Core.normalizeProject(entry.projectSettings);
    if (entry.slot) project.workDesigns = [entry.slot - 1];
    persist(); renderAll(); go("info");
    notify("制作設定を開きました。元のLPはそのまま残ります");
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function inputField(key, labelText, placeholder, required, multiline) {
    const label = element("label", multiline ? "field-wide" : "");
    const heading = element("span", "field-label");
    heading.append(element("span", "", labelText));
    if (required) heading.append(element("span", "required", "初稿に必要"));
    label.append(heading);
    const input = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) input.type = key === "applicationUrl" ? "url" : "text";
    else input.rows = 3;
    input.placeholder = placeholder;
    input.value = project.fields[key];
    input.maxLength = 6000;
    input.id = `field-${key}`;
    input.addEventListener("input", () => {
      project.fields[key] = input.value;
      const affected = {
        problem: ["problem"], outcome: ["future", "benefit"], offer: ["solution", "offer"],
        details: ["offer"], host: ["profile"], profile: ["profile"], proof: ["proof"],
        testimonials: ["testimonials"], bonus: ["bonus"], date: ["outline"],
        place: ["outline"], price: ["outline"], faq: ["faq"], application: ["cta"]
      };
      for (const section of affected[key] || []) delete project.edits[section];
      persist();
      updateDynamic();
    });
    label.append(input);
    return label;
  }
  function renderFields() {
    const mainKeys = new Set(["title", "audience", "offer", "outcome"]);
    const eventKeys = new Set(["date", "place", "price", "application", "applicationUrl"]);
    $("fields").replaceChildren(...FIELD_INFO.filter(([key]) => mainKeys.has(key)).map((args) => inputField(...args)));
    $("event-fields").replaceChildren(...FIELD_INFO.filter(([key]) => eventKeys.has(key)).map((args) => inputField(...args)));
    $("extra-fields").replaceChildren(...FIELD_INFO.filter(([key]) => !mainKeys.has(key) && !eventKeys.has(key)).map((args) => inputField(...args)));
    $("bonus-mode").value = project.bonusMode;
    $("bonus-idea-count").value = String(project.bonusIdeaCount);
    $("bonus-count-label").hidden = project.bonusMode !== "ideas";
    $("hero-thumb").hidden = !project.heroImage;
    $("remove-hero").hidden = !project.heroImage;
    if (project.heroImage) $("hero-thumb").src = project.heroImage;
  }
  function renderSections() {
    const list = $("section-list");
    list.replaceChildren();
    Core.SECTIONS.forEach(([key, labelText]) => {
      const row = element("div", "section-row");
      const label = element("div");
      label.append(element("strong", "", labelText));
      if (["proof", "testimonials"].includes(key)) label.append(element("small", "", "実際の素材がある場合のみ"));
      const select = document.createElement("select");
      select.setAttribute("aria-label", `${labelText}の扱い`);
      const modes = ["proof", "testimonials"].includes(key) ? [["include", "入れる"], ["exclude", "入れない"]] : [["auto", "AIにお任せ"], ["include", "入れる"], ["exclude", "入れない"]];
      modes.forEach(([value, text]) => select.append(new Option(text, value)));
      select.value = project.sections[key];
      select.addEventListener("change", () => { project.sections[key] = select.value; persist(); updateDynamic(); });
      const note = element("input", "note");
      note.type = "text";
      note.placeholder = "この項目への個別指示（任意）";
      note.setAttribute("aria-label", `${labelText}への個別指示`);
      note.value = project.sectionNotes[key] || "";
      note.maxLength = 1500;
      note.addEventListener("input", () => { project.sectionNotes[key] = note.value; persist(); updatePrompt(); });
      row.append(label, select, note);
      list.append(row);
    });
    renderExtras();
  }
  function renderExtras() {
    const box = $("extra-sections"); box.replaceChildren();
    project.extraSections.forEach((section, index) => {
      const row = element("div", "extra-row");
      const nameLabel = element("label", "", "項目名");
      const name = document.createElement("input"); name.type = "text"; name.value = section.title; name.maxLength = 80; nameLabel.append(name);
      const contentLabel = element("label", "", "入れたい内容");
      const content = document.createElement("textarea"); content.rows = 2; content.value = section.content; content.maxLength = 2000; contentLabel.append(content);
      [name, content].forEach((control) => control.addEventListener("input", () => { section.title = name.value; section.content = content.value; persist(); updateDynamic(); }));
      const remove = element("button", "text-button", "削除"); remove.type = "button";
      remove.addEventListener("click", () => { project.extraSections.splice(index, 1); persist(); renderExtras(); updateDynamic(); });
      row.append(nameLabel, contentLabel, remove); box.append(row);
    });
  }
  function renderDesigns() {
    const list = $("design-list"); list.replaceChildren();
    project.designs.forEach((selected, index) => {
      const item = element("div", "design-slot");
      item.append(element("div", "number", `案 ${String(index + 1).padStart(2, "0")}`), element("h2", "", "方向性"));
      const select = document.createElement("select"); select.setAttribute("aria-label", `案${index + 1}のデザイン`);
      Object.entries(Core.PRESETS).forEach(([id, preset]) => select.append(new Option(preset.label, id)));
      select.value = selected;
      select.addEventListener("change", () => { project.designs[index] = select.value; persist(); renderDesigns(); updateDynamic(); });
      const preset = Core.PRESETS[selected];
      const swatch = element("div", "swatch", "Aa あいう");
      swatch.style.background = preset.bg; swatch.style.color = preset.accent; swatch.style.border = `1px solid ${preset.soft}`;
      const directionLabel = element("label", "image-direction", "画像の方向性");
      const directionInput = document.createElement("textarea");
      directionInput.rows = 4;
      directionInput.maxLength = 500;
      directionInput.dataset.imageDirection = String(index);
      directionInput.value = project.imageDirections[index] || Core.imageBriefFor(project, index);
      directionInput.addEventListener("input", () => { project.imageDirections[index] = directionInput.value; persist(); updateDynamic(); });
      directionLabel.append(directionInput);
      const photoLabel = element("label", "design-photo", `案${index + 1}の写真（任意）`);
      const photoInput = document.createElement("input"); photoInput.type = "file"; photoInput.accept = "image/jpeg,image/png,image/webp";
      photoInput.addEventListener("change", async () => {
        const file = photoInput.files?.[0];
        if (!file) return;
        try { project.designImages[index] = await imageToDataUrl(file); persist(); renderDesigns(); updateDynamic(); notify(`案${index + 1}の写真を反映しました`); }
        catch (error) { notify(error.message || "写真を読み込めませんでした"); }
      });
      photoLabel.append(photoInput);
      item.append(select, swatch, element("p", "", preset.description), directionLabel, photoLabel);
      if (project.designImages[index]) {
        const thumb = document.createElement("img"); thumb.src = project.designImages[index]; thumb.alt = `案${index + 1}の写真`; thumb.className = "design-thumb"; item.append(thumb);
        const remove = element("button", "text-button", "この案の写真を外す"); remove.type = "button";
        remove.addEventListener("click", () => { project.designImages[index] = ""; persist(); renderDesigns(); updateDynamic(); });
        item.append(remove);
      }
      list.append(item);
    });
    const refs = $("references"); refs.replaceChildren();
    project.referenceUrls.forEach((url, index) => {
      const label = element("label", "", `参考LP ${index + 1}`);
      const input = document.createElement("input"); input.type = "url"; input.placeholder = "https://..."; input.value = url;
      input.addEventListener("input", () => { project.referenceUrls[index] = input.value; persist(); updatePrompt(); });
      label.append(input); refs.append(label);
    });
  }
  function download(name, body, mime) {
    const blob = new Blob([body], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function previewImageFor(id, index) {
    if (project.designImages[index]) return project.designImages[index];
    return project.heroImage || "";
  }
  async function imageToDataUrl(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10_000_000) throw new Error("10MB以下のJPEG・PNG・WebPを選んでください");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const data = canvas.toDataURL("image/webp", 0.78);
    if (data.length >= 1_000_000) throw new Error("画像が大きすぎます。別の画像を選んでください");
    return data;
  }
  function renderPreviews() {
    const box = $("previews"); box.replaceChildren();
    project.designs.forEach((id, index) => {
      const preset = Core.PRESETS[id];
      const item = element("article", "preview-item");
      const head = element("header"); head.append(element("strong", "", `${index + 1}案 ${preset.label}`), element("span", "", preset.description));
      const brief = element("p", "image-brief", `画像の方向性: ${project.imageDirections[index] || Core.imageBriefFor(project, index)}`);
      const frame = element("div", "preview-frame");
      const iframe = document.createElement("iframe"); iframe.title = `${preset.label}のLPプレビュー`;
      iframe.setAttribute("sandbox", ""); iframe.loading = "lazy"; iframe.srcdoc = Core.buildHtml(project, id, previewImageFor(id, index)); frame.append(iframe);
      const fit = () => { iframe.style.transform = `scale(${frame.clientWidth / 960})`; };
      new ResizeObserver(fit).observe(frame);
      fit();
      const actions = element("div", "preview-actions");
      const open = element("button", "subtle-button", "大きく見る");
      open.addEventListener("click", () => {
        const blob = new Blob([Core.buildHtml(project, id, previewImageFor(id, index))], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      });
      const save = element("button", "subtle-button", "HTMLを保存");
      save.addEventListener("click", () => download(`lp-draft-${index + 1}-${id}.html`, Core.buildHtml(project, id, previewImageFor(id, index)), "text/html;charset=utf-8"));
      actions.append(open, save); item.append(head, frame, brief, actions); box.append(item);
    });
    const issueBox = $("issues"); issueBox.replaceChildren();
    const issues = Core.issues(project);
    if (issues.length) {
      const details = element("details", "issue-details");
      details.append(element("summary", "", `公開前の確認事項 ${issues.length}件`));
      issues.forEach((message) => details.append(element("p", "", message)));
      issueBox.append(details);
    }
  }
  function renderEdit() {
    const select = $("edit-section");
    const previous = select.value; select.replaceChildren();
    Core.SECTIONS.forEach(([key, label]) => select.append(new Option(label, key)));
    select.value = previous || "problem";
    $("edit-content").value = Core.contentFor(project, select.value);
  }
  function renderWorkSelection() {
    const box = $("work-designs"); box.replaceChildren();
    project.designs.forEach((id, index) => {
      const label = element("label", "work-design-choice");
      const input = document.createElement("input");
      input.type = "checkbox"; input.checked = project.workDesigns.includes(index);
      input.addEventListener("change", () => {
        const next = project.workDesigns.filter((slot) => slot !== index);
        if (input.checked) next.push(index);
        if (!next.length) { input.checked = true; notify("完成させる案を1つ以上選んでください"); return; }
        project.workDesigns = next.sort(); persist(); updateWorkCount(); updatePrompt();
      });
      const name = element("span", "", `${index + 1}案 ${Core.PRESETS[id].label}`);
      label.append(input, name); box.append(label);
    });
    updateWorkCount();
  }
  function updateWorkCount() {
    $("work-selection-count").textContent = `Workで完成させる案: ${project.workDesigns.length}案`;
  }
  function updatePrompt() {
    $("prompt-preview").textContent = workPrompt();
  }
  function workPrompt() { return Core.buildWorkPrompt(project, location.origin + "/"); }
  function updateDynamic() {
    document.querySelectorAll("[data-image-direction]").forEach((input) => {
      const index = Number(input.dataset.imageDirection);
      if (!project.imageDirections[index]) input.value = Core.imageBriefFor(project, index);
    });
    if (currentStep === "preview") { renderPreviews(); renderEdit(); }
    if (currentStep === "work") { renderWorkSelection(); updatePrompt(); }
  }
  function go(step) {
    currentStep = step;
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === step));
    document.querySelectorAll(".step").forEach((button) => button.classList.toggle("active", button.dataset.step === step));
    if (step === "preview") { renderPreviews(); renderEdit(); }
    if (step === "work") { renderWorkSelection(); updatePrompt(); }
    if (step === "library") refreshLibrary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function sample() {
    const next = Core.blankProject();
    Object.assign(next.fields, Core.SAMPLE_FIELDS);
    next.sections.faq = "include";
    next.extraSections = [
      { title: "持ち物", content: "スマートフォン、撮影する商品1点、白い紙または白い布" },
    ];
    next.pending = ["申込URLが未定です", "主催者・講師は未設定です"];
    next.sample = true;
    project = next;
    persist(); renderAll(); notify("サンプルを読み込みました");
  }
  function renderAll() { renderFields(); renderSections(); renderDesigns(); if (currentStep === "preview") { renderPreviews(); renderEdit(); } if (currentStep === "work") { renderWorkSelection(); updatePrompt(); } }
  function parseConsultAnswer(value) {
    if (value.length > 200_000) throw new Error("回答が長すぎます");
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(value);
    return JSON.parse((fenced ? fenced[1] : value).trim());
  }
  function applyConsultAnswer(answer, overwrite = false) {
    const result = Core.applyConsultFields(project, answer, overwrite);
    if (!result.applied) return notify("反映できる入力案がありませんでした");
    project = result.project;
    persist(); renderAll(); $("consult-panel").hidden = true; go("info");
    notify(`${result.applied}項目を反映しました`);
  }
  function receiveConsultLink() {
    if (!location.hash.startsWith("#lp-intake=")) return;
    const encoded = location.hash.slice("#lp-intake=".length);
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* File URLs may refuse history changes. */ }
    try {
      if (!/^[A-Za-z0-9_-]{1,40000}$/.test(encoded)) throw new Error("入力案のリンクが無効です");
      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      applyConsultAnswer(JSON.parse(new TextDecoder().decode(bytes)));
    } catch { notify("入力案のリンクを読み込めませんでした。JSONを貼り付けてください"); }
  }
  function openWithPrompt(prompt) {
    const link = `https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}`;
    if (link.length > 48000) { download("lp-work-request.txt", prompt, "text/plain;charset=utf-8"); notify("依頼文が長いため.txtを保存しました。Workに添付してください。"); return; }
    const anchor = document.createElement("a"); anchor.href = link; anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.referrerPolicy = "no-referrer";
    document.body.append(anchor); anchor.click(); anchor.remove();
    notify("新しいタブの入力内容を確認して送信してください");
  }

  document.querySelectorAll(".step").forEach((button) => button.addEventListener("click", () => go(button.dataset.step)));
  document.querySelectorAll(".next-step").forEach((button) => button.addEventListener("click", () => go(button.dataset.next)));
  $("load-sample").addEventListener("click", () => { if (Object.values(project.fields).some((v) => v.trim()) && !confirm("今の入力をサンプルに置き換えますか？ 置き換える前に履歴にも残します。")) return; checkpointHistory(); sample(); });
  $("consult").addEventListener("click", () => {
    if (project.sample) {
      checkpointHistory();
      project = Core.prepareConsultProject(project);
      persist(); renderAll();
    }
    $("consult-answer").value = "";
    $("consult-overwrite").checked = false;
    $("consult-panel").hidden = false;
    openWithPrompt(Core.buildConsultPrompt(project, location.origin + "/"));
  });
  $("apply-consult").addEventListener("click", () => {
    try { applyConsultAnswer(parseConsultAnswer($("consult-answer").value), $("consult-overwrite").checked); }
    catch (error) { notify(error.message || "入力案を読み込めませんでした"); }
  });
  $("close-consult").addEventListener("click", () => { $("consult-panel").hidden = true; });
  $("new-project").addEventListener("click", () => {
    if (Object.values(project.fields).some((v) => v.trim()) && !confirm("新しい案件を始めますか？ 現在の入力はこの端末から置き換わります。.jsonで保存しておくと戻せます。")) return;
    project = Core.blankProject(); persist(); renderAll(); go("info"); notify("新しい案件を始めました");
  });
  $("bonus-mode").addEventListener("change", (event) => { project.bonusMode = event.target.value; $("bonus-count-label").hidden = project.bonusMode !== "ideas"; persist(); updateDynamic(); });
  $("hero-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      project.heroImage = await imageToDataUrl(file);
      persist(); renderFields(); updateDynamic(); notify("写真をLPに反映しました");
    } catch (error) { notify(error.message || "写真を読み込めませんでした"); }
    finally { event.target.value = ""; }
  });
  $("remove-hero").addEventListener("click", () => { project.heroImage = ""; persist(); renderFields(); updateDynamic(); notify("写真を外しました"); });
  $("bonus-idea-count").addEventListener("change", (event) => { project.bonusIdeaCount = Number(event.target.value); persist(); updatePrompt(); });
  $("add-section").addEventListener("click", () => { if (project.extraSections.length >= 8) return notify("自由項目は8つまでです"); project.extraSections.push({ title: "", content: "" }); renderExtras(); persist(); });
  $("edit-section").addEventListener("change", () => { $("edit-content").value = Core.contentFor(project, $("edit-section").value); });
  $("save-edit").addEventListener("click", () => { const key = $("edit-section").value; project.edits[key] = $("edit-content").value; persist(); renderPreviews(); notify("この箇所を3案に反映しました"); });
  $("reset-edit").addEventListener("click", () => { const key = $("edit-section").value; delete project.edits[key]; $("edit-content").value = Core.contentFor(project, key); persist(); renderPreviews(); notify("元の文章に戻しました"); });
  $("export-project").addEventListener("click", () => download("lp-project.json", JSON.stringify(project, null, 2), "application/json;charset=utf-8"));
  $("import-project").addEventListener("click", () => $("project-file").click());
  $("project-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 4_000_000) return notify("4MB以下の.jsonを選んでください");
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !parsed.fields || !Array.isArray(parsed.designs)) throw new Error("形式が違います");
      if (Object.values(project.fields).some((v) => v.trim()) && !confirm("今の入力を読み込むファイルで置き換えますか？")) return;
      project = Core.normalizeProject(parsed); persist(); renderAll(); notify("制作データを読み込みました");
    } catch { notify("制作データを読み込めませんでした"); }
    finally { event.target.value = ""; }
  });
  $("open-work").addEventListener("click", () => { checkpointHistory(); openWithPrompt(workPrompt()); });
  $("copy-prompt").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(workPrompt()); notify("制作指示をコピーしました"); }
    catch { notify("コピーできませんでした。.txt保存をご利用ください"); }
  });
  $("download-prompt").addEventListener("click", () => download("lp-work-request.txt", workPrompt(), "text/plain;charset=utf-8"));

  // ---------- 履歴・制作一覧（左サイドバー） ----------
  const HISTORY_KEY = "lp-history-v1";
  let historyList = [];
  try { historyList = Core.normalizeHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")); }
  catch { historyList = []; }
  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList)); }
    catch { notify("履歴の端末保存に失敗しました"); }
  }
  function checkpointHistory() {
    if (!Object.values(project.fields).some((v) => v.trim()) && !project.extraSections.length) { renderHistory(); return; }
    historyList = Core.pushHistory(historyList, project);
    saveHistory(); renderHistory();
  }
  function renderHistory() {
    const box = $("history-list"); box.replaceChildren();
    const sampleItem = element("button", "history-item sample-entry");
    sampleItem.type = "button";
    const sampleText = element("span", "history-text");
    sampleText.append(element("span", "history-name", "サンプル：商品写真ミニ講座"), element("span", "history-meta", "練習用"));
    sampleItem.append(element("span", "history-dot"), sampleText);
    sampleItem.addEventListener("click", () => { checkpointHistory(); sample(); });
    box.append(sampleItem);
    const items = [];
    for (const entry of historyList) {
      items.push({ date: entry.updatedAt, name: entry.name, kind: "制作中", open: () => openHistory(entry) });
    }
    for (const entry of library) {
      items.push({ date: entry.createdAt, name: entry.title, kind: "完成LP", open: () => entry.url ? window.open(entry.url, "_blank", "noopener,noreferrer") : go("library") });
    }
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    for (const item of items) {
      const row = element("button", `history-item kind-${item.kind === "完成LP" ? "done" : "wip"}`);
      row.type = "button";
      const date = item.date ? new Date(item.date).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
      const text = element("span", "history-text");
      text.append(element("span", "history-name", item.name), element("span", "history-meta", `${item.kind}${date ? "　" + date : ""}`));
      row.append(element("span", "history-dot"), text);
      row.addEventListener("click", item.open);
      box.append(row);
    }
  }
  function openHistory(entry) {
    checkpointHistory();
    project = Core.normalizeProject(entry.project);
    persist(); renderAll(); go("info");
    notify("履歴から開きました");
  }
  $("save-history").addEventListener("click", () => { checkpointHistory(); notify("履歴に保存しました"); });
  async function refreshHistory() {
    try {
      const response = await fetch(`history.json?ts=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = Core.normalizeHistory(await response.json());
      historyList = Core.mergeHistory(historyList, remote);
      saveHistory(); renderHistory();
    } catch { renderHistory(); }
  }
  renderHistory(); refreshHistory();

  $("refresh-library").addEventListener("click", refreshLibrary);
  $("add-library-entry").addEventListener("click", () => {
    const entry = Library.normalizeEntry({ title: $("library-title-input").value, url: $("library-url-input").value, thumbnail: $("library-thumb-input").value, projectSettings: Core.snapshotForLibrary(project), createdAt: new Date().toISOString() }, location.href);
    if (!entry) return notify("https:// の完成LPリンクを入力してください");
    library = Library.mergeLists(library, [entry], location.href);
    saveLibrary(); renderLibrary(); notify("完成LPに追加しました");
    $("library-title-input").value = ""; $("library-url-input").value = ""; $("library-thumb-input").value = "";
  });
  window.addEventListener("focus", () => {
    refreshHistory();
    if (currentStep === "library") refreshLibrary();
  });

  renderAll();
  receiveConsultLink();
  refreshLibrary();
})();
