# Webhook基盤 実装ログ

**対応Issue：** #20  
**作成日：** 2026-05-19

---

## 作業内容

Rails API-only アプリの初期セットアップと、LINE Webhook 基盤を実装した。

### やったこと

- Rails 7.0 / API only / PostgreSQL で `backend/` 以下にアプリを新規作成
- `line-bot-api` gem を使って `POST /webhooks/line` を実装
- 署名検証（`X-Line-Signature` + Channel Secret）
- follow イベント → User 作成 + セットアップリンク（push_message）
- message イベント → 「ボタンからご記録ください」返信
- CORS 設定（`rack-cors`）
- 環境変数管理（`dotenv-rails` + `.env.example`）

---

## 設計判断メモ

### なぜ `find_or_create_by` を使ったか

follow イベントは「友だち追加」で発火するが、ブロック解除でも再び飛んでくる。  
同じ `line_user_id` で二重に User を作らないよう、`find_or_create_by` を使った。

Rails の場合、DB の `UNIQUE` 制約と `find_or_create_by` の組み合わせで二重登録を防ぐのが典型パターン。  
DDD で言えば「同一性の保証」に相当するが、Rails では Aggregate も Repository も使わず、  
Active Record + DB 制約でシンプルに表現できる。

### なぜ follow イベントで reply_message ではなく push_message を使うか

LINE Webhook の follow イベントには `replyToken` が存在しない。  
`reply_message` は replyToken を必須とするため、`push_message` を使う必要がある。  
（message イベントなど、ユーザーからのアクションに応じたイベントは replyToken を持つ）

### なぜ API only モードを選んだか

今回のバックエンドは JSON を返すだけでいい。View（ERB/HTML）は不要。  
`ActionController::API` は View・Cookie・CSRF protection・セッション管理を省いたサブセット。  
→ 軽量で余分な責務がない。CSRF も LINE からの POST をそのまま受け取れるので相性が良い。

### 環境変数の管理方針

| 変数 | 説明 |
|---|---|
| `LINE_CHANNEL_SECRET` | 署名検証に使用。外部に漏れると署名偽造が可能になる |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE API 呼び出しに使用 |
| `LIFF_BASE_URL` | セットアップリンクのベースURL |
| `CORS_ALLOWED_ORIGINS` | フロントエンドのオリジン |

- ローカル開発：`.env` に記載（gitignore 済み）
- 本番：Render の環境変数設定画面に直接入力
- `.env.example` をコミットして「必要な変数の一覧」として使う

---

## 言語化チェックリスト

- [x] LINE Webhookの署名検証は何をどう確認しているか説明できるか

  LINEサーバーがリクエストボディから算出したハッシュ値と、RailsがChannel Secretを使って同じ計算をしたハッシュ値が一致したら正規のリクエストとして処理する。一致しない場合は400を返して弾く。これを署名検証という。
  LINEにはLINEログインチャンネルのシークレットとMessaging APIのシークレットがあり、後者をRailsのハッシュ値算出に使う。
- [x] `find_or_create_by` はどういうSQLを発行しているか

  まず SELECT で条件に一致するレコードを探す。見つかればそれを返す。見つからなかった場合のみ INSERT で新規作成する。SQLは最大2回走る。
  ```sql
  SELECT * FROM users WHERE line_user_id = 'Uxxxx' LIMIT 1
  INSERT INTO users (line_user_id, display_name, ...) VALUES (...)  -- 見つからなかった場合のみ
  ```
- [x] follow イベントで push_message を使う理由は何か

  reply_message は replyToken を必須とする。replyToken はユーザーがメッセージを送ったりボタンを押したりしたときに発行される。
  follow イベントはユーザーのアクションではあるが、LINEがシステムイベントとして扱うため replyToken が発行されない。
  そのため push_message（こちらから任意のタイミングで送れる）を使う必要がある。アラートもこちら発火なので push_message になる。
- [x] `ActionController::API` と `ActionController::Base` の違いは何か

  `ActionController::Base` はデフォルト設定でView・Cookie・セッション管理・CSRF protectionを含むフル機能。
  `ActionController::API` はJSONを返すだけのAPIに不要なものを省いたサブセット。View・Cookie・セッション・CSRFが含まれない。
  Rails API onlyモードでは全コントローラーが `ActionController::API` を継承する。
- [x] API only モードで CSRF を気にしなくていい理由は何か

  CSRFはブラウザがCookieを自動送信する仕組みを悪用した攻撃。悪意あるサイト経由でリクエストを送っても、ブラウザがCookie（セッション情報）を自動で付けてしまうためサーバーが本人と誤解する。
  API onlyモードではCookie・セッションを使わずJWTで認証するため、JWTはブラウザが自動送信しない。そのためCSRFの脅威がそもそも成立しない。
  JWTはリクエストヘッダーに明示的に付ける必要があるため、悪意あるサイトからは勝手に使えない。「攻撃の前提（Cookieの自動送信）がそもそも成立しない」からCSRF対策が不要になる。
- [x] `ENV.fetch` と `ENV[]` の違いは何か（存在しない環境変数の扱い）

  どちらも環境変数の値を取得するのは同じ。違いは環境変数が存在しなかったときの挙動。
  - `ENV["LINE_CHANNEL_SECRET"]` → 存在しなければ `nil` を返す（エラーにならずそのまま動いてしまう）
  - `ENV.fetch("LINE_CHANNEL_SECRET")` → 存在しなければ `KeyError` を発生させる（即エラーで気づける）
  必須の環境変数には `ENV.fetch` を使う方が設定漏れを早期に発見できて安全。
