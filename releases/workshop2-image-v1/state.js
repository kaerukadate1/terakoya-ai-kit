(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageState = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const LAYOUTS = ["エディトリアル", "フォト", "タイポグラフィ", "スプリット", "グリッド", "ポスター", "ミニマル", "マガジン", "フレーム"];
  const NOTES = ["余白と情報の整理", "写真を主役にする", "文字と色で伝える", "左右の対比で伝える", "情報を升目で整理", "中央の主題を強く", "一文を際立たせる", "誌面のように読み進める", "囲み構図で印象を残す"];
  const PALETTES = {
    coral: { label: "コーラル", bg: "#f7f7f4", ink: "#20363c", accent: "#bf523e", soft: "#e1edea", softInk: "#20363c", onAccent: "#ffffff" },
    gold: { label: "ゴールド", bg: "#1b3237", ink: "#ffffff", accent: "#e8b46a", soft: "#e8eeeb", softInk: "#20363c", onAccent: "#1b3237" },
    green: { label: "グリーン", bg: "#d8e8ce", ink: "#162b33", accent: "#d4543c", soft: "#ffffff", softInk: "#162b33", onAccent: "#ffffff" },
    blue: { label: "ブルー", bg: "#e9f2f6", ink: "#142a3a", accent: "#216a86", soft: "#ffffff", softInk: "#142a3a", onAccent: "#ffffff" }
  };
  const DEFAULT = {
    flyer: { description: true, benefits: true, details: true, url: true },
    snsSupport: "none",
    designs: [{ layout: 0, palette: "coral" }, { layout: 1, palette: "gold" }, { layout: 2, palette: "green" }]
  };
  function color(value, fallback) { return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback; }
  function contrast(hex) {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.36 ? "#172d34" : "#ffffff";
  }
  function palette(design) {
    const preset = PALETTES[design.palette] || PALETTES.coral;
    const bg = color(design.bg, preset.bg), accent = color(design.accent, preset.accent);
    const ink = contrast(bg), onAccent = contrast(accent);
    return { ...preset, bg, accent, ink, onAccent, soft: bg === "#ffffff" ? "#e8f0ef" : preset.soft, softInk: contrast(bg === "#ffffff" ? "#e8f0ef" : preset.soft) };
  }
  function normalize(input) {
    const flyer = Object.fromEntries(Object.keys(DEFAULT.flyer).map(key => [key, typeof input?.flyer?.[key] === "boolean" ? input.flyer[key] : true]));
    const snsSupport = ["none", "audience", "benefit1", "date"].includes(input?.snsSupport) ? input.snsSupport : "none";
    const designs = DEFAULT.designs.map((fallback, index) => {
      const item = input?.designs?.[index];
      const selected = Object.hasOwn(PALETTES, item?.palette) ? item.palette : fallback.palette;
      return { layout: Number.isInteger(item?.layout) && item.layout >= 0 && item.layout < LAYOUTS.length ? item.layout : fallback.layout,
        palette: selected, bg: color(item?.bg, PALETTES[selected].bg), accent: color(item?.accent, PALETTES[selected].accent) };
    });
    return { flyer, snsSupport, designs };
  }
  function displayData(raw, medium, rawSettings) {
    const settings = normalize(rawSettings);
    const data = { ...raw };
    if (medium === "flyer") {
      if (!settings.flyer.description) data.description = "";
      if (!settings.flyer.benefits) data.benefit1 = data.benefit2 = data.benefit3 = "";
      if (!settings.flyer.details) data.date = data.place = data.price = "";
      if (!settings.flyer.url) data.url = "";
    }
    return data;
  }
  function snsSupport(data, rawSettings) {
    const key = normalize(rawSettings).snsSupport;
    return key === "none" ? "" : String(data[key] || "").trim();
  }
  return { LAYOUTS, NOTES, PALETTES, normalize, displayData, snsSupport, palette, color, contrast };
});
