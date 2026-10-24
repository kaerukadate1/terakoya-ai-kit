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

  const SAMPLE_FIELDS = {
    name: "はじめてのAI画像講座", audience: "自分のお店を紹介したい方", headline: "あなたのサービスを、ひと目で伝える。",
    description: "身近な仕事の課題を題材に、伝わる画像づくりを一緒に体験します。",
    benefit1: "自分のサービスに合う見せ方を考える", benefit2: "チラシとSNSの違いを学ぶ", benefit3: "持ち帰れる画像を作る",
    date: "", place: "", price: "", cta: "内容を見る", url: ""
  };
  function prepareFields(rawFields) {
    const fields = { ...rawFields };
    if (!["name", "audience", "headline"].some(key => fields[key] === SAMPLE_FIELDS[key])) return fields;
    // Remove unchanged example values, including samples restored from older versions.
    for (const key of KEYS) {
      if (SAMPLE_FIELDS[key] && fields[key] === SAMPLE_FIELDS[key]) fields[key] = "";
    }
    return fields;
  }

  function validHttpUrl(value) {
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }

  function buildPrompt(rawFields, toolUrl = "") {
    rawFields = prepareFields(rawFields);
    const fields = Object.fromEntries(KEYS.filter(key => String(rawFields?.[key] || "").trim())
      .map(key => [key, String(rawFields[key]).slice(0, LIMITS[key])]));
    const returnUrl = /^https:\/\/[^/]+\.chatgpt\.site\/?$/.test(toolUrl) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(toolUrl)
      ? toolUrl.replace(/\/$/, "") : "";
    return [
      "寺子屋AI チラシ・SNS告知画像制作ツールの入力内容を整理する相談です。あなたが参照できる私の過去チャット、同じプロジェクトの資料、利用可能なメモリから、本人の事業や検討中のアイデア、サービス・イベントに関する確かな情報だけを拾ってください。サンプル・記入例を本人の事業として使わず、基本は空欄から入力案を作ってください。根拠が見つからない項目は空欄にし、事業の根拠自体がなければfieldsは空のオブジェクトにしてください。参照できない情報を読めたように装わないでください。",
      "事業やイベントが複数あって対象を特定できない場合は、混ぜずに私へ確認してください。現在の入力があればその題材を優先してください。顧客・第三者の個人情報、認証情報、内部の秘密は含めないでください。日時、料金、実績、申込先、効果など、確定していない情報は作らず空欄にしてください。見出しや呼びかけは確かな内容からの提案であることが分かるようにしてください。",
      `次のキーだけを使い、JSONコードブロックで返してください。分からないキーは省略してください: ${KEYS.join(", ")}。形式: {"fields":{"name":"...","audience":"..."}}。name はサービス・イベント名、headline は画像の主見出し、description は概要、benefit1〜3 は伝えたいこと、cta は次の行動です。各値は短く、文字列にしてください。JSONの後に、参照できた根拠と未確認点を短く書いてください。`,
      returnUrl ? `可能ならJSONをUTF-8のbase64urlにし、${returnUrl}/#image-intake=<エンコード文字列> の入力案リンクも返してください。できなければJSONだけで構いません。リンク先では未入力欄だけが埋まります。` : "入力案リンクを作れない場合はJSONだけで返してください。",
      `現在入力済みの項目: ${JSON.stringify(fields)}`
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
    const fields = prepareFields(rawFields);
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

  return { KEYS, LIMITS, SAMPLE_FIELDS, prepareFields, buildPrompt, parseAnswer, applyFields };
});
