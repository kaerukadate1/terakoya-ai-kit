(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageWork = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";
  const DESIGN_SKILL_BASE = "https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/main/releases/workshop2-image-v1/design/";
  const DESIGN_SKILL_URLS = ["SKILL.md", "FLYER_SKILL.md", "SNS_SKILL.md"].map(file => DESIGN_SKILL_BASE + file);
  const STYLE_LABELS = ["洗練", "ナチュラル", "インパクト", "親しみ", "信頼感", "華やか", "シンプル", "上品", "クール"];
  const FORMATS = [
    { id: "flyer", medium: "flyer", label: "チラシ A4", width: 2480, height: 3508 },
    { id: "portrait", medium: "sns", label: "SNS 4:5", width: 1080, height: 1350 },
    { id: "square", medium: "sns", label: "SNS 正方形", width: 1080, height: 1080 },
    { id: "landscape", medium: "sns", label: "SNS 横長", width: 1200, height: 630 }
  ];
  function formatById(id) { return FORMATS.find(item => item.id === id) || null; }
  function formatOf(item) {
    if (item?.medium === "flyer" || item?.format === "flyer") return FORMATS[0];
    return formatById(item?.format) || FORMATS[1];
  }

  function toolUrl(url) {
    try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) ? parsed.origin + "/" : ""; }
    catch { return ""; }
  }
  function sameSiteImage(value, base) {
    try {
      const url = new URL(value, base);
      const site = new URL(base);
      return url.origin === site.origin && /^https?:$/.test(url.protocol) && /\.(png|jpe?g|webp)$/i.test(url.pathname) ? url.href : "";
    } catch { return ""; }
  }
  function parseManifest(input, base) {
    const items = Array.isArray(input?.entries) ? input.entries : [];
    return items.map(item => {
      const url = sameSiteImage(item?.url, base);
      if (!url) return null;
      return {
        id: String(item.id || url).slice(0, 200), url,
        thumbnail: sameSiteImage(item.thumbnail, base) || url,
        name: String(item.name || "完成画像").slice(0, 100),
        medium: item.medium === "flyer" || item.format === "flyer" ? "flyer" : "sns",
        format: formatOf(item).id,
        slot: Number.isInteger(item.slot) && item.slot >= 0 && item.slot < 3 ? item.slot : 0,
        createdAt: typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : "",
        fields: item.fields && typeof item.fields === "object" ? item.fields : {},
        settings: item.settings && typeof item.settings === "object" ? item.settings : null
      };
    }).filter(Boolean);
  }
  function activeFormats(settings) {
    const outputs = settings.outputs || {};
    const selected = FORMATS.filter(item => outputs[item.id] !== false);
    return selected.length ? selected : [FORMATS[0]];
  }
  function activeDesigns(settings) {
    const list = Array.isArray(settings.designs) && settings.designs.length ? settings.designs : [{}, {}, {}];
    const selected = list.map((item, index) => ({ slot: index, layout: item.layout, include: item.include !== false })).filter(item => item.include);
    return selected.length ? selected : [{ slot: 0, layout: list[0]?.layout, include: true }];
  }
  function plan(settings) {
    const formats = activeFormats(settings || {});
    const designs = activeDesigns(settings || {});
    return { formats, designs, count: formats.length * designs.length };
  }
  function snsBrief(text, support, role) {
    return {
      role, name: text("name"), hook: text("headline"), optionalSupport: support, actionDirection: text("cta"),
      note: "主役のビジュアルと短い見出しにする。詳細説明・箇条書き・日時や料金・URLをチラシから流用しない。必要な詳細は投稿本文やリンク先へ回す。他のSNSサイズの切り抜きや縮小にしない。"
    };
  }
  function mediumBriefs(facts, settings) {
    const flyer = settings.flyer || {};
    const text = key => String(facts[key] || "").trim();
    const support = ["audience", "benefit1", "date"].includes(settings.snsSupport) ? text(settings.snsSupport) : "";
    const briefs = {};
    for (const format of activeFormats(settings)) {
      if (format.id === "flyer") {
        briefs.flyer = {
          role: "手に取った人が内容と次の行動を判断できる、家庭用プリンタ向けのA4チラシ",
          name: text("name"), headline: text("headline"),
          description: flyer.description === false ? "" : text("description"),
          benefits: flyer.benefits === false ? [] : [text("benefit1"), text("benefit2"), text("benefit3")].filter(Boolean),
          details: flyer.details === false ? {} : Object.fromEntries(["date", "place", "price"].filter(key => text(key)).map(key => [key, text(key)])),
          url: flyer.url === false ? "" : text("url"), action: text("cta"),
          print: "家庭用プリンタでA4に印刷するPNG。端まで印刷されないので、文字とURLは紙の端から離す。"
        };
      } else if (format.id === "portrait") briefs.portrait = snsBrief(text, support, "スマートフォンの縦長フィードで、流し見の途中に止める4:5画像");
      else if (format.id === "square") briefs.square = snsBrief(text, support, "正方形フィードで、中央の一つの見せ場と短い見出しが同時に見える画像");
      else briefs.landscape = snsBrief(text, support, "横長のタイムラインとリンク共有で、左から右へ一目で主題が分かる画像");
    }
    return briefs;
  }
  function prompt(fields, settings, url, revision = null) {
    const site = toolUrl(url);
    const facts = Object.fromEntries(Object.entries(fields).filter(([, value]) => typeof value === "string").map(([key, value]) => [key, value.slice(0, 300)]));
    const selected = plan(settings);
    const designDirections = selected.designs.map(item => ({ slot: item.slot + 1, direction: STYLE_LABELS[item.layout] || "未選択" }));
    const sizeList = selected.formats.map(item => `${item.label}(${item.width}x${item.height})`).join("、");
    const target = revision ? formatOf(revision) : null;
    const payload = { facts, mediaBriefs: mediumBriefs(facts, settings), settings, designDirections, outputs: selected.formats.map(item => ({ id: item.id, label: item.label, width: item.width, height: item.height })), targetSite: site || "未確認", manifest: "completed-images.json", revision: revision ? { id: revision.id, url: revision.url, medium: revision.medium, format: target.id, slot: revision.slot } : null };
    const scope = revision
      ? `既存画像 ${revision.url} の修正です。対象はデザイン${revision.slot + 1}の${target.label}(${target.width}x${target.height})1枚だけです。まず私に修正したい点を聞き、その内容に沿って編集してください。他の画像は作り直さないでください。`
      : `選ばれた雰囲気${selected.designs.length}案について、${sizeList}をそれぞれ独立に設計し、計${selected.count}枚を生成してください。選ばれていない種類と案は作らないでください。色やブランドの一貫性は保ちつつ、同じ構図のリサイズ・トリミング・文字削減だけで媒体違いにしないでください。`;
    return `寺子屋AIのチラシ・SNS告知画像を制作してください。最初に次のGitHubの共通・チラシ・SNSの3つの制作スキルを実際に取得して読み、各媒体の制作と検品へ適用してください。1つでも取得できなければ制作を止め、取得できないURLを報告してください。\n${DESIGN_SKILL_URLS.join("\n")}\n\n添付JSONが唯一の事実情報です。${scope}

制作順: (1) 同じ事実から媒体別に主役・掲載情報・視線の流れを別々に決める。(2) 選んだ雰囲気それぞれに、チラシとSNSの各サイズで異なる構図を設計する。(3) まずビジュアル素材を生成し、次に日本語文字を正確に組む。(4) チラシはA4の実寸、SNSはスマートフォン縮小表示で検品する。旧版の固定的な構成下見・Canvas画像を参照したり、そこからトレースしたりしない。

チラシ: 手元で読み進められる情報設計にし、名称→価値→必要な説明→確定情報→行動先を明確にする。家庭用プリンタでA4に印刷するPNGにし、文字とURLは紙の端から離す。箇条書きや詳細は読みやすく整理するが、全部を同じ大きさで並べない。SNS投稿画像: スクロール中に被写体または強い視覚アイデアと短い見出しで止める。4:5、正方形、横長は互いの切り抜きや縮小にしない。本文は投稿文に任せ、チラシの縮小版・同一写真の同一トリミング・同一見出し配置にしない。各サイズを見比べ、文字量以外にも写真の扱い・構図・情報の役割が異なることを確認する。

主役の見出しは日本語の意味単位で改行し、極端に短い最終行を作らないでください。写真の役割と文字の読む順を設計し、CTAは媒体に合う自然な表現を選んでください。静止画像に汎用的な全幅ボタンを惰性で置かないでください。未入力の日時・価格・実績・人物・効果を捏造しないでください。提供写真はこの画面から自動送信できません。写真を使うならユーザーにこの会話へ添付してもらい、無ければデザインに合う汎用的なビジュアルを生成してください。背景・被写体は画像生成を活用し、日本語の見出し、URL、料金、日時、CTAは正確なテキスト描画で重ねて最終PNGへ合成してください。画像生成に日本語文字を描かせっぱなしにしないでください。完成サイズと縮小表示で全画像を実際に見て、文字切れ、改行、余白、CTA、写真との一体感、原文一致を検査し、不合格なら保存前に組み直してください。検査できなければ合格と報告しないでください。

画面のURLが有効で、同じ画面を更新できる場合だけ、完成PNGを completed-images/<一意のID>/ に新規保存し、画面と同じ場所の completed-images.json の既存entriesを保ったまま${revision ? "1件" : `${selected.count}件`}を追記してください。entriesの各項目は id/name/medium(flyer|sns)/format(flyer|portrait|square|landscape)/slot(0-2)/url/thumbnail/createdAt/fields/settings とし、urlとthumbnailは同じ画面内の画像URLです。formatは出力サイズのidと一致させてください。既存の画像と入力は上書きしないでください。修正依頼の場合は元画像を残し、新IDで改訂版を追加してください。保存・更新後に同じ画面の「完成画像」で追加分が見えるか確認してください。画面を更新できない場合は「自動反映できなかった」と明示し、完成画像ファイルと理由を返してください。反映済みと装わないでください。

制作データ:\n${JSON.stringify(payload, null, 2)}`;
  }
  function labelFor(entry) { return formatOf(entry).label; }
  return { FORMATS, toolUrl, sameSiteImage, parseManifest, prompt, plan, labelFor };
});
