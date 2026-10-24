(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LpLibrary = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function safeUrl(value, base) {
    try {
      const url = new URL(value, base);
      if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return "";
      return url.href;
    } catch { return ""; }
  }

  function normalizeEntry(value, base) {
    if (!value || typeof value !== "object") return null;
    const url = safeUrl(value.url, base);
    if (!url) return null;
    const title = String(value.title || "無題のLP").trim().slice(0, 120);
    const design = String(value.design || "").trim().slice(0, 60);
    const thumbnail = value.thumbnail ? safeUrl(value.thumbnail, base) : "";
    const createdAt = Number.isFinite(Date.parse(value.createdAt)) ? new Date(value.createdAt).toISOString() : new Date().toISOString();
    const slot = Number.isInteger(value.slot) && value.slot >= 1 && value.slot <= 3 ? value.slot : null;
    let projectSettings = null;
    try {
      const serialized = JSON.stringify(value.projectSettings);
      if (serialized && serialized.length < 100_000 && value.projectSettings?.fields && Array.isArray(value.projectSettings?.designs)) {
        projectSettings = JSON.parse(serialized);
      }
    } catch { /* Invalid settings do not hide an otherwise valid LP. */ }
    return { id: url, title, design, slot, url, thumbnail, createdAt, projectSettings };
  }

  function normalizeList(value, base) {
    const entries = Array.isArray(value) ? value : value?.entries;
    if (!Array.isArray(entries)) return [];
    const byUrl = new Map();
    for (const raw of entries.slice(0, 500)) {
      const entry = normalizeEntry(raw, base);
      if (entry) byUrl.set(entry.url, entry);
    }
    return [...byUrl.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function mergeLists(local, remote, base) {
    const byUrl = new Map(normalizeList(local, base).map((entry) => [entry.url, entry]));
    for (const entry of normalizeList(remote, base)) {
      const previous = byUrl.get(entry.url);
      byUrl.set(entry.url, { ...entry, projectSettings: entry.projectSettings || previous?.projectSettings || null, slot: entry.slot || previous?.slot || null });
    }
    return [...byUrl.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return { safeUrl, normalizeEntry, normalizeList, mergeLists };
});
