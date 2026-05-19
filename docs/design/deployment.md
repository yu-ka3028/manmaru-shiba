# デプロイ手順・環境設定

**作成日：** 2026-05-19

---

## 構成概要

| サービス | 用途 |
|---|---|
| Render | Rails API バックエンド |
| Vercel | Next.js フロントエンド |
| Supabase | PostgreSQL データベース |
| LINE Developers | Messaging API / LIFF |

---

## Supabase

### プロジェクト作成時の設定

- **Security セクションの設定はすべて OFF**
  - Enable Data API → OFF
  - Automatically expose new tables → OFF
  - Enable automatic RLS → OFF
  - Rails から直接 PostgreSQL に接続するため不要

### 接続文字列の取得

Project Settings → Database → **Connection string → URI**

- **Session mode（ポート 6543）を使用すること**
- Render の無料プランは IPv6 非対応のため、Direct connection（ポート 5432）は不可
- `[YOUR-PASSWORD]` を実際のパスワードに置き換えて使用

---

## Render（バックエンド）

### サービス作成

| 項目 | 値 |
|---|---|
| Root Directory | `backend` |
| Environment | `Ruby` |
| Build Command | `bundle install` |
| Start Command | `bundle exec rails db:migrate && bundle exec rails server -b 0.0.0.0` |

> `db:migrate` を Start Command に含めることで、デプロイのたびにマイグレーションが実行される。
> 無料プランは SSH アクセス不可のため、Shell からの手動実行ができない。

### 環境変数

| 変数 | 説明 | 取得元 |
|---|---|---|
| `RAILS_ENV` | `production` | 固定値 |
| `DATABASE_URL` | Supabase の接続文字列（Session mode） | Supabase → Project Settings → Database |
| `LINE_CHANNEL_SECRET` | 署名検証に使用 | LINE Developers → **Messaging API チャネル** → チャネル基本設定 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE API 呼び出しに使用 | LINE Developers → **Messaging API チャネル** → Messaging API設定 |
| `LIFF_BASE_URL` | `https://liff.line.me/（LIFF ID）` | LINE Developers → LIFF タブ |
| `CORS_ALLOWED_ORIGINS` | Vercel のデプロイ URL | Vercel のドメイン確認後に設定 |
| `RAILS_MASTER_KEY` | `backend/config/master.key` の中身 | ローカルファイルをコピー |

> **注意**：LINE のチャネルシークレットとアクセストークンは **Messaging API チャネル** のものを使用する。
> LINE ログインチャネルのものではないので注意。

---

## Vercel（フロントエンド）

### プロジェクト設定

| 項目 | 値 |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js（自動検出） |
| Build Command | デフォルト（`npm run build`） |

> **Root Directory は必ず `frontend` に設定すること。**
> Git 連携なしで設定すると「ディレクトリが存在しない」エラーになる。
> **先に GitHub リポジトリを Git 連携してから** Root Directory を設定する。

### 環境変数

| 変数 | 説明 | 取得元 |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LIFF アプリの ID | LINE Developers → LIFF タブ → LIFF ID |

### Git 連携

- GitHub リポジトリを連携してから各種設定を行う
- Git 連携なしの状態で設定変更しても、push 時に自動デプロイが発火しない
- 手動 Redeploy は**同じコミットを再デプロイする**ため、新しいコードは反映されない

---

## LINE Developers

### Messaging API チャネル

| 設定 | 値 |
|---|---|
| Webhook URL | `https://（Render のドメイン）/webhooks/line` |
| Webhookの利用 | ON |
| Webhookの再送 | OFF（二重処理防止） |

### LIFF

| 設定 | 値 |
|---|---|
| Endpoint URL | `https://（Vercel のドメイン）` |

---

## デプロイ手順（初回）

1. **Supabase** プロジェクト作成 → 接続文字列取得
2. **Render** サービス作成 → 環境変数設定 → デプロイ
3. **LINE Developers** Webhook URL 設定 → 「検証」で 200 OK 確認
4. **Vercel** GitHub 連携 → Root Directory を `frontend` に設定 → 環境変数設定
5. **LINE Developers** LIFF Endpoint URL を Vercel のドメインに設定
6. Render の `CORS_ALLOWED_ORIGINS` を Vercel のドメインに更新

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| Webhook 署名検証が 400 になる | `LINE_CHANNEL_SECRET` が LINE ログインチャネルのものになっている | Messaging API チャネルのシークレットに変更 |
| DB 接続エラー（IPv6 Network unreachable） | Direct connection を使用している | Session mode（ポート 6543）の接続文字列に変更 |
| `relation "users" does not exist` | マイグレーション未実行 | Start Command に `db:migrate` を追加 |
| Vercel で `/setup` 等が 404 | Root Directory 未設定 or Git 連携未設定 | Git 連携後に Root Directory を `frontend` に設定 |
| `Command "npm run vercel-build" exited with 1` | Root Directory が repo ルートになっている | Root Directory を `frontend` に設定 |
