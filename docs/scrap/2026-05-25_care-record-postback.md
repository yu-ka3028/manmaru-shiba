# 作業ログ：ケア記録（ボタン→DB） #21

**作成日：** 2026-05-25

---

## やったこと

LINEリッチメニューのボタンタップでケア記録をDBに保存する機能を実装した。

### 追加したテーブル

| テーブル | 役割 |
|---|---|
| groups | 家族グループ |
| group_members | ユーザーとグループの中間テーブル（多対多） |
| dogs | 犬（グループに所属） |
| care_records | ケア記録（犬ごと・ユーザーごと） |
| alert_settings | アラート設定（犬・care_typeごと） |

### Postbackフロー

```
[おしっこ] → postback: care_type=pee
  → 1犬 → 記録 → 「まる：おしっこを記録しました（HH:MM）🐾」
  → 多頭 → Quick Reply: [まる: care_type=pee&dog_id=1] [こむぎ: care_type=pee&dog_id=2]

[散歩] → postback: action=walk_select
  → Quick Reply: [ショートコース: care_type=walk_short] [ロングコース: care_type=walk_long]
  → care_type確定後 → 1犬/多頭の分岐
```

### postback.dataのパース方法

`Rack::Utils.parse_query` を使ってクエリ文字列形式でパース。

```ruby
data = Rack::Utils.parse_query("care_type=pee&dog_id=1")
# => { "care_type" => "pee", "dog_id" => "1" }
```

---

## 設計判断のメモ

### なぜ `recorded_at` と `created_at` を分けたか

後付け記録（「さっきトイレ行ったの忘れてた」）に対応するため。  
タイムライン表示・アラート計算は `recorded_at` を基準にする。  
今回のMVPでは `Time.current` を入れるが、将来的にユーザーが時刻を選べる。

### なぜ `care_type` を enum ではなく string + CARE_TYPES 定数にしたか

Railsの `enum` は整数マッピングが基本で、DBに文字列を保存したい場合に設定が煩雑になる。  
`CARE_TYPES = %w[...].freeze` + `inclusion` バリデーションの方がシンプルで読みやすい。

### User#dogs をメソッドで定義した理由

`User has_many :dogs` は直接書けない（中間に groups がある）。  
`has_many :dogs, through: :groups` は `has_many :groups, through: :group_members` の先のため、  
ActiveRecordのthrough-through（二段）はサポートされない。  
→ `joins(group: :group_members).where(...)` で明示的にSQLを書くのが素直。

---

## 言語化チェックリスト

- [ ] `recorded_at` と `created_at` をなぜ分けるか説明できるか？
- [ ] `group_members` の複合ユニーク制約がなぜ必要か説明できるか？
- [ ] Postbackのdata文字列をどうパースしているか説明できるか？
- [ ] 多頭飼いのQuick Replyでcare_typeを引き継ぐ仕組みを説明できるか？
- [ ] User#dogsがメソッド定義になった理由（has_many through-throughの制限）を説明できるか？
- [ ] `CareRecord::CARE_TYPES` を enum にしなかった理由を説明できるか？
