# LINE Bot設計

**作成日：** 2026-04-25  
**ステータス：** 草案

---

## 基本方針

- ボタン操作だけで記録できることが最優先
- ボタン押す = 今の記録（recorded_at = now）
- 過去の記録・修正はLIFFタイムラインから行う

---

## リッチメニュー

トーク画面下部に固定表示される6ボタン構成。

```
┌─────────┬─────────┬─────────┐
│おしっこ │ うんち  │  散歩   │
├─────────┼─────────┼─────────┤
│ごはん   │状態確認 │タイムライン│
└─────────┴─────────┴─────────┘
```

| ボタン | 動作 |
|---|---|
| おしっこ | 即記録（recorded_at = now） |
| うんち | 即記録（recorded_at = now） |
| ごはん | 即記録（recorded_at = now） |
| 散歩 | Quick Reply → [ショート][ロング] → 即記録 |
| 状態確認 | Flex MessageでDBの最新状態を返信 |
| タイムライン | LIFFを開く（`/timeline`） |

---

## 状態確認 Flex Message

状態確認ボタンタップ時にBotが返すカード。

```
┌─────────────────────────┐
│ まる の状態              │
├─────────────────────────┤
│ 💧 おしっこ   2時間前   │
│ 💩 うんち     5時間前 ⚠️│
│ 🦴 散歩       今日2回   │
│ 🍚 ごはん     12:00     │
├─────────────────────────┤
│      [記録を修正する]    │
└─────────────────────────┘
```

- `recorded_at` をもとにサーバー側で計算して返す
- 排泄がアラート設定時間を超えたら ⚠️ を表示
- [記録を修正する] → LIFFの `/timeline` を開く

---

## Botの返信メッセージ

### 記録完了時

```
おしっこを記録しました 🐾
14:30
```

### 散歩 Quick Reply

```
Bot：「どちらのコースでしたか？」
     [ショートコース] [ロングコース]
```

---

## 過去の記録・修正

- Botでは扱わない
- LIFFの `/timeline` から編集・削除

---

## Webhookイベント処理フロー

```
POST /webhooks/line
  ↓
署名検証（X-Line-Signature + Channel Secret）
  ↓
eventsをループ
  ├── follow   → ユーザー作成 + セットアップリンク送信
  ├── postback → postback.dataで処理を分岐
  └── message  → 「ボタンからご記録ください」返信
```

### follow イベント

```
follow
  ↓
LINE APIでプロフィール取得（display_name・picture_url）
  ↓
users: find_or_create(line_user_id)
  ↓
セットアップリンク返信（/setup LIFF URL）
```

### postback イベント

```
postback.dataをパース
  │
  ├── action=walk_select
  │     → Quick Reply返信
  │       [ショートコース: care_type=walk_short]
  │       [ロングコース:   care_type=walk_long]
  │
  ├── action=status
  │     → 犬を特定
  │     → 各care_typeの最新recorded_atを取得
  │     → alert_settingsと比較して⚠️判定
  │     → Flex Message返信
  │
  └── care_type=pee/poop/meal/walk_short/walk_long
        ↓
        犬を特定
          ├── 1犬 → dog_id確定
          └── 複数犬かつdog_idなし
                → Quick Reply返信
                  [まる:   care_type=pee&dog_id=1]
                  [こむぎ: care_type=pee&dog_id=2]
        ↓
        care_record作成（recorded_at=now）
        ↓
        「おしっこを記録しました 🐾（14:30）」返信
```

**postback.dataの形式**

| ボタン | data |
|---|---|
| おしっこ | `care_type=pee` |
| うんち | `care_type=poop` |
| ごはん | `care_type=meal` |
| 散歩 | `action=walk_select` |
| ショートコース | `care_type=walk_short` |
| ロングコース | `care_type=walk_long` |
| 状態確認 | `action=status` |
| 犬選択（複数犬時） | `care_type=pee&dog_id=1` |

---

## v2以降

- Flex Messageのカードから直接記録できるボタンを追加
