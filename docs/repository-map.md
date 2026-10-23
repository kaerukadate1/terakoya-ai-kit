# リポジトリ構成図と段階的な整理

確認基準: main の 3423b5ee5ae0275463ce64c0653a7a81a983d01d（2026-10-24 JST）。
この文書は現状と今後の案を分けて示します。編集元の移動・配布方式の変更はまだ行っていません。

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

- 各ツールの画面、制作指示、テストは上記 releases/ の中です。
- LP用のコピーライティング・Webデザイン・レビュースキルの正本は plugins/terakoya-ai-creative/skills/。LP配布先の skills/ に同じ内容を複製しています。
- 画像用の共通・チラシ・SNSスキルの正本は releases/workshop2-image-v1/design/。
- note記事は releases/note-article-v1/ に dist/、skills/、tests/ と配布検証用 scripts/、MANIFEST.json があります。
- archive/ は旧資料です。ただし docs/ と prompts/ の旧入口案内、releases/kokuchi-v3/ の配布済みファイルは互換性のため残っています。
- .agents/plugins/marketplace.json は plugins/terakoya-ai-creative を参照します。この構成を無断で変えません。

## 改善案（未移行）

入口は移動せず、開発用だけ次のように分けます。最初は画像ツール1つで試します。

- src/flyer-sns/app/：HTML・CSS・JSの編集元
- src/flyer-sns/prompts/：開始文・制作指示・補助文の編集元
- src/flyer-sns/skills/：画像用3スキルの編集元
- src/flyer-sns/tests/：ツール単体テスト
- scripts/：配布生成・検証
- tests/：配布先や旧入口の互換性テスト
- shared/：複数ツールで仕様が揃ったJSON検証・返送処理だけを、必要になった段階で共通化
- releases/：将来は編集元から生成する配布物。現時点ではまだ自動生成に統一していません。

LPのpluginスキル正本は当面そのままにし、配布コピーを自動生成する案です。
4ツールの同時移行や、新フレームワークの導入は行いません。

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
次の段階は画像ツールの編集元分離と、移行前後の配布物が同じになることの確認です。
