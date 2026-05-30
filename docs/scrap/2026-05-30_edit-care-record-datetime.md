# 編集ダイアログに記録日時変更を追加

**日付：** 2026-05-30

---

## 何をしたか

タイムライン画面の編集ボタン（鉛筆アイコン）を押したときに開くダイアログに、記録日時（`recorded_at`）の変更フィールドを追加した。

**修正前の問題：** 編集ダイアログはケアの種類（おしっこ・ごはん等）しか変更できなかった。

**修正後：** 記録日時とケアの種類の両方を変更できる。

---

## 変更の内容

### データフローの修正

`TimelineEntry` 型に `recorded_at: string` を追加し、`toTimelineEntry()` で `CareRecord.recorded_at` をそのまま引き継ぐようにした。

```
CareRecord.recorded_at (ISO 8601)
  → TimelineEntry.recorded_at
    → editTarget.recorded_at
      → API: PATCH /api/v1/care_records/:id { care_type, recorded_at }
```

以前は `TimelineEntry` に `time`（表示用フォーマット済み文字列）しかなく、編集時に元の日時情報にアクセスできない状態だった。

### `editTarget` の型変更

```ts
// before
{ id: string; care_type: string }

// after
{ id: string; care_type: string; recorded_at: string }
```

### `datetime-local` 入力と ISO 8601 の変換

ブラウザの `<input type="datetime-local">` は `YYYY-MM-DDTHH:mm` 形式を要求するが、APIから返ってくる `recorded_at` は ISO 8601（`2026-05-30T08:00:00.000Z` 等）。

変換のために `toDatetimeLocalValue()` ヘルパーを追加した。

```ts
function toDatetimeLocalValue(isoOrLocal: string): string {
  const d = new Date(isoOrLocal)
  // ローカル時刻（端末のタイムゾーン）でフォーマット
  return `YYYY-MM-DDTHH:mm`
}
```

**注意点：** `new Date(isoString)` はUTC基準でパースし、`d.getHours()` 等はローカル時刻を返す。日本時間（JST = UTC+9）環境では正しく表示される。保存時も `new Date(editTarget.recorded_at).toISOString()` でUTCに戻してからAPIに渡している。

---

## 言語化チェックリスト

- [ ] `datetime-local` と ISO 8601 の変換で、なぜローカル時刻を使うのか説明できるか
- [ ] `handleUpdate` が引数なしになった理由（state から全部取れるから）を説明できるか
- [ ] `toTimelineEntry` に `recorded_at` を追加しなければならなかった理由を説明できるか（表示用の `time` では元情報が欠落するから）
