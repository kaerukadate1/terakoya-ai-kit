(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageConsult = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const LIMITS = {
    name: 70, audience: 90, headline: 100, description: 90,
    benefit1: 45, benefit2: 45, benefit3: 45,
    date: 32, place: 32, price: 32, cta: 25, url: 80
  };
  const KEYS = Object.keys(LIMITS);

  function validHttpUrl(value) {
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }

  function buildPrompt(rawFields, toolUrl = "") {
    const fields = Object.fromEntries(KEYS.filter(key => String(rawFields?.[key] || "").trim())
      .map(key => [key, String(rawFields[key]).slice(0, LIMITS[key])]));
    const returnUrl = /^https:\/\/[^/]+\.chatgpt\.site\/?$/.test(toolUrl) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(toolUrl)
      ? toolUrl.replace(/\/$/, "") : "";
    const lpUrl = String(rawFields?.lpUrl || "").trim();
    const readableLp = validHttpUrl(lpUrl) ? lpUrl : "";
    const lpInstructions = readableLp
      ? [`LP URL: ${readableLp}`, "Open and read this LP before proposing fields. Use only readable text and explicit facts; do not infer missing details.", "If it cannot be read, set source.status to unreadable, do not fill fields from the unread LP, and ask for pasted text or manual entry."].join("\n")
      : "No valid LP URL was supplied. Do not infer LP facts; use only available facts and manual input.";
    return [
      lpInstructions,
      "寺子屋AI チラシ・SNS告知画像制作ツールの入力内容を整理する相談です。あなたが参照できる私の過去チャット、同じプロジェクトの資料、利用可能なメモリから、対象のサービス・イベントに関する確かな情報だけを拾ってください。参照できない情報を読めたように装わないでください。",
      "事業やイベントが複数あって対象を特定できない場合は、混ぜずに私へ確認してください。現在の入力があればその題材を優先してください。顧客・第三者の個人情報、認証情報、内部の秘密は含めないでください。日時、料金、実績、申込先、効果など、確定していない情報は作らず空欄にしてください。見出しや呼びかけは確かな内容からの提案であることが分かるようにしてください。",
      `次のキーだけを使い、JSONコードブロックで返してください。分からないキーは省略してください: ${KEYS.join(", ")}。形式: {"fields":{"name":"...","audience":"..."}}。name はサービス・イベント名、headline は画像の主見出し、description は概要、benefit1〜3 は伝えたいこと、cta は次の行動です。各値は短く、文字列にしてください。JSONの後に、参照できた根拠と未確認点を短く書いてください。`,
      returnUrl ? `可能ならJSONをUTF-8のbase64urlにし、${returnUrl}/#image-intake=<エンコード文字列> の入力案リンクも返してください。できなければJSONだけで構いません。リンク先では未入力欄だけが埋まります。` : "入力案リンクを作れない場合はJSONだけで返してください。",
      `現在入力済みの項目: ${JSON.stringify(fields)}`
      , `Return a JSON source object alongside fields: {"source":{"lpUrl":"...","status":"read|unreadable|not_provided","facts":["..."],"unknowns":["..."]}}. Keep all fields factual and leave unread or missing details blank.`,
    ].join("\n\n");
  }

  function parseAnswer(value) {
    if (value.length > 200_000) throw new Error("回答が長すぎます");
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(value);
    try { return JSON.parse((fenced ? fenced[1] : value).trim()); }
    catch { throw new Error("JSONを読み込めませんでした。コードブロックをそのまま貼り付けてください"); }
  }

  function applyFields(rawFields, answer, overwrite = false) {
    const incoming = answer?.fields;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("入力案の形式が違います");
    const fields = { ...rawFields };
    let applied = 0;
    for (const key of KEYS) {
      const value = incoming[key];
      if (typeof value !== "string" || !value.trim() || (!overwrite && String(fields[key] || "").trim())) continue;
      if (key === "url" && (value.trim().length > LIMITS.url || !validHttpUrl(value.trim()))) continue;
      fields[key] = value.trim().slice(0, LIMITS[key]);
      applied++;
    }
    return { fields, applied };
  }

  function sourceSummary(answer) {
    const source = answer?.source;
    if (!source || typeof source !== "object" || Array.isArray(source)) return "LP read status was not supplied. Review before applying.";
    const status = ["read", "unreadable", "not_provided"].includes(source.status) ? source.status : "unknown";
    const facts = Array.isArray(source.facts) ? source.facts.filter(value => typeof value === "string" && value.trim()).slice(0, 8) : [];
    const unknowns = Array.isArray(source.unknowns) ? source.unknowns.filter(value => typeof value === "string" && value.trim()).slice(0, 8) : [];
    const label = status === "read" ? "LP read" : status === "unreadable" ? "LP unreadable" : status === "not_provided" ? "LP not provided" : "LP status unknown";
    return [label, facts.length ? `Verified: ${facts.join(" / ")}` : "Verified: none", unknowns.length ? `Unknown: ${unknowns.join(" / ")}` : "Unknown: none"].join("\n");
  }

  return { KEYS, LIMITS, buildPrompt, parseAnswer, applyFields, sourceSummary };
});
