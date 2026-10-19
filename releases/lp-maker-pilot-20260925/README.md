# LP制作ツール（第1回）

参加者へ渡す文は [START_HERE.txt](START_HERE.txt) の2行だけ。これが [WORKSHOP_PROMPT.md](WORKSHOP_PROMPT.md) を読み、同じフォルダにある固定版のHTML/CSS/JSを本人限定のWorkサイトとして完成させる二段構成を試す。

短文を実行するたびに新しい本人限定サイトを作る。過去のサイト・入力・完成LPを引き継がず、既存サイトは変更しない。再実行時も同じ短文を使うため、サイトが増える点に注意する。

`index.html` と依存ファイルの相対パスを保持してブラウザで開く。必要ならフォルダ内で `python -m http.server 8811 --bind 127.0.0.1` を実行する。ローカル表示に外部API、ログイン、デプロイは不要。`node --test tests/*.test.cjs` で自動テストを実行できる。

固定版の実行に必要なものは `index.html`、`styles.css`、`overrides.css`、`core.js`、`library.js`、`app.js`、`completed-lps.json`、`history.json` の8ファイルと、制作ルールとしてWorkが読む `skills/` の3スキル6ファイル（`terakoya-copywriting`、`terakoya-web-design`、`terakoya-creative-review` それぞれの `SKILL.md` と `references/` 内の資料）。左サイドバーの「制作一覧」には保存した制作設定と完成LPが並び、`history.json` にWorkが追記すると別端末からも呼び出せる。旧ヒアリングシート機能と旧サンプル画像ファイルは履歴として残るが画面では読み込まない。写真未指定なら「画像」の仮枠にする。各参加者の入力や写真はGitHubへ保存しない。このツールで作ったLPは、自分の事業にも、依頼を受けたお客様の仕事にも使えます。

ローカルでは3案を比較し、Workでの仕上げは1〜3案から選ぶ。初期値は1案目だけ。選択状態はその端末の案件データに保存し、Workへの依頼文には選んだ案だけを含める。

本人限定WorkサイトでLPを仕上げた場合、同サイトの `completed/<一意のID>/index.html` に保存し、実画面のサムネ画像を作れる場合は同じ場所へ保存する。既存LPを消さず、`completed-lps.json` の `entries` に `title`、`design`、`slot`、`url`、`thumbnail`、`createdAt`、`projectSettings` を追記する。設定から再編集する際、画像ファイル本体は再指定する。本人限定で再発行されると、ツールの「完成LP」一覧が画面表示時とフォーカス復帰時に同サイトから読み直す。Workがサイト編集・再発行できない場合は自動登録されないため、リンク登録を使う。ローカルの `127.0.0.1` 版へWorkから直接保存することはできない。

実際のWorkがGitHubから7ファイルを取得し、Sitesへ保存・非公開発行まで一回で行えるかを試す。回答待ちで止めない。アクセスできない時は再創作やZIPだけで成功扱いにせず、制約を報告する。
