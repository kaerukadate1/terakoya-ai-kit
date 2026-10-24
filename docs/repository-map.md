# リポジトリ構成図

2026-10-24 JST更新。LP・画像・note・マイサイトを、同じリポジトリの中でツール別に整理しました。

## 使う・直す場所

| ツール | 使う入口 | 直す手順 | 互換配布先 |
| --- | --- | --- | --- |
| LP | [lp](../lp/README.md) | [開発](../lp/開発.md) | releases/lp-maker-pilot-20260925/ |
| 画像 | [flyer-sns](../flyer-sns/README.md) | [開発](../flyer-sns/開発.md) | releases/workshop2-image-v1/ |
| note | [note-article](../note-article/README.md) | [開発](../note-article/開発.md) | releases/note-article-v1/ |
| マイサイト | [my-site](../my-site/README.md) | [開発](../my-site/開発.md) | releases/mytools-v5/ |

## 各ツールの中

- README.md・開始文.txt・手順.md・進行.md・スキル.md：参加者の入口。
- app/：画面・コード・同梱素材。個別Siteの顧客入力や成果物は含めません。
- prompts/：制作指示・配布版README・更新指示。
- skills/：そのツールのスキル。マイサイト固有スキルは新設していません。
- tests/：テストの正本。従来の相対パスを保つため、生成後のrelease側で実行します。
- LPのplugin/：既存pluginの定義と説明。LPスキルは lp/skills/ が唯一の正本です。
- noteのscripts/・release/：既存配布スクリプト・manifest・属性の正本。固定版を勝手に更新しません。
- 開発.md：どこを編集し、どう配布コピーを生成するか。

## 配布先は自動生成

画像は scripts/generate-flyer-release.cjs、ほかの3ツールは scripts/generate-tool-release.cjs と各ツールの release-map.json を使います。

```sh
node scripts/generate-flyer-release.cjs --check
node scripts/generate-tool-release.cjs lp --check
node scripts/generate-tool-release.cjs note-article --check
node scripts/generate-tool-release.cjs my-site --check
```

--checkは読み取りのみ、--writeは明示した対応先だけを更新します。無関係なファイルは削除しません。開始文は各ツール直下が正本で、release側へ同じ文を生成します。releases/ と plugins/terakoya-ai-creative/ は互換配布コピーとして残し、直接編集しません。

LPの共用スキルは lp/skills/ から、従来pluginパスとLP配布パスの双方へ生成します。marketplaceの参照先・plugin定義の内容・インストール権限は変更していません。

## そのまま残したもの

- 既存開始文URL、raw取得パス、過去タグ・コミット。
- 4ツールの配布実体とLPプラグインの全バイト。画像22、LP＋plugin35、note21、my-site8出力。
- noteのmanifest・固定スキルURL、my-siteの既存ロゴ。
- archive/、docs/、prompts/にある配布済みの旧案内。
- Siteの識別情報・公開設定・本人入力・完成画像はこの整理では操作していません。

## 検証の範囲

生成物の一致・開始文の一致・既存unitテストで互換性を検証します。実際のSiteでの生成や返送が成功したこととは区別します。
my-siteの既存ブラウザテストはCHROME_PATHとMYTOOLS_URLを指定できる環境で実行します。今回の整理ではブラウザ起動が実行環境の制限により完了していません。

詳しい運用は [運用ルール](../運用ルール.md) を参照してください。
