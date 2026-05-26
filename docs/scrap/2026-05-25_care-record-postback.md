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

### なぜ `CARE_TYPE_LABELS` をコントローラーに置いたか

LINEへの返信メッセージ用の表示名なので「LINE通知のための文字列」という性質上コントローラーに置いた。
モデルに置くと「DBの値」と「表示用文字列」が混在する違和感があった。

フロントバック分離構成の場合、同じラベルが2箇所に存在することになる：

| ルート | ラベルの持ち主 |
|---|---|
| LIFF画面（Next.js）→ Rails API | フロント（Next.js）が持つ |
| LINEリッチメニュー → Rails Webhook | Rails が持つ |

Railsモノリスなら `I18n`（`ja.yml`）で一元管理できるが、分離構成では重複はやむを得ない。
→ **フロントバック分離のトレードオフ**として許容。

### なぜサービスオブジェクトに切り出さなかったか

`handle_postback` の責務は「犬の特定 + レコード作成 + LINE返信」とやや多いが、今の規模では1メソッドに収まる範囲。
「シンプルに動くものを先に作る、複雑になったら切り出す」というRailsの哲学に沿って今回はコントローラーに留めた。

将来アラートチェックや通知種類が増えたら `CareRecordCreator` のようなサービスオブジェクトへの切り出しを検討する。

### User#dogs をメソッドで定義した理由

`User has_many :dogs` は直接書けない（中間に groups がある）。  
`has_many :dogs, through: :groups` は `has_many :groups, through: :group_members` の先のため、  
ActiveRecordのthrough-through（二段）はサポートされない。  
→ `joins(group: :group_members).where(...)` で明示的にSQLを書くのが素直。

---

## 言語化チェックリスト

- [x] `recorded_at` と `created_at` をなぜ分けるか説明できるか？
  - 記録日時と作成日時は別物。後付け記録（記録忘れ）に対応するため分けている。タイムライン表示・アラート計算は `recorded_at` を基準にする。

- [x] `group_members` の複合ユニーク制約がなぜ必要か説明できるか？
  - 同じユーザーが同じグループに二重登録されることを防ぐため。`user_id` だけにユニーク制約をかけると1ユーザーが1グループにしか入れなくなるので、`(group_id, user_id)` の組み合わせに制約をかける。

- [x] Postbackのdata文字列をどうパースしているか説明できるか？
  - `Rack::Utils.parse_query` でクエリ文字列（`"care_type=pee&dog_id=1"`）をRubyのハッシュ（`{ "care_type" => "pee", "dog_id" => "1" }`）に変換している。

- [x] 多頭飼いのQuick Replyでcare_typeを引き継ぐ仕組みを説明できるか？
  - Quick Replyのボタンを作るときに `"care_type=#{care_type}&dog_id=#{dog.id}"` と care_type を data に埋め込んでいる。犬を選んだ後のpostbackに両方が含まれた状態で来る。

- [x] User#dogsがメソッド定義になった理由（has_many through-throughの制限）を説明できるか？
  - User→groups→dogsと2段経由が必要だが、ActiveRecordのthrough-through（二段）はサポートされない。`joins(group: :group_members).where(...)` で明示的にSQLを書くことで対応した。

- [x] `CareRecord::CARE_TYPES` を enum にしなかった理由を説明できるか？
  - DBに整数で保存されると直接見たとき意味が分かりにくい。またcare_typeはステータス変更操作が不要なので `pee?` / `pee!` のようなenumの便利メソッドが不要。定数＋inclusionバリデーションの方がシンプル。

- [x] `CARE_TYPE_LABELS` をコントローラーに置いた理由と、フロントバック分離構成でのトレードオフを説明できるか？
  - LINEへの返信用の表示名なのでモデル（DBの値）ではなくコントローラーに置いた。フロントバック分離構成では同じラベルがRails（Webhook返信用）とNext.js（画面表示用）の2箇所に存在するトレードオフがある。Railsモノリスなら `I18n`（`ja.yml`）で一元管理できるが分離構成ではやむを得ない。

- [x] サービスオブジェクトに切り出さなかった理由と、切り出すべき判断基準を説明できるか？
  - MVP段階で今の規模では1メソッドに収まるため。「シンプルに動くものを先に作る、複雑になったら切り出す」というRailsの哲学に沿った判断。アラートや通知種類が増えたタイミングで `CareRecordCreator` のようなサービスオブジェクトへの切り出しを検討する。
