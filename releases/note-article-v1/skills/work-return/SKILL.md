---
name: terakoya-note-work-return
description: 企画・構成・本文・画像を依頼元の同じSiteへ保存・配信し、完成本文を記事ストックへ残す。
---

# 同じツールへの返送と記事ストック

依頼文の対象Site ID、targetSite、requestId、draftId、type、slotIdをそのまま使う。別Siteの新規作成、公開範囲・認証の変更はしない。本文と画像は「完成」、相談とニュースは「構成」の返送である。

## 返送のタイミング

- `consult` と `news`: 本人との対話で構成1案がまとまったら、article:nullのJSONを生成直後に返送する。本文は作らない。構成・文体・字数・画像枚数・色はツール側で確認する。
- `topics` と `lp-outline`: 指定されたネタ・構成だけを返す。
- `article` と `polish`: 確認済み構成・設定から本文を制作したら、追加の「返送してください」を待たず返送する。確認取り込みはツールで行う。
- `learn`: 本人が確認したrulesを返す。
- `image`: 実際に生成・検品した画像を返す。

サービス案内は任意。未入力なら記事単体の締めで完結し、案内情報不足を理由に返送を止めない。ニュースは実際に読んだ出典をsourcesに含め、公開日不明を推定しない。

## 保存と配信

1. 対象IDのSiteと最新ソースを取得する。既存ファイル、設定、他依頼の結果を保持する。
2. 静的配信フォルダの`returns/<requestId>/`へ保存。JSONは依頼文のenvelopeに制作JSONをdataオブジェクトで格納する。依頼ID等を変えない。
3. 画像は先にimage.pngを保存し、result.jsonのimageUrlは同じ依頼フォルダを指す。
4. article/polishでは、依頼文に示されたinputと制作dataを`completed-articles/<requestId>/article.json`へ保存する。`completed-articles.json`のentriesにid/title/createdAt/urlを追記し、以前の記事を消さない。
5. 最後にresult.jsonを保存して、同じSiteを更新・配信する。ローカルにファイルを書くだけで完了にしない。
6. 依頼ID、対象Site、返送ファイルを確認する。可能ならツール画面で返送を確認する。画面が未確認なら配信完了と分けて報告する。

形式:

```json
{"schemaVersion":1,"requestId":"依頼の値","type":"topics|lp-outline|consult|news|article|polish|learn|imageの指定値","draftId":"依頼の値","slotId":"指定値","targetSite":"依頼のorigin","status":"complete","data":{"生成したJSON":"文字列ではなくオブジェクト"}}
```

修正依頼は、同じrequestIdの結果だけを更新してよい。他の依頼や記事は上書きしない。同時更新は最新ソースへ自分の依頼フォルダを追加し直す。force pushはしない。

保存・配信権限がない、検索・画像生成ができない場合はその事実を伝え、正しい制作JSONと理由を返す。自動返送の成功を装わない。ローカルURLへWorkから保存しない。noteへ投稿しない。
