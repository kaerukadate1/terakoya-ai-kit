(function (root, factory) {
  const api = factory(root.LpCore || (typeof require === "function" ? require("./core.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LpSheet = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function (Core) {
  "use strict";

  function answerBlock(source, number) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const start = lines.findIndex((line) => new RegExp(`^\\s*(?:【)?${number}\\s+`).test(line));
    if (start < 0) return "";
    let answerAt = start + 1;
    while (answerAt < lines.length && !/^\s*回答[：:]\s*$/.test(lines[answerAt])) answerAt++;
    if (answerAt >= lines.length) return "";
    let end = answerAt + 1;
    while (end < lines.length && !/^\s*(?:【)?[1-3]\s+/.test(lines[end]) && !/^\s*---\s*記入はここまで/.test(lines[end])) end++;
    return lines.slice(answerAt + 1, end).join("\n").trim();
  }

  function labeledValues(block) {
    const values = {};
    for (const line of block.split("\n")) {
      const match = line.match(/^\s*([^：:]{2,30})[：:]\s*(.+?)\s*$/);
      if (match) values[match[1].trim()] = match[2].trim();
    }
    return values;
  }

  function clean(value) { return String(value || "").replace(/^【テスト用・架空情報】\s*/, "").trim(); }
  function realValue(value) { return /^(未定|未設定|なし|準備中)[。.]?$/.test(String(value || "").trim()) ? "" : String(value || "").trim(); }

  function parseLegacySheet(source) {
    if (typeof source !== "string" || source.length > 100_000) throw new Error("10万文字以下のテキストを選んでください");
    const first = clean(answerBlock(source, 1));
    if (!first) throw new Error("1番の回答が見つかりません");
    const second = answerBlock(source, 2);
    const third = answerBlock(source, 3);
    const values = labeledValues(second);
    const project = Core.blankProject();
    const quoted = first.match(/[「『]([^」』]{2,100})[」』]/);
    project.fields.title = quoted ? quoted[1].trim() : first.split(/[。\n]/)[0].slice(0, 100);
    project.fields.purpose = "講座・セミナーの案内";
    project.fields.audience = realValue(values["参加の目安"] || "");
    const introRemoved = quoted ? first.replace(quoted[0], "").replace(/^という[^。\n]*[。\n]?/, "") : first;
    project.fields.offer = introRemoved.trim() || first;
    project.fields.details = realValue(values["内容"] || "");
    project.fields.outcome = realValue(values["持ち帰れるもの"] || "");
    project.fields.date = realValue(values["開催日時"] || "");
    project.fields.place = realValue(values["開催方法"] || "");
    project.fields.price = realValue(values["参加費"] || values["価格"] || "");
    project.fields.application = "受付準備中";
    project.fields.applicationUrl = Core.validHttpUrl(values["申込URL"] || "");
    project.fields.host = realValue(values["主催者名"] || "");
    project.fields.notes = third;
    project.fields.faq = /専用カメラは不要/.test(source) ? "専用カメラは必要ですか？\n不要です。" : "";
    for (const [label, heading] of [["定員", "定員"], ["持ち物", "持ち物"], ["申込締切", "申込締切"]]) {
      if (realValue(values[label])) project.extraSections.push({ title: heading, content: values[label] });
    }
    project.sections.faq = project.fields.faq ? "include" : "exclude";
    project.sections.proof = "exclude";
    project.sections.testimonials = "exclude";
    project.sample = /すべて架空|テスト用・架空情報|架空の内容/.test(source);
    if (!project.fields.applicationUrl) project.pending.push("申込URLが未定です");
    if (!project.fields.host) project.pending.push("主催者・講師の表記が未設定です");
    if (/会議サービスと参加リンクは未定/.test(second)) project.pending.push("利用する会議サービスと参加リンクが未定です");
    if (/録画配布・キャンセル条件[：:]\s*未定/.test(second)) project.pending.push("録画配布とキャンセル条件が未定です");
    if (project.sample) project.pending.push("日時・料金・定員を含め、シートの企画はすべて架空です");
    return {
      project: Core.normalizeProject(project),
      summary: {
        title: project.fields.title,
        audience: project.fields.audience || "要確認",
        date: project.fields.date || "未定",
        price: project.fields.price || "未定",
        sample: project.sample,
        pending: project.pending
      }
    };
  }

  return { parseLegacySheet, answerBlock, labeledValues };
});
