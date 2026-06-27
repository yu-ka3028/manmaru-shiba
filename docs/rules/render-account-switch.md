# Renderアカウント切り替え手順書

無料プランのメモリ上限に達した場合、別アカウントのRenderサービスに切り替えることで継続して無料運用できる。
DBはSupabase・フロントはVercelのため、Render側のみ変更すればよい。

## 前提

- DBはSupabaseを使用（Render非依存）
- フロントエンドはVercel（Render非依存）
- ソースコードに変更不要（環境変数のみで切り替え可能）

---

## STEP 1：現在のRenderの環境変数を控える

新アカウントで同じ値を使うため、Renderダッシュボードの「Environment」タブで以下を確認してメモしておく。

| 環境変数 | 値の確認場所 |
|---|---|
| `RAILS_MASTER_KEY` | Renderダッシュボード |
| `DATABASE_URL` | Supabaseダッシュボード（変わらない） |
| `JWT_SECRET` | Renderダッシュボード |
| `LIFF_BASE_URL` | Renderダッシュボード |
| `LINE_CHANNEL_TOKEN` | LINE Developersコンソール |
| `LINE_CHANNEL_SECRET` | LINE Developersコンソール |
| `CORS_ALLOWED_ORIGINS` | Renderダッシュボード（Vercel URLなので変わらない） |
| `RAILS_ENV` | `production`（固定） |
| `RAILS_MAX_THREADS` | Renderダッシュボード |

---

## STEP 2：新Renderアカウントでサービスを作成する

1. 新しいGmailアドレスでRenderアカウントを作成する
2. ダッシュボードから「New → Web Service」を選択
3. GitHubリポジトリ（`yu-ka3028/manmaru-shiba`）を接続する
4. 以下の設定でサービスを作成する

| 項目 | 設定値 |
|---|---|
| Name | 任意（例：manmaru-shiba-api） |
| Region | Singapore（既存と合わせる） |
| Branch | main |
| Root Directory | backend |
| Build Command | `bundle install` |
| Start Command | `bundle exec puma -C config/puma.rb` |
| Instance Type | **Free** |

---

## STEP 2.5：SupabaseのNetwork Restrictionsを確認する

Supabaseダッシュボード → Project Settings → Database → **Network restrictions** を確認する。

- **設定なし（デフォルト）** → 何もしなくてよい。`DATABASE_URL` は変わらないのでそのまま接続できる
- **IP制限を設定している場合** → 新Renderサービスのアウトバウンドを追加する必要がある

> 注意：Renderの無料プランはアウトバウンドIPが固定されていないため、IP制限との組み合わせは非推奨。設定していないなら触らない。

---

## STEP 3：新サービスに環境変数をセットする

「Environment」タブで以下を追加する。

```
RAILS_MASTER_KEY=（STEP 1で控えた値）
DATABASE_URL=（SupabaseのURL）
JWT_SECRET=（STEP 1で控えた値）
LIFF_BASE_URL=（STEP 1で控えた値）
LINE_CHANNEL_TOKEN=（LINE Developersから）
LINE_CHANNEL_SECRET=（LINE Developersから）
RAILS_ENV=production
CORS_ALLOWED_ORIGINS=（既存と同じVercelのURL）
RAILS_MAX_THREADS=2
```

---

## STEP 4：新サービスのデプロイ完了を確認する

1. Renderダッシュボードで「Deploy」が `Live` になるまで待つ
2. ヘルスチェックで疎通確認する

```
https://【新サービス名】.onrender.com/health
```

`{"status":"ok"}` が返れば準備完了。

---

## STEP 5：LINE WebhookのURLを切り替える

1. [LINE Developersコンソール](https://developers.line.biz/) を開く
2. チャネル → Messaging API設定 → Webhook URL を変更する

```
変更前：https://【旧サービス名】.onrender.com/webhooks/line
変更後：https://【新サービス名】.onrender.com/webhooks/line
```

3. 「検証」ボタンで接続確認する

---

## STEP 6：VercelのAPIエンドポイントURLを切り替える

1. [Vercelダッシュボード](https://vercel.com/) を開く
2. プロジェクト → Settings → Environment Variables
3. `NEXT_PUBLIC_RAILS_API_URL` の値を変更する

```
変更前：https://【旧サービス名】.onrender.com
変更後：https://【新サービス名】.onrender.com
```

4. Deploymentsタブから最新デプロイを「Redeploy」する（環境変数の反映に必要）

---

## STEP 7：動作確認

- [ ] LINEでメッセージを送信してWebhookが動作するか確認
- [ ] フロントエンドからAPIが呼び出せるか確認
- [ ] Renderダッシュボードのメトリクスでメモリが512MB以内か確認

---

## 補足：メモリ使用量の目安

`RAILS_MAX_THREADS=2` を設定することでPumaのスレッド数とDBコネクションプール数が両方2になり、デフォルト（5）より大幅に削減できる。

| 設定 | スレッド数 | DBプール | 目安メモリ |
|---|---|---|---|
| デフォルト（変更前） | 5 | 5 | 400〜500MB |
| シングルモード + threads=2 | 2 | 2 | 200〜300MB |
