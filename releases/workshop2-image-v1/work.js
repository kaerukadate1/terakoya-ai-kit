(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImageWork = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";
  const DESIGN_SKILL_URL = "https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/main/releases/workshop2-image-v1/design/SKILL.md";

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
  function prompt(fields, settings, url, revision = null) {
    const site = toolUrl(url);
    const facts = Object.fromEntries(Object.entries(fields).filter(([, value]) => typeof value === "string").map(([key, value]) => [key, value.slice(0, 300)]));
    const payload = { facts, settings, targetSite: site || "要確認", manifest: "completed-images.json", revision: revision ? { id: revision.id, url: revision.url, medium: revision.medium, slot: revision.slot } : null };
    const scope = revision
      ? `既存画像 ${revision.url} の修正です。対象はデザイン${revision.slot + 1}の${revision.medium === "flyer" ? "A4チラシ(2480x3508)" : "SNS投稿4:5(1080x1350)"}1枚だけです。まず私に修正したい点を聞き、その内容に沿って編集してください。他の5枚は作り直さないでください。`
      : "3案それぞれのレイアウト・指定色を尊重しつつ、案ごとに異なる視覚表現で実際の画像を生成し、各案からA4チラシ(2480x3508)とSNS投稿4:5(1080x1350)の計6枚を作ってください。";
    return `寺子屋AIのチラシ・SNS告知画像を制作してください。まず次のGitHubのデザインスキルを実際に取得して読み、その「仕上がりの基準」「納品前の画像チェック」を制作と検品に適用してください。取得できなければ制作を止めてください。04の画像は構成下見であり、下見の文字サイズ・箱・色帯をそのまま完成画像に写さないでください。\n${DESIGN_SKILL_URL}\n\n添付JSONが唯一の事実情報です。${scope}SNSはチラシの縮小版ではなく文字を減らして視覚的に仕上げます。主役の見出しは日本語の意味単位で改行し、極端に短い最終行を作らないでください。写真の役割と文字の読む順を設計し、CTAは画像に合う控えめな表現を選んでください。汎用的な全幅ボタンを惰性で使わないでください。未入力の日時・価格・実績・人物・効果を捏造しないでください。提供写真はこのサイトから自動送信できません。写真を使うならユーザーにこの会話へ添付してもらい、無ければデザインに合う汎用的なビジュアルを生成してください。背景・被写体は画像生成を活用し、日本語の見出し、URL、料金、日時、CTAは正確なテキスト描画で重ねて最終PNGへ合成してください。画像生成に日本語文字を描かせっぱなしにしないでください。完成サイズと縮小表示で全画像を実際に見て、文字切れ、改行、余白、CTA、写真との一体感、原文一致を検査し、不合格なら保存前に組み直してください。検査できなければ合格と報告しないでください。

本人限定WorkサイトのURLが有効で、同サイトを編集できる場合だけ、完成PNGを completed-images/<一意のID>/ に新規保存し、サイト直下の completed-images.json の既存entriesを保ったまま${revision ? "1件" : "6件"}を追記してください。entriesの各項目は id/name/medium(flyer|sns)/slot(0-2)/url/thumbnail/createdAt/fields/settings とし、urlとthumbnailは同じサイト内の画像URLです。既存画像・入力・権限は上書きせず、一般公開しないでください。修正依頼の場合は元画像を残し、新IDで改訂版を追加してください。保存・更新後に同じサイトの「完成画像」画面で追加分が見えるか確認してください。同サイトを編集できない場合、または本番反映ができない場合は「自動反映できなかった」と明示し、完成画像ファイルと理由を返してください。反映済みと装わないでください。

制作データ:\n${JSON.stringify(payload, null, 2)}`;
  }
  return { toolUrl, sameSiteImage, parseManifest, prompt };
});
