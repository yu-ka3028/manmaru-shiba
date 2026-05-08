# Rails ActiveRecord パターン・DB設計レビュー

## 概略

昨日の Rails 設計哲学・DDD 対比の続き。現在の DB 設計（database.md）を題材に、前提知識の確認と設計上の論点を整理した。

主なテーマ：STI・DDD の Aggregate・外部キー制約と CASCADE・ポリモーフィック関連アンチパターン・Rails コールバックの仕組み・enum の型安全。

---

## 作業ログ

### STI（Single Table Inheritance）

1つのテーブルに型の異なるレコードを混在させるパターン。`type` カラムで Rails がクラスを判別する。

```
care_records テーブル
| id | type       | care_type | content      | photo_url |
|----|------------|-----------|--------------|-----------|
| 1  | CareRecord | pee       | NULL         | NULL      |
| 2  | CareRecord | meal      | NULL         | NULL      |
| 3  | Post       | NULL      | "今日も元気！" | "url"    |
```

```ruby
class CareRecord < ApplicationRecord; end
class Post < CareRecord; end  # Post は CareRecord を継承

dog.care_records  # → CareRecord も Post も両方返る（1クエリでタイムライン取得可能）
```

**STI のトレードオフ：**

| メリット | デメリット |
|---|---|
| 1クエリでタイムライン取得 | NULL だらけのカラムが増える |
| Rails の慣用パターン通り | DB 制約が弱くなる（care_type NOT NULL を置けない） |

「NULL だらけのカラム」は DB の負債。テーブルの意味が曖昧になり、インデックス効率も落ちる。

**v1 は Post が存在しないので問題なし。v2 で Post を追加するとき「STI のまま」か「posts テーブルを分けて UNION」かを選ぶ。**

---

### DDD の Aggregate と ActiveRecord の違い

外部キー制約（DB の機能）はどちらの設計でも同じように存在する。違いはアプリ層のルール。

```
DDD の Aggregate
  Dog（Aggregate Root）
    └── AlertSetting（Aggregate 内の Entity）

「AlertSetting は Dog Aggregate を経由してのみ操作する」というルールをアプリコードで強制する
```

```java
// DDD
class DogApplicationService {
  void registerDog(DogDto dto) {
    Dog dog = new Dog(dto);
    dog.addAlertSetting(CareType.PEE, 4);  // Dog 経由でのみ
    dogRepository.save(dog);
    // alertSettingRepository.create(...) は直接呼ばない
  }
}
```

```ruby
# ActiveRecord（Rails）
# どこからでも AlertSetting を直接操作できる
class Dog < ApplicationRecord
  after_create :create_default_alert_settings

  def create_default_alert_settings
    AlertSetting.create!(dog: self, care_type: 'pee', interval_hours: 4)
  end
end
```

| | DB 外部キー | アプリ層のルール |
|---|---|---|
| ActiveRecord | あり | なし（どこからでも直接操作できる） |
| DDD | あり | あり（Aggregate 経由でのみ操作する） |

**Rails を選ぶ理由：** 柴犬のお世話記録というシンプルなドメインでは DB の外部キー制約だけで整合性が取れる。Aggregate 境界を設計するコストのメリットが出ない。

---

### CASCADE（外部キー制約のオプション）

親レコードを削除したとき、子レコードをどうするかを定義する：

| オプション | 動き |
|---|---|
| `ON DELETE CASCADE` | 親を削除したら子も一緒に削除 |
| `ON DELETE RESTRICT` | 子が存在する場合は親を削除できない（デフォルト） |
| `ON DELETE SET NULL` | 親を削除したら子の外部キーを NULL にする |

---

### ポリモーフィック関連アンチパターン

タイムライン表示のために中間テーブルを作るとこうなる：

```
timeline_items
  item_type  ("CareRecord" or "Post")
  item_id    → どちらのテーブルを指すかは item_type 次第
```

`item_id` の参照先がテーブルによって変わるため、DB が外部キー制約を貼れない。  
→ 参照先レコードが削除されても CASCADE が走らない  
→ 参照先のない孤立レコードが残る

**「別テーブル + UNION」が正しい選択肢。中間テーブルは最悪。**

