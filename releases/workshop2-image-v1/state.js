(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageState = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const LAYOUTS = ["エディトリアル", "フォト", "タイポグラフィ"];
  const NOTES = ["余白と情報の整理", "写真を主役にする", "文字と色で伝える"];
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
  function normalize(input) {
    const flyer = Object.fromEntries(Object.keys(DEFAULT.flyer).map(key => [key, typeof input?.flyer?.[key] === "boolean" ? input.flyer[key] : true]));
    const snsSupport = ["none", "audience", "benefit1", "date"].includes(input?.snsSupport) ? input.snsSupport : "none";
    const designs = DEFAULT.designs.map((fallback, index) => {
      const item = input?.designs?.[index];
      return { layout: Number.isInteger(item?.layout) && item.layout >= 0 && item.layout < LAYOUTS.length ? item.layout : fallback.layout,
        palette: Object.hasOwn(PALETTES, item?.palette) ? item.palette : fallback.palette };
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
  return { LAYOUTS, NOTES, PALETTES, normalize, displayData, snsSupport };
});
