# 寺子屋AI チラシ・SNS告知画像制作ツール / ビルドプロンプト

## 目的

受講生本人だけが開けるWorkサイトに、チラシとSNS告知画像の制作ツールを作る。3案の雰囲気を選び、媒体ごとに別の構図でChatGPTが画像を生成し、完成画像を同じサイトの媒体別一覧に表示する。

## 固定ファイル

この文書と同じリリースの `index.html`、`styles.css`、`app.js`、`consult.js`、`state.js`、`library.js`、`work.js`、`design/SKILL.md`、`design/FLYER_SKILL.md`、`design/SNS_SKILL.md` をすべて実際に取得する。異なるリリースのファイルを混ぜない。

基点URL: `https://raw.githubusercontent.com/kaerukadate1/terakoya-ai-kit/feature/workshop2-image-v1/releases/workshop2-image-v1/`

## 作るもの

1. 固定ファイルを使い、本人限定のWorkサイトを作る。既存サイトの更新依頼なら新規サイトを作らず、既存URL、入力情報、保存画像、アクセス範囲を維持する。
2. 5段階: 内容入力、媒体ごとの構成、3案のデザイン選択、ChatGPTによる画像生成、媒体別の完成画像一覧。固定レイアウトの画像下見は行わない。
3. 3案それぞれで9種類の分かりやすいデザイン方向（洗練・ナチュラル・インパクト・親しみ・信頼感・華やか・シンプル・上品・クール）から選べる。配色例は近道として残し、背景色とアクセント色を自由に指定できる。ヘッダーの「画面の見た目」からツール画面のシステム/ライト/ダーク、画面のメインカラーとサブカラーを別に指定できる。画像の色設定と画面の見た目を混同しない。
4. 04の依頼文を本人が確認してChatGPTで送信する。生成時に毎回、このリリースの `design/SKILL.md`、`design/FLYER_SKILL.md`、`design/SNS_SKILL.md` をGitHubから取得・読了して適用し、1つでも取得失敗なら制作を止める。ビルド時に読んだだけで画像生成へ引き継いだとみなさない。チラシとSNSは同じ画像のリサイズや減字ではなく、情報設計・構図・写真の扱いを別々に考える。添付した写真以外を元写真として扱わず、未入力の事実を捏造しない。
5. ChatGPTが画像を生成でき、同じ本人限定Workサイトを更新できる場合のみ、生成したPNGを `completed-images/<一意のID>/` に新規保存する。サイト直下の `completed-images.json` の既存 `entries` を残したまま追記する。各項目は `id/name/medium/slot/url/thumbnail/createdAt/fields/settings`。`url` と `thumbnail` は同じサイト内の画像URL。A4は2480 x 3508、SNSは1080 x 1350。写真・日本語・日時・URL・価格の表示を点検する。
6. 05の一覧は同じサイトの `completed-images.json` を再読込し、チラシ A4とSNS投稿画像 4:5を別見出し・別一覧に表示する。以前ブラウザ内に保存した画像も媒体別に表示する。完成画像を開き、入力設定を復元し、修正をChatGPTへ依頼できる。修正版は旧画像を残して新しいIDで追加する。「一覧から削除」はこの端末の表示から外すだけで、画像自体・公開サイト・manifestを削除しない。非表示は戻せる。
7. Workサイトの保存・更新ができない場合は自動反映を偽らない。実際に生成した画像と、反映できなかった理由を報告する。サイトが保存される前に、単なる回答テキストを完成画像一覧に見せかけない。
8. 「ChatGPTに相談」はLP制作ツール同様、現在入力を踏まえた入力案だけを本人確認後に反映する。外部の過去チャットをサイトが勝手に読めると説明しない。

## 確認

- 9種類のデザイン方向が選べ、3案の背景色・アクセント色が自由に変わる。ヘッダーから画面の見た目を変更できる。
- チラシとSNSで情報量だけでなく構図・写真の役割・視線の流れが異なる。固定の下見画像は表示しない。
- 画面のライト/ダーク/システムとメイン/サブカラーが保存・再表示される。
- 生成依頼文が現在の入力と媒体別の掲載情報、GitHub上の共通・チラシ・SNSスキルURLを渡し、本人が確認してから送信できる。完成画像を実寸と縮小表示で検品し、文字組み・写真との一体感・CTAの質に問題があれば修正してから保存する。
- 同じWorkサイトへの画像保存が実行できた場合に限り、再読込後に完成画像が見える。修正、新バージョン、一覧からの非表示と復元を確認する。
- 新規/更新、画像生成、Workへの保存、一覧表示について、実施済み/未検証を分けて報告する。本人限定を維持し、一般公開や追加課金の設定はしない。

## Current release requirements (overrides older fixed 4:5 and nine-palette wording above)

- Preserve the existing Site URL, owner-only access, saved input, and all completed-image entries when updating a Site.
- Offer ten palette presets plus free background and accent colors for each of three designs. Keep the screen theme controls separate from image colors.
- Let the user choose SNS 4:5 (1080x1350) or 16:9 (1920x1080). Show the selected ratio accurately throughout the workflow and saved-image list. A different-ratio request creates only one new composition and keeps its source image.
- Accept an optional LP URL. Read it only when accessible, distinguish confirmed facts from missing facts, and never invent missing dates, venue, prices, application destination, people, results, or effects.
- Generate an A4 flyer at exactly 2480x3508 pixels and SNS at exactly the selected dimensions. Inspect the actual final pixels and a 375px-wide phone view. Reject low contrast, clipped or inaccurate Japanese text, and especially red text on a dark background.
- Do not call an event image distribution-ready until the date, venue, and application destination are supplied and visible. Do not draw a CTA with no destination as though it were actionable.
- Keep saved PNGs and manifest entries additive. Verify the refreshed completed-image screen after saving, and state clearly when automatic Site reflection could not be completed.