| 方法 | NULL 問題 | タイムライン取得 | 外部キー制約 |
|---|---|---|---|
| STI（同じテーブル） | あり | 1クエリ | 使える |
| 別テーブル + UNION | なし | UNION or 2クエリ | 使える |
| 中間テーブル（ポリモーフィック） | なし | 複雑 | **使えない** |

---

### Rails コールバックの仕組み

Rails コールバックはライフサイクルフック。DB 操作の前後に処理を挟む。

```
Dog.create! を呼ぶ
  → before_validation → after_validation
  → before_save → before_create
  → DB に INSERT
  → after_create ← ここでコールバックが走る
  → after_save
```

コールバックに渡せるものは 3 種類：

```ruby
after_create :create_default_alert_settings  # ① シンボル（メソッド名）← 一番よく使う
after_create { |dog| AlertSetting.create!(dog: dog) }  # ② ブロック
after_create AlertSettingInitializer         # ③ クラス
```

**JS との対比：**

```javascript
// JS：渡せるのは「関数」のみ
setTimeout(() => console.log('done'), 1000);
```

```ruby
# Rails：シンボル・ブロック・クラスを渡せる
after_create :method_name  # シンボルでメソッド名を渡す
```

`after_create :method_name` → Rails が `self.send(:method_name)` を呼ぶ。そのメソッドの中で AlertSetting など他クラスを自由に操作できる。

**コントローラー層との違い：**

| callback | 層 | ライフサイクル |
|---|---|---|
| `after_create`, `before_save` | モデル層（ActiveRecord） | DB 操作の前後 |
| `before_action`, `after_action` | コントローラー層（ActionController） | HTTP リクエストの前後 |

どちらも別クラスを操作できるが、タイミングが異なる。Rails フレームワーク本体の機能（外部 Gem 不要）。

---

### Rails enum の型安全

```ruby
class AlertSetting < ApplicationRecord
  enum care_type: { pee: 0, poop: 1 }
  # DB には整数（0, 1）で保存。Rails が文字列との変換を担当
end

AlertSetting.new(care_type: 'invalid')
# => ArgumentError: 'invalid' is not a valid care_type

AlertSetting.where(care_type: :pee)
# => WHERE care_type = 0
```

「Rails を経由する限り型安全」が正確な表現。生 SQL での直接操作には DB 側の check constraint が必要。

```ruby
# migration で check constraint を追加（完全な型安全のため）
add_check_constraint :alert_settings, "care_type IN (0, 1)", name: "care_type_check"
```

---

### alert_settings の care_type 設計（pee/poop のみ）

`care_records.care_type` と `alert_settings.care_type` は役割が違うため、値セットが異なって当然：

```ruby
# care_records.care_type：「何をしたか」の記録
enum care_type: { meal: 0, walk_short: 1, walk_long: 2, pee: 3, poop: 4 }

# alert_settings.care_type：「アラートを出す対象」
enum care_type: { pee: 0, poop: 1 }
```

| care_type | 主目的 | アラートの性質 |
|---|---|---|
| pee / poop | 最後から何時間経ったか | ◎ interval_hours で自然に表現できる |
| meal / walk | 何時にやったかの記録 | △ 「今日やったか」の方が自然 |

meal と walk は care_records に記録してタイムラインに表示するが、alert_settings には入れない。これが v1 として正しい設計判断。

ワクチン・健診などの定期イベントは care_type とは性質が異なる → v2 以降の health_events テーブルで対応。

---

## 言語化チェックリスト

### STI

- [x] STI とは何か。「1つのテーブル・複数クラス」の構造を具体例で説明できるか

  1つのテーブルに `type` カラムで複数クラスをRailsが判別する設計。継承関係のクラスを1クエリで取得できるのでタイムライン表示に向いている。コールバックはSTI固有の話ではない。

- [x] STI のトレードオフ（1クエリで取れる vs NULL だらけ・DB 制約が弱くなる）を説明できるか

  1クエリで複数クラスを取れるが、使わないカラムにNULLが入りDB制約が弱くなる。`care_type` に `NOT NULL` を置きたくてもPostレコードでNULLになるため置けない。

- [x] v2 で Post を追加するとき「STI のまま」と「別テーブル + UNION」のどちらを選ぶか、理由付きで説明できるか

  別テーブル+UNIONを選択。NULLだらけのカラムとDB制約の弱さを避けるため。UNIONのパフォーマンスコストはレコード数が増えたときに考える。

