# API設計

**作成日：** 2026-04-25  
**ステータス：** 草案

---

## 基本方針

- プレフィックス：`/api/v1`（認証・Webhookを除く）
- レスポンス形式：JSON
- 認証：JWTをAuthorizationヘッダーに付与（`Authorization: Bearer <token>`）
- JWT不要なエンドポイントは個別に記載

---

## エンドポイント一覧

### 認証

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| POST | `/auth/line` | LINEのIDトークンを検証してJWTを発行 | 不要 |

**リクエスト**
```json
{ "id_token": "LINEのIDトークン" }
```

**レスポンス**
```json
{ "token": "発行したJWT" }
```

---

### 家族グループ

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| POST | `/api/v1/groups` | グループ作成 | 必要 |
| POST | `/api/v1/groups/join` | 招待トークンでグループ参加 | 必要 |

**POST /api/v1/groups リクエスト**
```json
{ "name": "柴田家" }
```

**POST /api/v1/groups/join リクエスト**
```json
{ "invite_token": "xxx" }
```

---

### 犬

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| POST | `/api/v1/dogs` | 犬を登録（アラート設定も自動生成） | 必要 |
| GET | `/api/v1/dogs/:id` | 犬の情報取得 | 必要 |

**POST /api/v1/dogs リクエスト**
```json
{ "name": "まる", "birth_date": "2022-05-01" }
```

---

### ケア記録

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| POST | `/api/v1/dogs/:dog_id/care_records` | 記録を登録 | 必要 |
| GET | `/api/v1/dogs/:dog_id/care_records` | タイムライン取得 | 必要 |

**POST リクエスト**
```json
{ "care_type": "meal", "recorded_at": "2026-04-25T12:00:00+09:00" }
```

> `care_type` は `meal` / `walk` / `toilet` のいずれか

---

### アラート設定

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| GET | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を取得 | 必要 |
| PATCH | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を変更 | 必要 |

> 犬を作成した時点でデフォルト値（`interval_hours: 4`）で自動生成される

**PATCH リクエスト**
```json
{ "interval_hours": 6 }
```

---

### LINE Webhook

| メソッド | パス | 説明 | JWT |
|---|---|---|---|
| POST | `/webhooks/line` | LINEからのイベント受信 | 不要 |

> LINE Channel Secretで署名検証を行う

---

## v2以降

- `GET /api/v1/dogs/:dog_id/care_records` にページネーション追加
- 外部ブラウザからのLINE OAuthログイン対応
