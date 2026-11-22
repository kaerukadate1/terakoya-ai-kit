# 第4回 v0.5.1｜36担当の実試行とボード受け取り

ws4-v050の36担当を具体的な架空資料で試し、改善後にも全36担当を新規生成して再評価した。ボード生成を阻害するひな形・コピー・照合・保存の不具合を修正し、ChatGPT Workの実画面でも生成から次の担当の制作まで確認した。

## 試行方法と判定の範囲

- 基準: ws4-v050、コミット601ab713d5ca8e0968ea9e467030e9545b1540cf。
- 36担当の試行はCodex上の3組のモデル実行。各組が12担当の実行時プロンプトを読み、実際の成果物を個別ファイルに書いた。各担当ごとの独立した新しいChatGPT会話や別モデルの評価ではない。役割別の出力と自己評価は[baseline](tests/rehearsal/baseline/)と[final](tests/rehearsal/final/)へ保管。
- 同じ架空のパン教室に、日時未定・承認と提案の混在・不明な価格単位・重複疑義の売上・少数アンケートを渡した。改訂版では36担当の挙動を確認できたが、manualとteachingは資料不足を正しく質問し、成果物は部分完成として残した。別の十分な入力による[追加2例](tests/rehearsal/final/positive-cases.json)では両担当とも原稿を完成。
- 1担当1ケースずつのモデル試行と自己評価であり、成功率・顧客成果・受講生環境での再現性の証明ではない。集計の数値、JSON形式、ID照合、保存と表示は別途機械検証した。

## 役割別の実成果物

| 担当 | 改善後の結果 | 実生成した原稿 |
| --- | --- | --- |
| 選ばれる理由担当 | 原稿・計画を生成し自己点検 | [position](tests/rehearsal/final/position-response.md) |
| 競合の空白担当 | 原稿・計画を生成し自己点検 | [gap](tests/rehearsal/final/gap-response.md) |
| アイデア強化担当 | 原稿・計画を生成し自己点検 | [idea](tests/rehearsal/final/idea-response.md) |
| 売り方設計担当 | 原稿・計画を生成し自己点検 | [sell](tests/rehearsal/final/sell-response.md) |
| 集客導線担当 | 原稿・計画を生成し自己点検 | [funnel](tests/rehearsal/final/funnel-response.md) |
| 小さく試す担当 | 原稿・計画を生成し自己点検 | [test](tests/rehearsal/final/test-response.md) |
| SNS発信担当 | 原稿・計画を生成し自己点検 | [sns](tests/rehearsal/final/sns.md) |
| 告知担当 | 原稿・計画を生成し自己点検 | [announcement](tests/rehearsal/final/announcement.md) |
| 文章編集担当 | 原稿・計画を生成し自己点検 | [editor](tests/rehearsal/final/editor.md) |
| コンテンツ展開担当 | 原稿・計画を生成し自己点検 | [repurpose](tests/rehearsal/final/repurpose.md) |
| 商品紹介担当 | 原稿・計画を生成し自己点検 | [product](tests/rehearsal/final/product.md) |
| 発信計画担当 | 原稿・計画を生成し自己点検 | [calendar](tests/rehearsal/final/calendar.md) |
| 提案資料担当 | 原稿・計画を生成し自己点検 | [proposal](tests/rehearsal/final/proposal.md) |
| プレゼン担当 | 原稿・計画を生成し自己点検 | [slides](tests/rehearsal/final/slides.md) |
| マニュアル担当 | 不足資料を質問・設計部分まで。十分な入力の追加例は完成 | [manual](tests/rehearsal/final/manual.md) |
| FAQ担当 | 原稿・計画を生成し自己点検 | [faq](tests/rehearsal/final/faq.md) |
| 講座教材担当 | 不足資料を質問・設計部分まで。十分な入力の追加例は完成 | [teaching](tests/rehearsal/final/teaching.md) |
| 文章チェック担当 | 原稿・計画を生成し自己点検 | [proofread](tests/rehearsal/final/proofread.md) |
| 企画担当 | 原稿・計画を生成し自己点検 | [ideas](tests/rehearsal/final/ideas.md) |
| サービス設計担当 | 原稿・計画を生成し自己点検 | [service](tests/rehearsal/final/service.md) |
| 競合調査担当 | 原稿・計画を生成し自己点検 | [competitor](tests/rehearsal/final/competitor.md) |
| 比較検討担当 | 原稿・計画を生成し自己点検 | [compare](tests/rehearsal/final/compare.md) |
| 情報整理担当 | 原稿・計画を生成し自己点検 | [synthesize](tests/rehearsal/final/synthesize.md) |
| 意思決定補助担当 | 原稿・計画を生成し自己点検 | [decision](tests/rehearsal/final/decision.md) |
| 仕事整理担当 | 原稿・計画を生成し自己点検 | [tasks](tests/rehearsal/final/tasks.md) |
| 優先順位整理担当 | 原稿・計画を生成し自己点検 | [priority](tests/rehearsal/final/priority.md) |
| 会議準備担当 | 原稿・計画を生成し自己点検 | [meeting](tests/rehearsal/final/meeting.md) |
| 議事録担当 | 原稿・計画を生成し自己点検 | [minutes](tests/rehearsal/final/minutes.md) |
| 進行整理担当 | 原稿・計画を生成し自己点検 | [progress](tests/rehearsal/final/progress.md) |
| 報告書担当 | 原稿・計画を生成し自己点検 | [report](tests/rehearsal/final/report.md) |
| データ整理担当 | 原稿・計画を生成し自己点検 | [clean](tests/rehearsal/final/clean.md) |
| 売上集計担当 | 原稿・計画を生成し自己点検 | [sales](tests/rehearsal/final/sales.md) |
| アンケート分析担当 | 原稿・計画を生成し自己点検 | [survey](tests/rehearsal/final/survey.md) |
| 活動振り返り担当 | 原稿・計画を生成し自己点検 | [retrospective](tests/rehearsal/final/retrospective.md) |
| 学習担当 | 原稿・計画を生成し自己点検 | [learning](tests/rehearsal/final/learning.md) |
| 資料比較担当 | 原稿・計画を生成し自己点検 | [diff](tests/rehearsal/final/diff.md) |

