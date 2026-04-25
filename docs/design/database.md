# DB設計

**作成日：** 2026-04-25  
**ステータス：** 草案

---

## テーブル一覧

### users

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| line_user_id | string | NOT NULL, UNIQUE | LINE User ID |
| display_name | string | NOT NULL | LINE表示名 |
| picture_url | string | | LINEプロフィール画像URL |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

---

### groups

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| name | string | NOT NULL | グループ名（例：柴田家） |
| invite_token | string | NOT NULL, UNIQUE | 招待URL用トークン |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

---

### group_members

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| group_id | bigint | NOT NULL, FK → groups | |
| user_id | bigint | NOT NULL, FK → users | |
| role | string | NOT NULL | enum: owner / member |
| joined_at | datetime | NOT NULL | |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

**ユニーク制約：** `(group_id, user_id)`

> 1ユーザーが複数グループに所属できる（多頭飼い・複数家族対応）。  
> 同じグループに同じユーザーが二重登録されることを防ぐ。

---

### dogs

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| group_id | bigint | NOT NULL, FK → groups | |
| name | string | NOT NULL | 犬の名前 |
| birth_date | date | | 生年月日 |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

---

### care_records

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| dog_id | bigint | NOT NULL, FK → dogs | |
| user_id | bigint | NOT NULL, FK → users | 記録したユーザー |
| type | string | NOT NULL, DEFAULT "CareRecord" | STI識別子（CareRecord / Post） |
| care_type | string | NOT NULL（Postの場合はNULL可） | enum: meal / walk_short / walk_long / pee / poop |
| recorded_at | datetime | NOT NULL | 実際に世話した時刻 |
| content | text | | （v2）Postの呟きテキスト |
| photo_url | string | | （v2）Postの写真URL |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

> `recorded_at` と `created_at` を分離している理由：後付け記録（「さっきトイレ行ったの忘れてた」）を正確に扱うため。  
> アラート・タイムライン表示は `recorded_at` を基準にする。
>
> `type` カラムはRails STI用。v1は常に "CareRecord"。v2で "Post"（呟き＋写真）を追加。

---

### alert_settings

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | bigint | PK | |
| dog_id | bigint | NOT NULL, FK → dogs | |
| care_type | string | NOT NULL | enum: pee / poop |
| interval_hours | integer | NOT NULL, DEFAULT 4 | アラートまでの時間（時） |
| created_at | datetime | NOT NULL | |
| updated_at | datetime | NOT NULL | |

**ユニーク制約：** `(dog_id, care_type)`

---

## リレーション図

```
users ──< group_members >── groups ──< dogs ──< care_records
                                          └──< alert_settings
```

- `group_members` で users と groups を多対多
- 1グループに複数の犬（多頭飼い対応）
- care_records・alert_settings は犬ごとに管理

---

## v2以降

- `care_records` に `content`・`photo_url` を追加（Postタイプ：呟き＋写真）
- `care_records.type = "Post"` で呟き・写真投稿をタイムラインに混在させる
- `groups` にコンテンツ公開設定を追加（犬友への閲覧専用公開）
