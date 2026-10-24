# リポジトリ構成図と段階的な整理

構成確認基準: main の 3423b5ee5ae0275463ce64c0653a7a81a983d01d。方針更新: 2026-10-24 JST。
この文書は現状と今後の案を分けて示します。画像ツールだけ編集元の分離と配布生成を実施済みです。LP・note・マイサイトは未移行です。

## 参加者が使う入口（維持）

| 作るもの | 入口 | 現在の配布実体 | 開始文の対応先 |
| --- | --- | --- | --- |
| LP | lp/ | releases/lp-maker-pilot-20260925/ | START_HERE.txt |
| チラシ・SNS画像 | flyer-sns/ | releases/workshop2-image-v1/ | STARTER_PROMPT.txt |
| マイサイト | my-site/ | releases/mytools-v5/ | STARTER_PROMPT.txt |
| note記事 | note-article/ | releases/note-article-v1/ | STARTER_PROMPT.txt |

各入口の「開始文.txt」は、対応する配布実体の開始文と同じ内容です。
README.md は参加者の入口、運用ルール.md は更新者向けの現行ルールです。

## 現在、編集する場所

- 画像ツールの画面・制作指示・スキル・テストは flyer-sns/app/・prompts/・skills/・tests/ が正本です。開始文の正本は flyer-sns/開始文.txt。
- ほかのツールの画面、制作指示、テストは上記 releases/ の中です。
- LP用のコピーライティング・Webデザイン・レビュースキルの正本は plugins/terakoya-ai-creative/skills/。LP配布先の skills/ に同じ内容を複製しています。
- 画像用の共通・チラシ・SNSスキルは flyer-sns/skills/ が正本、releases/workshop2-image-v1/design/ は生成先です。
- note記事は releases/note-article-v1/ に dist/、skills/、tests/ と配布検証用 scripts/、MANIFEST.json があります。
- archive/ は旧資料です。ただし docs/ と prompts/ の旧入口案内、releases/kokuchi-v3/ の配布済みファイルは互換性のため残っています。
- .agents/plugins/marketplace.json は plugins/terakoya-ai-creative を参照します。この構成を無断で変えません。

## 全体方針：同じリポジトリの中を、ツールごとに分ける（画像のみ移行済み）

LP・画像・note・マイサイトは、この1つのリポジトリで管理します。
最上位をツール別にし、それぞれの中に画面・制作指示・スキル・必要なプラグインをまとめます。
「画像を直すなら flyer-sns/ を開く」で編集先までたどれる形です。
以前の src/<tool>/ 案ではなく、既存の4入口をそのまま各ツールのまとまりへ育てます。

```text
terakoya-ai-kit/
  README.md                     4つのツールから選ぶ入口
  lp/
    README.md・開始文.txt・手順.md・進行.md・スキル.md
    app/                        LPツールの画面とコード
    prompts/                    制作指示・補助プロンプト
    skills/                     LP制作スキル
    plugin/                     既存pluginを移行する場合の定義
    tests/                      LPの検査
  flyer-sns/
    README.md・開始文.txt・手順.md・進行.md・スキル.md
    app/                        画像ツールの画面とコード
    prompts/
    skills/                     共通・チラシ・SNSスキル
    tests/
  note-article/
    README.md・開始文.txt・手順.md・進行.md・スキル.md
    app/
    prompts/
    skills/                     記事・画像・返送スキル
    tests/
  my-site/
    README.md・開始文.txt・手順.md・進行.md・スキル.md
    app/
    prompts/
    skills/                     本ツール固有のスキルがある場合
    tests/
  scripts/                      配布生成・互換性チェック
  releases/                     既存URLを守る配布先
  docs/                         全体の運用・構成図
  archive/                      旧資料
```

- 各ツールの README に「使う人向け」と「直す人向け」の入口を置きます。
- 各ツールの 開始文.txt を正本とし、release側の開始文はそこから生成する案です。別の開始文正本を prompts/ に重ねて作りません。
- plugin/ はプラグインが実際に存在するツールだけに置きます。空のpluginや新しいインストール・権限設定は作りません。
- LPの既存pluginは現在 plugins/terakoya-ai-creative/ にあります。移行まではここが正本です。lp/plugin/ や lp/skills/ を先に複製して二重正本にしません。
- 将来LPスキルを lp/skills/ へ集約する場合、plugin向けコピーとrelease向けコピーは同じ正本から生成します。既存marketplace定義・直接取得URL・配布コピーを一緒に検証してから切り替えます。
- 複数ツールで使う処理も、最初から大きな shared/ に分散させません。共通化が本当に必要になった箇所だけ、各ツールのREADMEに正本を明記して共用します。
- releases/ は参加者が探す場所ではなく、配布済みURLを維持するための場所です。新構成への移行後も旧パスへ同じ実体を生成して残します。

画像ツールは上記構成へ正本を集約済みです。既存releaseの22ファイルをバイト単位で維持する生成・検証スクリプトを追加しました。plugin・marketplace・公開設定は変更していません。

[画像ツールの開発と配布の手順](../flyer-sns/開発.md)を参照してください。

## 配布と版の方針案

1. 開始文の編集元を1つにし、参加者用と配布用の2か所へ同じ内容を生成する。
2. 画面・制作指示・スキルを1つの版としてまとめ、manifestに生成元コミット・版・ファイルのSHA256を記録する。
3. note記事の scripts/verify-release.cjs を参考にする。タグ固定時は内部の取得URLも同じ版に揃える。
4. 既存main配下のreleaseは互換配布先、タグ・コミット固定は再現用と区別する。過去のタグを付け替えない。
5. 画像用開始文の「リポジトリ通常URLを渡す」方針は維持し、READMEから配布実体へ案内する。
6. 個別Siteの識別情報・完成画像・顧客入力・返送済みJSONを配布キットへ混ぜない。公開先を勝手に変更しない。

## 壊してはいけないもの

- 配布済みの開始文、releases/の取得パス、plugins/の直接取得パス。
- JS・CSS・JSONの旧パスは文章の案内だけに置き換えない。必要なら実体を生成して残す。
- 古いタグ・コミット、既存Siteの入力と完成物。
- docs/、prompts/に残っている旧案内ファイル。

詳細は [運用ルール](../運用ルール.md) を参照します。

## 最初の整理段階

今回追加したものは、この構成図と読み取り専用の scripts/verify-entrypoints.cjs です。
スクリプトは入口の5ファイル、開始文4組の一致、主要な配布済みパスの存在を確認します。
ファイルの書き換え、ネットワークアクセス、公開・配布・削除はしません。

実行: node scripts/verify-entrypoints.cjs

この検査は全URLの疎通確認や画面テストではありません。既存のツール別テスト、note版のmanifest検証、実Siteでの制作・返送確認は別途必要です。
画像ツールは scripts/generate-flyer-release.cjs --check で正本と生成先の一致を検査します。次の段階は、他ツールを同じ考え方で1つずつ整理することです。
