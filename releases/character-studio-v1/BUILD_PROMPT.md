# 寺子屋AI キャラクター設計ツール ビルドプロンプト

第4回ワークショップ用 v0.1.0。ChatGPT Workで、自分の仕事に合う役割・ペルソナ・プロジェクト指示・最初の依頼文を設計するツールを作る。

## 読む順番

リポジトリは https://github.com/kaerukadate1/terakoya-ai-kit 。同じGit refから次を読む。参照先を推測で過去版に置き換えない。

1. character-studio/README.md、手順.md、スキル.md。
2. character-studio/skills/persona-design/SKILL.md と skills/work-execution/SKILL.md。
3. lp/skills/terakoya-web-design/SKILL.md と references/work-sites-guidance.md。
4. character-studio/app/ の index.html、styles.css、core.js、app.js、assets/lucide.min.js、assets/terakoya-logo.jpg。
5. character-studio/tests/core.test.cjs。

通常のHTMLページでGitHub内容を取得できなければ、同じrefのraw URLを試せる。必要な資料を読めなければ、取得できない場所を報告して止める。

## 実装

固定ファイルの動作を保持して画面を作る。静的HTML/JSを基本とし、APIキーや新たな有料サービスを要求しない。Sitesが利用可能なら現在の公式手順で本人用のツールとして作成・表示する。既存Siteを更新する場合は本人入力・キャラクター・画像・バックアップを保持する。

表示名は「寺子屋AI キャラクター設計ツール」。仕事→役割→キャラクター→仕事のルール→試す・設定する→一覧の6段階。既存キットの操作感を保ち、PC・モバイルの入力と出力を読みやすくする。

- 一覧は空から始める。開発用の設定・顧客情報・Sites IDを同梱しない。
- キャラクターは設定上の担当者。実行主体はChatGPT Work。プロジェクトへの自動登録や独立エージェント登録ができたように見せない。
- 名前、役割、話し方、世界観、任意の画像、判断基準、完成条件、本人承認の境界を編集可能にする。
- プロジェクト指示、初仕事の依頼文、設定・引き継ぎ記録をコピー・ダウンロードできるようにする。
- ChatGPTへ渡す前に入力を含む依頼文を見せる。開いた先では本人がWorkを選んで実行する。新規チャットを既存プロジェクト内の会話だと扱わない。
- JSON回答は依頼ID・対象ID・種類を照合し、本人が変更を確認してから反映する。自動返送を偽装しない。
- 保存はブラウザ内。成功と未保存を区別し、バックアップの読み込みは既存データに追加する。別端末同期は保証しない。
- 定期実行・無制限再試行・認証・権限変更は追加しない。本人の明示依頼とサービスの承認要求を守る。

## 確認して完成させる

構文・単体テストと、PC/390pxでの表示・入力・保存・再読込・書き出し・削除確認を実施する。設定によってWorkの能力が増えるという説明にしない。作成したURL、確認した機能、未確認点を返す。本人の最初の仕事まで実行したと装わない。

公式参照: https://learn.chatgpt.com/docs/projects と https://learn.chatgpt.com/docs/long-running-work 。仕様・機能の利用可否は実際のアカウントで確認する。