### DDD の Aggregate と ActiveRecord の違い

- [x] 外部キー制約は DDD でも ActiveRecord でも存在する。では「何が違うか」を一言で言えるか

  アプリ層のルール。ActiveRecordはどこからでも直接操作できる。DDDはAggregate Rootを経由してのみ操作するルールをコードで強制する。

- [x] Aggregate の「整合性の境界」が何を意味するか具体例で説明できるか

  そのまとまりの中のビジネスルールが常に守られることを保証する範囲。Aggregate Rootを経由することでルールのチェックを強制できる。ActiveRecordではバリデーションやユニーク制約（`(dog_id, care_type)` の組み合わせ重複禁止など）がモデル層で同様の役割を担う。

- [x] このプロジェクトで Aggregate を使わない理由を「ドメインの複雑さ・DB 制約で十分」で説明できるか

  柴犬のお世話記録というシンプルなドメインで開発者も1人。AlertSettingの整合性はユニーク制約と外部キー制約でDBレベルで保証できる。Aggregate境界をコードで強制するコストのメリットが出ない。

### CASCADE と外部キー制約

- [x] `ON DELETE CASCADE` が何をするか説明できるか

  親レコードを削除したとき、紐づく子レコードを自動的に一緒に削除する。外部キー制約のオプションとして設定する。外部キー制約がないとDBはテーブル間の親子関係を知らないのでCASCADEも機能しない。

- [x] ポリモーフィック関連で CASCADE が機能しない理由を説明できるか

  ポリモーフィック中間テーブルは `item_type` で参照先テーブルが変わるため、DBが外部キー制約を固定で定義できない。その結果CASCADEも機能せず、親レコードを削除しても子レコードが残り続ける孤立レコードが発生する。

### Rails コールバック

- [x] `after_create` のライフサイクル上の位置（どのタイミングで走るか）を説明できるか

  DBへのINSERT処理が完了した直後に走る。このプロジェクトではDogのINSERT後にAlertSettingを自動生成するために使っている。

- [x] Rails コールバックに渡せる 3 種類（シンボル・ブロック・クラス）を説明できるか

  シンボル（メソッド名を渡す・一番よく使う）、ブロック（短い処理をその場に書く）、クラス（複数モデルで再利用したいとき）。

- [x] JS のコールバック（関数を渡す）と Rails のコールバック（シンボル等を渡す）の違いを説明できるか

  JSは関数のみ渡せる。Railsはシンボル（メソッド名）・ブロック・クラスの3種類を渡せる。シンボルを渡すとRailsが内部で `self.send(:method_name)` でそのメソッドを呼び出す。

- [x] `after_create`（モデル層）と `before_action`（コントローラー層）の使い分けを説明できるか

  `after_create` はDB操作（INSERT）の後、`before_action` はHTTPリクエストの前後に走る。このプロジェクトでは `before_action` はLIFFのトークン検証に使う場面が出てくる。

### enum の型安全

- [x] Rails の `enum` が型安全を担保する仕組み（ArgumentError）を説明できるか

  enumで定義した値以外を入れようとするとRailsがArgumentErrorを投げて弾く。DBに到達する前にアプリ層で型安全を担保する仕組み。

- [x] 「Rails を経由する限り型安全」が正確な表現である理由を説明できるか

  enumの型安全はRailsのArgumentErrorによるもの。生SQLで直接操作するとRailsのチェックが入らないため不正な値が入ってしまう。完全な型安全のためにはDBのcheck constraintも合わせて追加する必要がある。

### alert_settings の設計判断

- [x] meal / walk を alert_settings に含めない理由を「アラートの性質が違う」で説明できるか

  pee/poopは「最後から何時間経ったか」でアラートを出す性質なのでinterval_hoursと相性が良い。meal/walkは「今日やったか」の確認が主目的で時間間隔のアラートとは性質が違うためalert_settingsには含めない。interval_hoursはプロジェクト独自のカラム名（標準ライブラリではない）。

- [x] `care_records.care_type` と `alert_settings.care_type` の値セットが異なる理由を説明できるか

  `care_records.care_type` は「何をしたか」の記録なので全種類（meal / walk_short / walk_long / pee / poop）。`alert_settings.care_type` は「時間間隔でアラートを出す対象」なのでpee/poopのみ。同じカラム名でも役割が違うから値セットが異なって当然。