[受付手順書の十分な入力例](tests/rehearsal/final/manual-positive.md)と[20分教材の十分な入力例](tests/rehearsal/final/teaching-positive.md)は追加の完成原稿。元の不足ケースの評価は変更していない。売上集計は重複Bを別取引とした10月13,500円、重複とした9,000円を両方提示し、11月純額0円、入金不明を区別した。

## 実往復と回帰確認

Chromeのログイン済みChatGPTで、アイデア強化担当の完全な依頼文をWorkへ渡した。[実会話](https://chatgpt.com/c/6b02f2ea-ba50-83ee-a334-9fc78b34e849)では専門手順の4観点、週30分の負荷、根拠と未確認を含む提案と[返送JSON](tests/rehearsal/chatgpt-work-idea.json)を実生成した。localhostへの接続不可が明示されたためJSONを貼り付けてボードにし、サービス設計担当への引き継ぎから新しいWork依頼を開いた。?prompt=でWorkが維持され、元メモと専門手順が入力された状態を確認して送信。目安メモ・質問受付・7日後確認の原稿が完成した。

これは手動貼り付け経路の実往復であり、本番SiteへのWork自動配信の成功ではない。画面操作は利用者の貼り付け経路のQAとして行い、Workによる自動返送の代替とはしていない。

- Node回帰: `node --test character-studio/tests/*.test.cjs`（64件）。
- 基本Chrome確認: 画像取り込み、実ダウンロードとコピー、保存と再読込、複製・検索・削除確認・追加バックアップ。
- workflow-browser: 6担当の新規実生成JSONを一時HTTPサーバーから返す。コピー→再読込→不一致拒否→受け取り→完了チェック→一覧保存→再読込→担当引き継ぎ→専門手順入り依頼を検証。
- 異なるassistantの貼り付け拒否、保存失敗後の再試行、コピー権限拒否、別ブラウザへのボード・メモ・チェック・全role下書き復元を確認。
- PC/モバイル390・768・1440pxの全6工程、実行時エラーを確認。テストは独立ブラウザを使い、利用者のデータを変更していない。

## mainとの差分と修正内容

mainの基準61cf9d5からws4-v050までは4コミット（a68f97c、a53fc59、565e768、601ab71）。差分81ファイルはcharacter-studioとその配布版だけで、ボード・戦略6担当・Work導線を追加する。これを履歴ごと取り込み、その上に次を修正した。ws4-v050は変更しない。

1. ideaのJSON内の括弧でひな形が切れる問題を修正。すべてのひな形をJSONとして検証する。
2. コピーにも同じ依頼IDと返送指示を付ける。ポップアップ不可でも同じ依頼をコピーでき、コピー権限不可なら画面内で文章を選べる。
3. 封筒付き貼り付けで、依頼・現在のassistant・origin・roleを照合。誤った結果を別の担当へ保存しない。
4. 依頼とモードをassistantとrole別に保管。引き継ぎ後、一覧保存と再読込を経ても消えない。
5. 元メモと要約の後ろの追記を保持。要約の開始・終了範囲のみ更新し、上限なら元メモを残す。根拠ラベル6種類を維持。
6. ボード保存失敗時に待機を残す。バックアップはID再割当で過去roleのボードや全roleの依頼下書きまで復元。
7. 36担当に実試行で見つけた固有のチェックを追加し、手順と配布ファイルを再生成。原典コミット・ライセンスは維持。

## 残る検証範囲と記録

本番SiteへのWork自動返送、外部サイトの実調査、実顧客への送信・売上、実授業の所要時間はこの検証の成功範囲に含めない。課金APIや常駐エージェントは追加していない。データ保存は引き続きブラウザ内で、アシスタント100件・作戦ボード60件が上限。

[Notionの制作・検証記録](https://app.notion.com/p/42080bf6b81f81cfbf58f3bb5efe5a81)を正本の業務記録として更新する。テスト原稿は架空資料のみで、配信するappには含めない。
