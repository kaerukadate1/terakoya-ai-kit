(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageWork = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";
  const DESIGN_SKILL_BASE = "https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/feature/workshop2-image-v1/releases/workshop2-image-v1/design/";
  const DESIGN_SKILL_URLS = ["SKILL.md", "FLYER_SKILL.md", "SNS_SKILL.md"].map(file => DESIGN_SKILL_BASE + file);
  const STYLE_LABELS = ["洗練", "ナチュラル", "インパクト", "親しみ", "信頼感", "華やか", "シンプル", "上品", "クール"];

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
        medium: item.medium === "flyer" ? "flyer" : "sns",
        slot: Number.isInteger(item.slot) && item.slot >= 0 && item.slot < 3 ? item.slot : 0,
        createdAt: typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : "",
        fields: item.fields && typeof item.fields === "object" ? item.fields : {},
        settings: item.settings && typeof item.settings === "object" ? item.settings : null
      };
    }).filter(Boolean);
  }
  function mediumBriefs(facts, settings) {
    const flyer = settings.flyer || {};
    const text = key => String(facts[key] || "").trim();
    const support = ["audience", "benefit1", "date"].includes(settings.snsSupport) ? text(settings.snsSupport) : "";
    return {
      flyer: {
        role: "手に取った人が、この1枚で内容と次の行動を判断できる印刷物",
        name: text("name"), headline: text("headline"),
        description: flyer.description === false ? "" : text("description"),
        benefits: flyer.benefits === false ? [] : [text("benefit1"), text("benefit2"), text("benefit3")].filter(Boolean),
        details: flyer.details === false ? {} : Object.fromEntries(["date", "place", "price"].filter(key => text(key)).map(key => [key, text(key)])),
        url: flyer.url === false ? "" : text("url"), action: text("cta")
      },
      sns: {
        role: "スマートフォンの流し見で何の告知かを一瞬で伝える投稿画像",
        name: text("name"), hook: text("headline"), optionalSupport: support,
        actionDirection: text("cta"),
        note: "原則は主役のビジュアルと短い見出し。詳細説明・箇条書き・日時や料金・URLをチラシから流用しない。必要な詳細は投稿本文やリンク先へ回す。"
      }
    };
  }
  function prompt(fields, settings, url, revision = null) {
    const site = toolUrl(url);
    const snsAspect = settings?.snsAspect === "16:9" ? "16:9 (1920x1080)" : "4:5 (1080x1350)";
    const convertAspect = revision?.convertAspect === "16:9" ? "16:9 (1920x1080)" : revision?.convertAspect === "4:5" ? "4:5 (1080x1350)" : "";
    const lpUrl = String(fields.lpUrl || "").trim();
    const facts = Object.fromEntries(Object.entries(fields).filter(([, value]) => typeof value === "string").map(([key, value]) => [key, value.slice(0, 300)]));
    const designDirections = (settings.designs || []).map((item, index) => ({ slot: index + 1, direction: STYLE_LABELS[item.layout] || "要確認" }));
    const payload = { facts, mediaBriefs: mediumBriefs(facts, settings), settings, designDirections, targetSite: site || "要確認", manifest: "completed-images.json", revision: revision ? { id: revision.id, url: revision.url, medium: revision.medium, slot: revision.slot } : null };
    const workflowRules = `\n\nNON-NEGOTIABLE CURRENT WORKFLOW (this overrides any older fixed-layout or separate-text instruction above):\n- Make each deliverable as one cohesive, high-quality image design: typography, decorative elements, whitespace, and visual direction belong together. Do not force a generic font overlay or a Canvas template. Verify factual text after generation and correct only errors.\n- Flyer: A4 2480x3508, self-contained: what, who, benefits, confirmed practical details, and the next action in one printed sheet.\n- SNS: ${snsAspect}; thumbnail-first. Use only title, subtitle if needed, and one optional support line. Do not reuse flyer detail blocks or merely resize the flyer.\n- If a source LP URL is supplied (${lpUrl || "none"}), open it and use only readable content and visual cues. If access fails or details are missing, ask for the fact; never invent it.\n- ${convertAspect ? `Create one NEW ${convertAspect} version from the existing SNS image. Keep the original. Recompose it so subject, text, and mood survive; never crop, stretch, or merely pad it.` : "Create three flyer/SNS pairs; SNS uses the selected aspect above."}\n- Before saving, inspect full size and a phone-size view. Reject clipped text, inaccurate facts, unreadable contrast, generic boxed CTA buttons, or weak image/text integration.\n`;
    let scope = revision
      ? `既存画像 ${revision.url} の修正です。対象はデザイン${revision.slot + 1}の${revision.medium === "flyer" ? "A4チラシ(2480x3508)" : "SNS投稿4:5(1080x1350)"}1枚だけです。まず私に修正したい点を聞き、その内容に沿って編集してください。他の5枚は作り直さないでください。`
      : "3つの雰囲気から、それぞれA4チラシ(2480x3508)とSNS投稿画像4:5(1080x1350)を独立に設計し、計6枚を生成してください。色やブランドの一貫性は保ちつつ、同じ構図のリサイズ・トリミング・文字削減だけで2媒体にしないでください。";
    return `寺子屋AIのチラシ・SNS告知画像を制作してください。最初に次のGitHubの共通・チラシ・SNSの3つの制作スキルを実際に取得して読み、各媒体の制作と検品へ適用してください。1つでも取得できなければ制作を止め、取得できないURLを報告してください。\n${DESIGN_SKILL_URLS.join("\n")}\n\n添付JSONが唯一の事実情報です。${scope}

制作順: (1) 同じ事実から媒体別に主役・掲載情報・視線の流れを別々に決める。(2) 3つの雰囲気それぞれに、チラシとSNSで異なる構図を設計する。(3) まずビジュアル素材を生成し、次に日本語文字を正確に組む。(4) A4とスマートフォン縮小表示で検品する。旧版の固定的な構成下見・Canvas画像を参照したり、そこからトレースしたりしない。

チラシ: 手元で読み進められる情報設計にし、名称→価値→必要な説明・確定情報→行動先を明確にする。箇条書きや詳細は読みやすく整理するが、全部を同じ大きさで並べない。SNS投稿画像: スクロール中に被写体または強い視覚アイデアと短い見出しで止める。本文は投稿文に任せ、チラシの縮小版・同一写真の同一トリミング・同一見出し配置にしない。各ペアを見比べ、文字量以外にも写真の扱い・構図・情報の役割が異なることを確認する。

主役の見出しは日本語の意味単位で改行し、極端に短い最終行を作らないでください。写真の役割と文字の読む順を設計し、CTAは媒体に合う自然な表現を選んでください。静止画像に汎用的な全幅ボタンを惰性で置かないでください。未入力の日時・価格・実績・人物・効果を捏造しないでください。提供写真はこのサイトから自動送信できません。写真を使うならユーザーにこの会話へ添付してもらい、無ければデザインに合う汎用的なビジュアルを生成してください。背景・被写体は画像生成を活用し、日本語の見出し、URL、料金、日時、CTAは正確なテキスト描画で重ねて最終PNGへ合成してください。画像生成に日本語文字を描かせっぱなしにしないでください。完成サイズと縮小表示で全画像を実際に見て、文字切れ、改行、余白、CTA、写真との一体感、原文一致を検査し、不合格なら保存前に組み直してください。検査できなければ合格と報告しないでください。

本人限定WorkサイトのURLが有効で、同サイトを編集できる場合だけ、完成PNGを completed-images/<一意のID>/ に新規保存し、サイト直下の completed-images.json の既存entriesを保ったまま${revision ? "1件" : "6件"}を追記してください。entriesの各項目は id/name/medium(flyer|sns)/slot(0-2)/url/thumbnail/createdAt/fields/settings とし、urlとthumbnailは同じサイト内の画像URLです。既存画像・入力・権限は上書きせず、一般公開しないでください。修正依頼の場合は元画像を残し、新IDで改訂版を追加してください。保存・更新後に同じサイトの「完成画像」画面で追加分が見えるか確認してください。同サイトを編集できない場合、または本番反映ができない場合は「自動反映できなかった」と明示し、完成画像ファイルと理由を返してください。反映済みと装わないでください。

制作データ:\n${JSON.stringify(payload, null, 2)}`;
  }
  function promptWithRules(fields, settings, url, revision) {
    const text = prompt(fields, settings, url, revision);
    const aspect = settings?.snsAspect === "16:9" ? "16:9 (1920x1080)" : "4:5 (1080x1350)";
    const target = revision?.convertAspect === "16:9" ? "16:9 (1920x1080)" : revision?.convertAspect === "4:5" ? "4:5 (1080x1350)" : "";
    const lpUrl = String(fields?.lpUrl || "").trim();
    return `${text}\n\nCURRENT WORKFLOW — THIS OVERRIDES ANY OLDER INSTRUCTION ABOVE THAT REQUIRES FIXED CANVAS LAYOUTS OR SEPARATE TEXT OVERLAYS.\nCreate each deliverable as one cohesive, high-quality image design: typography, decoration, whitespace, and visual direction belong together. Never force a generic font overlay or a Canvas template. Verify factual text after generation and correct errors.\n\nFlyer: A4 2480x3508, self-contained: what, who, benefits, confirmed practical details, and the next action in one printed sheet.\nSNS: ${aspect}; thumbnail-first. Use title, subtitle only if needed, and at most one support line. Never reuse flyer detail blocks or simply resize the flyer.\n${lpUrl ? `Source LP: ${lpUrl}. Open it and use only information and visual cues actually readable there. If access fails or a detail is missing, ask; never invent it.` : "No LP URL was supplied."}\n${target ? `Create ONE NEW ${target} version from the existing SNS image. Keep the original. Recompose so the subject, text, and mood survive. Never crop, stretch, or merely pad the original.` : "Create three flyer/SNS pairs using the SNS aspect above."}\nBefore saving, inspect full size and a phone-size view. Reject clipped text, inaccurate facts, unreadable contrast, generic boxed CTA buttons, or weak image/text integration.`;
  }
  function promptWithRulesBeforePayload(fields, settings, url, revision) {
    const combined = promptWithRules(fields, settings, url, revision);
    const ruleStart = combined.indexOf("\n\nCURRENT WORKFLOW");
    if (ruleStart < 0) return combined;
    const base = combined.slice(0, ruleStart);
    const rules = combined.slice(ruleStart);
    const payloadStart = base.lastIndexOf("\n\n");
    return payloadStart < 0 ? combined : `${base.slice(0, payloadStart)}${rules}${base.slice(payloadStart)}`;
  }
  return { toolUrl, sameSiteImage, parseManifest, prompt: promptWithRulesBeforePayload };
});
