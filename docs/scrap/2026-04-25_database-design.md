# DB設計の議論ログ

**日付：** 2026-04-25  
**テーマ：** テーブル設計・リレーション・設計判断の根拠

---

## 決定事項まとめ

### テーブル構成（v1）

| テーブル | 役割 |
|---|---|
| users | LINEユーザー（line_user_id保持） |
| groups | 家族グループ（招待トークン保持） |
| group_members | users ↔ groups の中間テーブル |
| dogs | 犬の情報（グループに所属） |
| care_records | お世話記録（食事・排泄・散歩） |
| alert_settings | 排泄アラートの時間設定（犬ごと） |

### group_membersで多対多にした理由
- 1ユーザーが複数グループに所属できる構造が必要だったため
- ユースケース：実家グループ＋嫁ぎ先グループに同一ユーザーが所属するケース
- (group_id, user_id) のunique制約で二重登録を防ぐ
- 「今は1家族しか使わない」という想定でも、後から変更が入らないようBで設計

### group_membersのレコードイメージ

```
| id | group_id | user_id | role   |
|----|----------|---------|--------|
| 1  | 1        | 1       | owner  |  ← 実家グループ
| 2  | 2        | 1       | member |  ← 嫁ぎ先グループ
```

ユーザー1が2グループに所属 = 2レコード。

### dogsテーブルをgroupsと分けた理由
- 多頭飼い対応（1グループ内に複数の犬）
- group → dogs を1:多にすることでカバー

### care_recordsの設計方針
- `care_type` はenum（meal / walk / toilet）でDB整合性を担保
- 自由記入はv2で別テーブル（`family_notes`）に分離する予定
  - care_records = 構造化された記録（アラートやタイムラインの検索対象）
  - family_notes = 連絡事項・自由記入（検索対象外）
- `recorded_at` と `created_at` を分離：後付け記録を正確に扱うため

### alert_settingsの設計方針
- 犬ごと・care_typeごとに設定（v1はtoiletのみ）
- (dog_id, care_type) のunique制約で1犬1設定を保証
- interval_hours のデフォルト値：4時間

---

## 却下した案と理由

| 案 | 却下理由 |
|---|---|
| care_recordsにメモ列を追加 | 結合が増える・care_recordsの役割が曖昧になる |
| 1ユーザー = 1グループに絞る（v1） | 後から変更コストが発生する・中間テーブルで対応できるため |

---

## 言語化チェックリスト

- [ ] なぜgroupsとdogsを分けたか説明できるか

- [ ] group_membersが中間テーブルである理由・レコードのイメージを説明できるか

- [ ] care_recordsのcare_typeをenumにした理由を説明できるか

- [ ] `recorded_at` と `created_at` を分けた理由を説明できるか

- [ ] alert_settingsに (dog_id, care_type) のunique制約を置いた意図を説明できるか

- [ ] 自由記入をcare_recordsに含めずv2の別テーブルにした理由を説明できるか
