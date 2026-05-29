# まんまる柴 設計スクラップ集「設計のなぜ」
## NotebookLM用 全スクラップまとめ

このドキュメントは「まんまる柴（柴犬のお世話共有アプリ）」の個人開発において、
Java/SpringBoot経験者がRuby on Railsで設計・実装する過程で得た気づきと判断を記録したものです。
「なぜその技術・設計を選んだのか」という問いを軸に、全設計判断をまとめています。

---


---

# Rails の設計哲学・DDD を選ばない理由・テスト戦略

## 概略

Java でバックエンド開発を経験してから Rails に返ってみると、「なぜ DDD じゃないのか」「なぜ DB 単体でテストするのか」という疑問が生まれた。

**Rails は Active Record パターンを選んだ。**
これだけで、DDD を選ばない理由もテスト戦略も、ほぼ全部説明できる。

Active Record はドメインロジックと DB ロジックを「あえて混ぜる」設計。
混ぜることで開発速度が上がり、DB ごとテストすることで Mock の嘘が入らない。
これは「実装者を信頼できる小規模チーム」「速く動かすことが競合との差になる SaaS」に最適化された選択と認識。

Java が DDD・Mock・段階的テストを選んだのは「信頼できる規模ではない大規模チーム」への対応であり、どちらが正しいかではなく、チーム規模とドメインの複雑さで最適解が変わる話と認識。

---

## 作業ログ

### Rails の設計哲学

Rails は以下の原則を中心に設計されている。

- **Active Record パターン**：モデル = DB テーブルのマッピング。ドメインロジックと DB ロジックを一体にする
- **Convention over Configuration**：設定より規約。考えることを減らす
- **DHH の哲学**：「プログラマーを子ども扱いするな。鋭いナイフを渡して、使い方を信頼しろ」

Rails Doctrine の関連原則：
- "No one paradigm"：DDD のような特定手法を教条的に適用しない
- "Value integrated systems"：各層を厳密に分離するより全体が一体として動くことを重視
- "Provide sharp knives"：危険でも表現力のある道具を渡す。Java が封じていたものを開放する

### Ruby が「黒魔術」と呼ばれる理由

Java は言語レベルでプログラマーを保護する（静的型付け、チェック例外、アクセス修飾子、インターフェース強制）。
Ruby はこれを全部開放している。

```ruby
# 組み込みクラスに後からメソッドを追加できる（オープンクラス）
class String
  def blank?
    strip.empty?
  end
end

# Rails が String に追加した実例
"".blank?        # => true
"hello".present? # => true
"dog".pluralize  # => "dogs"（テーブル名の自動解決に使われる）
```

これが「黒魔術」と呼ばれる由来。誰でも・どこでも上書きできるため衝突リスクもある。
DHH はこれを「表現力」と捉え、Java が「保護」として封じていたものを信頼して渡した。

### Java との対比で見る DDD

Java で DDD が発展した背景：
- Java は「構造を強制する」哲学（インターフェース、アクセス修飾子、設計パターン強制）
- DDD の Repository パターン・層の分離と相性が良い
- 大規模チームで「誰かのコードが誰かを壊さない」ための構造として機能する

### Active Record vs Repository パターン

```ruby
# Active Record：モデル自身が DB に話しかける
dog = Dog.find(1)    # Dog クラスが SQL を発行
dog.name = "Shiba"
dog.save             # Dog インスタンスが INSERT を発行
```

```java
// DDD（Repository パターン）：DB への話しかけは別クラスが担う
Dog dog = dogRepository.findById(1);  // Repository が SQL を発行
dog.setName("Shiba");                 // Dog は DB を知らない
dogRepository.save(dog);              // Repository が INSERT を発行
```

**SQL を書かなくて済む理由は ORM（どちらも同じ）。**
違いは「誰が DB に話しかけるか」＝ドメインオブジェクトが DB を知っているかどうか。

### テスト戦略の違い

Active Record が「混ぜる」選択をしたことで、テスト戦略も決まった。

```
DDD を選ぶ
　→ ドメインと DB が分離される
　→ ドメインの純粋な単体テスト層が作れる（DB なし）
　→ Mock で Repository を差し替えてテストする

Active Record を選ぶ（Rails）
　→ ドメインと DB が混在する
　→ 「DB なし！」と言い張ることが構造的にできない
　→ DB ごとテストする方が素直
　→ しかもその方が信頼できる（DHH の主張）
```

Rails のテスト階層：

| レイヤー | 内容 | Java での相当 |
|---|---|---|
| Model spec | モデルのバリデーション・メソッド | 単体テスト |
| Request spec | エンドポイント全体（ルーティング→レスポンス） | 結合テスト |
| System spec | ブラウザ操作を含む E2E | 機能テスト |

**このプロジェクト（API only）は Model spec + Request spec が中心。System spec は Next.js 側が担う。**

### DHH「TDD is dead」論争（2014年）

きっかけ：RailsConf 2014 での DHH 基調講演。
参加者：DHH・Martin Fowler・Kent Beck の三者公開討論。
一次ソース：[Is TDD Dead? — martinfowler.com](https://martinfowler.com/articles/is-tdd-dead/)

DHH の主張の核心：
- **test-induced damage**（テストに誘発される設計の歪み）：Mock で差し替えるために Repository を作るのは、テストのために設計を歪めている
- Mock は「本物の DB が正しく動くという仮定」の上に成立する。DB ごとテストすれば仮定ごと検証できる
- 単体テスト・結合テストを厳密に分ける必要はない

Kent Beck の立場：「トレードオフの話であって、どちらが正解かではない」

### SaaS への適性

Java の段階的テスト・DDD の厳密な層分けは「信頼できない規模（大規模チーム）への対応」。
Rails の統合アプローチは「信頼できる規模で速く動かす」ための選択。

SaaS では機能を出すスピードが競合との差になる。
DHH が Basecamp（SaaS）を作るために Rails を作ったのはここに直結している。

---

## 言語化チェックリスト

### Rails の設計哲学

- [x] Active Record パターンとは何か？一言で説明できるか？

  モデル自身がDBに話しかけるパターン。ドメインロジックとDBロジックをあえて同じクラスに混在させる。UNIONや複数テーブルの話とは別。

- [x] "Convention over Configuration" が解いている問題を具体例で言えるか？

  モデル名・テーブル名・ファイルパスなどをRailsが規約で決めておくことで、開発者が設定を書く手間とミスをなくす。`class Dog` と書くだけで `dogs` テーブルを自動的に使う。Javaでは `@Table(name = "dogs")` などの設定が必要。

- [x] Rails Doctrine の "Provide sharp knives" が Java の何を批判しているか説明できるか？

  Javaは静的型付け・アクセス修飾子・インターフェースで開発者を制約する。DHHはこれを「開発者を信頼していない」と批判し、「危険でも表現力のある道具（鋭いナイフ）を渡して使い方を信頼しろ」という思想でRubyを選んだ。

- [x] Ruby が「黒魔術」と呼ばれる理由を具体例で説明できるか？

  Rubyはどのクラスにも後からメソッドを追加できる（オープンクラス）。Railsはこれを使って `has_many` などを実現しているが、どこでメソッドが定義されているか追いにくい点が「黒魔術」と呼ばれる理由。Convention over ConfigurationやRailsエコシステムの話とは別。

### DDD との対比

- [x] Active Record と Repository パターンの違いを「誰が DB に話しかけるか」で説明できるか？

  Active RecordはモデルがDB操作のメソッドを持つ（`Dog.find`, `dog.save`）。RepositoryはDBへの操作を別クラスが担い、ドメインオブジェクトはDBを知らない。UNIONや複数テーブルの話とは無関係。

- [x] SQL を書かなくて済む理由（ORM）と、Active Record の「混ぜている」話が別の話であることを説明できるか？

  ORMは生SQLを自動生成するツールでJava・Railsともに存在する（別の話）。Active Recordの「混ぜている」とはドメインロジックとDBロジックが同じクラスにあること。複数テーブルを跨げるかどうかとは別の話。

- [x] Java で DDD が発展した背景をJavaの言語哲学と繋げて説明できるか？

  Javaは静的型付け・アクセス修飾子・インターフェースで開発者を制約する言語。この「層を分けて管理する」思想がDDDの設計と自然に合っており、Java × DDDが発展した背景になっている。

- [x] Rails が DDD を選ばない理由を 3 つ以上の観点で説明できるか？

  ①ドメインが単純（柴犬のお世話記録）でAggregateを切るほどの複雑さがない、②Active RecordにRepositoryを混ぜると半端な分離になる、③個人開発で認知負荷を増やすメリットがない。DHHがSaaS（Basecamp）のために作ったRailsは「機能を出すスピードが競合との差になる」という前提があり、層を増やさずシンプルに動かすActive Recordの思想とぴったり合っている。

### テスト戦略

- [x] 「アーキテクチャの選択がテスト戦略を決める」を Active Record と DDD の対比で因果関係を使って説明できるか？

  Active RecordはドメインとDBが混在しているのでDBごとテストする方が素直。DDDはRepository層が分離されているのでMockで差し替えてDBなしでテストできる。アーキテクチャの選択がそのままテスト戦略を決める。

- [x] Java の「DB なし単体テスト」が DDD アーキテクチャの自然な帰結である理由を説明できるか？

  DDDはドメイン層とRepository層が構造的に分離されているため、ドメインの単体テストを書くときにRepositoryを使う理由がない。DBなしテストはDDDの帰結として自然に生まれる。

- [x] DHH「test-induced damage」の意味を具体例で説明できるか？

  テストのためだけにRepository層を作るなど、テストの都合でアーキテクチャを歪めること。「MockでテストするためにRepositoryを追加する」のはテストが設計を歪めている。DBごとテストすれば仮定ごと検証できるのにMockを使うことで「本物のDBが正しく動く」という仮定が入り込む。

- [x] Rails のテスト階層（Model spec / Request spec / System spec）それぞれの役割を言えるか？

  Model spec：バリデーション・コールバック・モデルのメソッドを検証。Request spec：HTTPリクエスト→ルーティング→コントローラ→レスポンスまでを検証。System spec：ブラウザを実際に動かしてUIの操作を含むE2Eを検証。RSpecはすべてのspecで使うテストフレームワークの名前（Request specだけの話ではない）。MinitestはRailsデフォルトの別フレームワーク。

- [x] このプロジェクトでどのテスト戦略をとるかを理由付きで説明できるか？

  Rails側はModel spec（バリデーション・コールバック）とRequest spec（エンドポイント全体）が中心。E2EはNext.js側で担うのでRailsのSystem specは書かない。

### 開発時の総合言語化

- [x] 「なぜ Rails を選んだか」を Java 経験者の視点から DDDとの対比を使って 3 分で説明できるか？

  JavaでDDDを経験した中で、Repository層やAggregate境界の設計が必要作業として重くなる場面を感じていた。今回は柴犬のお世話記録というシンプルなドメインで開発者も1人なのでドメインの複雑さが出てくる可能性が低い。Active RecordはモデルがDBに直接話しかけるので層を増やさずシンプルに動かせる。RailsがSaaSのスピード重視で作られた思想ともこのプロジェクトの規模感と合っていると判断した。

- [x] 「なぜ DDD を選ばないか」をドメインの複雑さ・チーム規模・Rails との相性の 3 軸で説明できるか？

  「なぜ Rails を選んだか」と内容が重複するためそちらの回答を参照。

---

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


---

# 技術選定と設計方針

**日付：** 2026-04-25  
**フェーズ：** Phase 0（設計）

---

## やったこと

- アプリ概要・課題・ユーザーを整理した
- 技術スタックを選定した
- LINEのwebhook処理の設計方針を決めた
- プロジェクトのディレクトリ構成・開発フローを整備した

---

## 技術選定の判断

### バックエンドをRailsにした理由
- プログラミング学習時にRails/Rubyを経験済みで学習コストが低い
- ヘルステックSaaS企業がRailsを使用している
- GoodJobを使うことでPostgreSQLのみのゼロ円構成が成立する

### ジョブ処理をGoodJobにした理由（Sidekiqではなく）
- SidekiqはRedisが別途必要でコストが増える
- GoodJobはPostgreSQLにジョブを保存するためSupabaseの無料枠だけで完結する
- ActiveJobのインターフェースで書くため後からSidekiqへの乗り換えも設定変更だけ
- **本番ではSidekiqが主流**という認識はある。今回はコスト制約での選択。

### LIFFにした理由（LINEミニアプリではなく）
- LINEミニアプリは審査・申請が必要で個人開発には重い
- LIFFはWebページをLINEアプリ内で開く仕組みでNext.jsで実装できる

---

## LINEのwebhook設計

### なぜ非同期処理が必要か
LINEはwebhookを送信後3秒以内に200が返らないとタイムアウト＋リトライする。
Renderの無料プランはスリープ時に起動が10〜30秒かかるため、重い処理を同期で書くと詰まる。

### 2つの問題と対策
| 問題 | 対策 |
|---|---|
| サーバーがスリープ中にwebhookが来る | UptimeRobotで5分おきにpingして起こしておく |
| 処理が重くて3秒超える | GoodJobで即200を返して後で処理（計測後に判断） |

### MVPでの方針
最初はUptimeRobotのみでシンプルに動かす。
GoodJobはMVP計測後に応答時間を見て必要なら導入する。

### 業務経験との接続
Javaのオンライン処理でジョブをキックしてHTTP 200を返すパターンと同じ設計思想。
「即レスポンスして重い処理は後回し」という非同期処理の基本パターン。

---

## 計測方針

MVPが動いたら必ず計測してからv1.1に進む。
計測→判断→実装の流れを体験することが目的。

確認項目：
- Railsログの応答時間（`Completed 200 OK in XXXms`）
- LINEのリトライ発生有無
- Renderのスリープ発生有無

---

## 言語化できるか

- [x] SidekiqではなくGoodJobを選んだ理由をコスト（Redis有無）で説明できるか
  > 本番ではSidekiqが主流だが、SidekiqはRedisが必要でコストが増える。家族と周辺の小規模利用が想定のMVPにはオーバースペックなのでGoodJobを選択。GoodJobはPostgreSQLだけで動くのでSupabaseの無料枠に収まる。導入はMVP計測後に必要性を判断する方針。

- [x] LINEのタイムアウト制約（3秒以内）を数字で説明できるか
  > LINEのwebhookは3秒以内に200を返さないとタイムアウト＋リトライされる。MVPでは処理を軽くして同期のまま動かし、計測後に重くなっていたらGoodJobで非同期化する判断をする。

- [x] Renderのスリープ問題を数字で説明できるか
  > Renderの無料枠は15分動きがないとスリープする。UptimeRobotで5分おきにpingして起こしておく。

- [ ] 「計測して判断した」を応答時間の数値とともに話せるか（計測後に埋める）

- [x] 業務のJava非同期処理と同じ設計思想であることを具体的に説明できるか
  > 業務のJavaではオンライン処理でジョブを起動したら完了を待たず即200を返す設計だった。ジョブが失敗してもオンライン処理には戻さず、DBにエラーステータスを保存して次の処理で拾う仕組み。この「即レスポンスして重い処理は後回し」という思想がLINEのwebhook設計と同じなので業務経験を活かせると判断した。

---

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

- [x] なぜgroupsとdogsを分けたか説明できるか

  1家族1匹とは限らないため。多頭飼い（1グループに複数の犬）に対応するため `groups → dogs` を1:多にした。分けなかった場合、2匹目が増えたときにグループ情報の複製や設計変更のコストが発生する。

- [x] group_membersが中間テーブルである理由・レコードのイメージを説明できるか

  usersとgroupsは多対多（1ユーザーが複数グループ、1グループに複数ユーザー）の関係のため中間テーブルで橋渡しする。例えばユーザー1が実家グループ（group_id=1）と嫁ぎ先グループ（group_id=2）に所属する場合、group_membersに2レコードができる。

- [x] care_recordsのcare_typeをenumにした理由を説明できるか

  DB不整合を防ぐため。`'Toilet'` `'toilet'` `'トイレ'` のようなゆらぎが起きなくなり、アラート判定の `WHERE care_type = 'toilet'` が確実に動く。処理もシンプルになる。自由記入など検索対象外の共有事項は別テーブルでString保存する。

- [x] `recorded_at` と `created_at` を分けた理由を説明できるか

  記録したタイミングと実際に世話した時刻が一致しない場合があるため。後から「さっきトイレ行ったの忘れてた」という後付け記録ができるよう分離した。アラート・タイムラインは `recorded_at` を基準にする。

- [x] alert_settingsに (dog_id, care_type) のunique制約を置いた意図を説明できるか

  同じ犬に同じcare_typeの設定が2つ登録されるのを防ぐため。2レコードあるとどちらを使うか曖昧になりアラート判定のロジックが複雑になる。`(dog_id, care_type)` で「1犬につき1care_typeに設定は1つ」を強制する。（犬ごとのデータ混合を防ぐのは外部キー制約の役割であり別の話）

- [x] 自由記入をcare_recordsに含めずv2の別テーブルにした理由を説明できるか

  MVPは最小の必要機能に絞りたいため。またDB設計の観点では、care_recordsは「いつ・誰が・何をしたか」の構造化データに責務を絞ることでクエリをシンプルに保てる。自由記入を同じテーブルに入れると検索しないのにNULLのカラムが増え、テーブルの役割が曖昧になる。

---

# API設計の議論ログ

**日付：** 2026-04-25  
**テーマ：** Rails API onlyのエンドポイント設計・HTTPメソッドの使い分け

---

## 決定事項まとめ

### エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/line` | LINEのIDトークンを検証してJWTを発行 |
| POST | `/api/v1/groups` | グループ作成 |
| POST | `/api/v1/groups/join` | 招待トークンでグループ参加 |
| POST | `/api/v1/dogs` | 犬を登録（アラート設定も自動生成） |
| GET | `/api/v1/dogs/:id` | 犬の情報取得 |
| POST | `/api/v1/dogs/:dog_id/care_records` | 記録を登録 |
| GET | `/api/v1/dogs/:dog_id/care_records` | タイムライン取得 |
| GET | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を取得 |
| PATCH | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を変更 |
| POST | `/webhooks/line` | LINEからのイベント受信 |

### HTTPメソッドの使い分け
- `PUT`：リソース全体を置き換える
- `PATCH`：リソースの一部だけ変更する
- アラート設定は `interval_hours` だけ変えることが多いので `PATCH` が適切

### alert_settingsにPOSTが不要な理由
- 犬を作成したタイミングでRailsのコールバック（`after_create`）でデフォルト値を自動生成する
- フロントから2回APIを叩く必要がなくなる
- `interval_hours` のデフォルト値は4時間

```ruby
class Dog < ApplicationRecord
  after_create :create_default_alert_settings

  def create_default_alert_settings
    alert_settings.create!(care_type: 'toilet', interval_hours: 4)
  end
end
```

### Railsの7アクションとAPI onlyの関係
- `new` と `edit` はHTMLフォームを返すためのアクション
- API onlyではフォーム表示はNext.jsの仕事なので不要
- `edit` と `update` が分かれている理由：「画面表示」と「データ処理」は別のHTTPリクエストだから

### API設計書を作る意義
- フロントバック分離では「このエンドポイントにこのJSONを投げたらこのJSONが返る」という契約書として必須
- フロントとバックを並行開発するために必要
- Rails onlyでも作れるが、フロントバック分離では重要度が上がる

---

## 言語化チェックリスト

- [x] `PUT` と `PATCH` の違いを説明できるか

  PUTは全カラムを送信してリソースを丸ごと置き換える。PATCHは変更したいカラムだけ送信して一部だけ更新する。フロント→Railsの方向のリクエストなので「取得」ではなく「送信」が正確。

- [x] `alert_settings` にPOSTが不要な理由を説明できるか

  POSTはDBへの新規保存。アラート設定は犬の新規登録時に `after_create` コールバックでデフォルト値が自動保存されるので、フロントからPOSTを叩く必要がない。変更はPATCHだけで対応できる。

- [x] `edit` と `update` が別アクションになっている理由を説明できるか

  `edit` は入力フォームを表示する画面側のアクション、`update` はDBへ書き込むAPI側のアクション。特にフロントバック分離では画面とデータ処理がサーバーをまたぐため、この違いがより明確になる。

- [x] API設計書がフロントバック分離で必須になる理由を説明できるか

  Rails onlyの時はビューへ橋渡しするだけでサーバーをまたがないので、どの形でフロントが受け取るかを明言する設計書は不要だった。API onlyでフロントバックを分けると、どの形でデータを渡すかを明言しておかないと作業分担もできないため契約書として必要になる。

---

# 認証・LINEBot設計の議論ログ

**日付：** 2026-04-25  
**テーマ：** 認証方式・家族グループ管理・LINE Botの操作フロー

---

## 決定事項まとめ

### LINE Botの方式
- **1対1チャット方式**を採用（グループチャット＋プレフィックス方式は不採用）
- 家族全員がBotを友達追加して個別にトーク
- 全会話がアプリに来ない・既存の家族LINEを汚さないメリット

### 記録・表示の役割分担
| 操作 | 場所 |
|---|---|
| 記録を送る | LINEのBotとの1対1トーク |
| 最新状態を確認 | BotがFlex Messageで返信 |
| 全タイムラインを見る | リッチメニューからLIFF（LINE内ブラウザ） |

### Flex Message
- BotがDBの内容を動的に取得してカード形式で返信
- カード上にボタンを置いて記録もそこから完結できる
- `liff.isInClient()` でLINE内かどうかを判定して書き込み権限を切り替え
- LINEにはトーク画面を開いたときのWebhookイベントがないため自動表示は不可
- リッチメニューの「状態確認」ボタン1タップで最新状態カードを取得する

### リッチメニュー
- トーク画面下部に常時表示される固定ボタン（LINE側の機能）
- ボタン例：[散歩した] [ごはん] [状態確認] [タイムライン]
- タップ1回で記録完結・文字入力不要
- 「アプリを開かずにLINEだけで操作できる」要件をボタン1回で実現する

### アクセス制御
| アクセス方法 | 認証 | 権限 |
|---|---|---|
| LINE内（LIFF） | LINE認証（自動） | 書き込み・読み込み |
| 外部ブラウザ | なし（公開URL） | 読み込みのみ |

- v2で外部ブラウザからもLINEログインで書き込み可能にする予定

### 家族グループ管理
- 最初にBotを友達追加したユーザーが家族グループを作成
- 招待URLを既存の家族LINEに貼って共有
- 家族が招待URLからBotを友達追加 → 同じグループに参加
- グループIDが家族グループの識別子になる

### 認証フロー（Rails API）
- LIFF → `liff.getIDToken()` でLINEのIDトークン取得
- RailsがLINEのサーバーにIDトークンを検証問い合わせ
- 検証OK → Railsが自前JWT（JSON Web Token）を発行
- 以降はJWTをAuthorizationヘッダーに付けてAPI呼び出し
- LINEのIDトークンをそのまま使い続けない理由：有効期限が短い（発行後数分）

### セキュリティ
- LINE Channel Secret / Channel Access Token は環境変数で管理
- `.env` はgitにコミットしない
- Render・Vercelの環境変数設定画面で値を登録

---

## 却下した案と理由

| 案 | 却下理由 |
|---|---|
| LINEグループ＋プレフィックス方式 | 全会話がWebhookに来る・既存の家族LINEが汚れる |
| LINEグループ連携でグループID管理 | 開発コスト高・Bot審査が複雑 |
| 招待コード方式のグループ管理 | Bot友達追加＋招待URLのほうがシンプル |

---

## LIFFとは（整理）
- LINE内蔵ブラウザで開くWebアプリ
- LINEを離れずにNext.jsのWebアプリが表示される
- 閉じるとLINEのトーク画面に戻る
- `liff.isInClient()` でLINE内かどうかを判定できる

### LIFF SDK
- LINEが提供する関数をまとめたライブラリ
- `npm install @line/liff` でNext.jsプロジェクトに追加する
- 主な関数：
  - `liff.getProfile()` — ユーザー名・アイコン取得
  - `liff.getIDToken()` — 認証用トークン取得
  - `liff.isInClient()` — LINE内ブラウザかどうか判定
- SDKを組み込むことでLINEログイン済みユーザーの情報を自前実装なしで取得できる

---

## 言語化チェックリスト

- [x] なぜグループチャット方式ではなく1対1方式にしたか説明できるか

  グループチャットにBotを入れると全メッセージがWebhookに届くためフィルタ実装が必要になり、実装コストと速度低下を招く。またプライバシー上も家族の個人的なやり取りがサーバーに届くのは好ましくない。1対1方式なら犬の記録だけが届くのでシンプルで安全。

- [x] Flex Messageとリッチメニューの違いを説明できるか

  リッチメニューはトーク画面下部に常時表示されるLINE側の固定ボタン。Flex MessageはBotがDBから取得した最新情報をもとに動的に組み立てて返信するカード形式のメッセージ。両方ともボタンタップがWebhookでRailsに届く。

- [x] LIFFとミニアプリ（LINE公式アプリ）の違いを説明できるか

  LIFFは自分で作ったWebアプリをLINE内ブラウザで開く仕組み。LINE SDKを組み込むだけでユーザー認証が自動で取れるため、ログイン機能を自前実装しなくて済む。審査も不要なので個人開発に向いている。ミニアプリはLINE公式プラットフォームのアプリとして審査・承認が必要になる。

- [x] JWTとは何か・なぜLINEのIDトークンをそのまま使わないかを説明できるか

  LINEのIDトークンは有効期限が数分と短いため、Railsで検証後に自前のJWTを発行する。JWTはユーザーIDと有効期限を含む署名付きトークンで、署名に使う秘密鍵（JWT Secret）は環境変数で管理する。

- [x] `liff.isInClient()` で何を判定しているか説明できるか

  LINEの内蔵ブラウザ（LIFF）から開いているか、外部ブラウザから開いているかを判定する関数。LINEからならtrue・外部ブラウザならfalseが返る。これをもとに書き込みボタンの表示を切り替える。

- [x] 外部ブラウザが読み込み専用になる理由を説明できるか

  外部ブラウザでは `liff.isInClient()` がfalseになり、LIFFのSDKが自動提供するユーザー情報が取れない。書き込みにはLINE OAuthで改めてログインする仕組みが必要になるため、v1では実装せず読み込みのみにしている。技術的にできないのではなくv2への先送りの判断。

---

# Rails API only と JWT認証の理解

**日付：** 2026-04-25  
**テーマ：** Rails API onlyとJWT認証の仕組み・セッション認証との違い

---

## 決定事項まとめ

### Rails API onlyとは
- `rails new myapp --api` で作成する軽量構成
- ビュー関連のgem・ミドルウェアが省かれている
- コントローラーはJSONを返すだけ

### 通常のRailsとの違い

| | 通常のRails | Rails API only |
|---|---|---|
| レスポンス | HTML（ERBでレンダリング） | JSON |
| 認証 | セッション・Cookie | JWT |
| フロント | Rails内で管理 | Next.jsなど別サーバー |

### JWT認証の仕組み

- 状態を持つ場所が**サーバー側→クライアント側**に変わる
- JWTはフロントが持ち歩く「署名付き身分証明書」
- Railsは署名を検証するだけ・DBを引く必要がない（ステートレス）
- `before_action :authenticate_user` でチェックするのは通常のRailsと同じ

```ruby
# 通常のRails
def require_login
  redirect_to login_path unless session[:user_id]
end

# Rails API only
def authenticate_user
  token = request.headers["Authorization"]
  # JWTの署名を検証してユーザーを特定
end
```

### セッションが必要になるケース
- Railsがビューも返す構成のとき
- セッションは「前回のリクエストの状態」をサーバー側に保存してビューへの橋渡し役になる
- API onlyはビューがないので不要

### フロント・バック分離でJWTを使う理由
- セッションはサーバー側に状態を持つため、別サーバー間で共有できない
- JWTはトークン自体に情報が入っているのでサーバーが状態を持たなくていい

### v2でブラウザログインを追加する場合
- セッションテーブルは不要・JWTのままで対応できる
- 「JWTをどうやって発行するか（LINE OAuthの入口）」が変わるだけ
- Rails側の認証ロジックはほぼ変わらない

### Railsの7アクションとAPI only

Railsのリソースフルルーティングには7つのアクションがある：

| アクション | HTTPメソッド | 用途 |
|---|---|---|
| `index` | GET | 一覧取得 |
| `show` | GET | 1件取得 |
| `create` | POST | 新規作成 |
| `update` | PATCH | 更新 |
| `destroy` | DELETE | 削除 |
| `new` | GET | 作成フォーム表示 |
| `edit` | GET | 編集フォーム表示 |

- `edit` と `update` が分かれている理由：「画面表示」と「データ処理」は別のHTTPリクエストだから
- `new` と `edit` はHTMLフォームを返すためのアクション
- API onlyではフォーム表示はNext.jsの仕事なので `new` と `edit` は不要
- `only: [:show, :update]` のように必要なものだけ絞って使う

---

## 言語化チェックリスト

- [x] Rails API onlyと通常のRailsの違いを説明できるか

  フロントをRailsで持つか持たないか。コントローラーがJSONを返すかビューファイルへ渡すか。セッションを持たずJWTでやるか、セッションを持ってビューへ行くかの違い。また `rails new myapp --api` のオプション一つでビュー関連のgem・ミドルウェアが省かれた軽量構成で作られる。

- [x] JWTがフロント側に状態を持つ仕組みを説明できるか

  フロントがヘッダーにトークンを持ってRailsに送る。RailsはDBと照合するのではなく、JWT Secretで署名が本物かどうかを検証するだけ。どこにも状態を保存しないのでステートレスな構成になる。

- [x] なぜAPI only構成でセッションが不要になるかを説明できるか

  フロントがJWTを持ち歩くのでRails側に状態を保存する必要がなく、ステートレスな構成になる。フロントとバックの責務を分けた結果としてセッションが不要になる。

- [x] v2でブラウザログインを追加してもセッションテーブルが不要な理由を説明できるか

  `before_action` でセッションからではなくJWTから認証情報を取得するから。v2でブラウザログインを追加しても「JWTをどうやって発行するか（LINE OAuthの入口）」が変わるだけで、Rails側の認証ロジックは変わらない。

- [x] `edit` と `update` が別アクションになっている理由を説明できるか

  `edit` は入力フォームを表示するアクション（画面表示）、`update` はサーバー側の書き込みのアクション（データ処理）。「画面表示」と「データ処理」は別のHTTPリクエストだから別アクションが必要。

- [x] API onlyで `new` と `edit` が不要になる理由を説明できるか

  API onlyは画面側のリクエストをRailsで行わないので不要になる。フォーム表示はNext.jsの仕事。`only:` で絞るのはAPI only以前からあるセキュリティ・設計の観点の機能で、API onlyになるとその意図がより明確に見えてくる。

---

# 作業ログ：LINE Bot設計

**日付：** 2026-04-25

---

## やったこと

- LINE Bot設計ドキュメント作成（`docs/design/line-bot.md`）
- リッチメニュー構成の決定
- 状態確認Flex Messageの設計
- 多頭飼い・複数グループ対応の設計
- Webhookイベント処理フローの設計
- liff.mdの更新（タイムラインに編集・削除ボタン追加、v2複数犬対応追記）

---

## 決定事項

### リッチメニュー構成

```
┌─────────┬─────────┬─────────┐
│おしっこ │ うんち  │  散歩   │
├─────────┼─────────┼─────────┤
│ごはん   │状態確認 │タイムライン│
└─────────┴─────────┴─────────┘
```

- ボタン押す = 今の記録（recorded_at = now）
- 散歩のみ Quick Reply で [ショート][ロング] を選択してから記録
- 過去の記録・修正は LIFF タイムラインから行う

---

### 取り消し機能を実装しない理由

押し間違え対策として取り消しボタン（DELETE）を検討したが不採用：
- hard delete はリスクが高い
- soft delete（論理削除）は全クエリに `WHERE deleted_at IS NULL` が必要になり複雑
- 家族数人のアプリで押し間違えは低頻度 → LIFF から修正で十分

---

### 多頭飼い・複数グループ対応

`active_dog_id` カラムをユーザーに持たせる案を検討したが不採用：
- LIFFの設定画面で切り替えが必要 → 使い勝手が悪い
- 代わりに複数犬/グループがある場合のみ Quick Reply で選択させる

```
複数犬の場合：
[おしっこ] → Bot「どの子の記録ですか？」
              [まる: care_type=pee&dog_id=1]
              [こむぎ: care_type=pee&dog_id=2]
```

postback.data に care_type を含めることで、犬選択後も元の操作を保持できる。

1犬の場合は選択不要でそのまま記録。

---

### Webhookイベント処理の概要

| イベント | 処理 |
|---|---|
| follow | ユーザー作成 + セットアップリンク送信 |
| postback | data をパースして記録・返信 |
| message | 「ボタンからご記録ください」 |

follow イベント時に LINE API でプロフィール取得（display_name・picture_url）してユーザーを作成する。

---

### v2への積み残し

- LIFF タイムラインに犬/グループの切り替えUI（フロント対応のみ・API変更なし）
- Flex Message のカードから直接記録できるボタン

---

## 言語化チェックリスト

- [x] リッチメニューで「ボタン=今の記録」にした理由

  操作数を最小にするため。過去の修正が必要な場合はLIFFタイムラインから行えるが、LINEアプリ内でそのまま開けるため修正コストも低い。なおLIFFはLINE認証 + グループメンバーが必要（認証不要ではない）。

- [x] 散歩だけ Quick Reply にした理由（おしっこ/ごはんとの違い）

  おしっこ/うんち/ごはんは「やった」という事実だけで記録が完結するが、散歩はショート/ロングのどちらかを指定しないと記録が不完全になる。記録したい情報の数が違うためQuick Replyを1ステップ追加している。

- [x] 取り消し機能を実装しなかった理由（soft delete を避けた理由）

  soft deleteは全クエリに `WHERE deleted_at IS NULL` が必要になり、1箇所でも漏れると削除済みデータが表示されるバグになる。hard deleteはリスクが高い。家族数人のアプリで押し間違えは低頻度なのでLIFFからの修正で十分と判断し、取り消し機能ごと不採用にした。コストとメリットを比較した判断。

- [x] `active_dog_id` を採用しなかった理由

  テーブルをシンプルに保ちたかったことと、LIFFの設定画面で切り替える操作がだいぶ使い辛いため。代わりに複数犬のときだけその場でQuick Replyで選択させる設計にした。1犬なら手間ゼロ、複数犬でも1タップ追加で済む。

- [x] 多頭飼い対応で postback.data に care_type を含める意図

  複数犬のとき Quick Reply で犬を選ばせるが、`dog_id=1` だけだと「何を記録するのか」が失われてしまう。`care_type=pee&dog_id=1` とセットで持たせることで、犬選択後も元の操作の文脈を次のステップに引き継げる。

- [x] follow イベントでユーザーを作成するタイミングにした理由

  LINEとの最初の接点であり、LINE APIでプロフィール（display_name・picture_url）を取得する自然なタイミング。全postbackで `find_or_create` するより最初に1回作っておくほうがシンプルで、以降の処理が「usersレコードが存在する」前提で動ける。

- [x] Webhookの署名検証が必要な理由（セキュリティ）

  `/webhooks/line` はLINEがイベントを送ってくるための受け口でJWT不要の公開エンドポイント。誰でもPOSTできる状態なので、署名検証でリクエストが本当にLINEから来たものか確認する必要がある。LINEは各リクエストにChannel Secretで生成した署名（`X-Line-Signature`）を付けており、Railsがこれを検証する。通常のAPIと違い「LINEが送る側・Railsが検証する側」という逆の構造になる。

---

# 作業ログ：LIFF画面設計・データモデリング

**日付：** 2026-04-25

---

## やったこと

- LIFF画面設計（`docs/design/liff.md` 作成）
- DB設計・API設計の更新（care_type変更・STI追加）
- アクセス制御の方針決定

---

## 決定事項

### LIFF画面一覧（MVP）

| 画面 | URL |
|---|---|
| 初回セットアップ | `/setup` |
| グループ参加 | `/join?token=xxx` |
| タイムライン | `/timeline` |
| アラート設定 | `/settings` |

LIFF = Next.js（Vercel）のページをLINEアプリ内ブラウザで開いたもの。「LIFF画面」と「Next.jsのページ」は同じもの。

---

### タイムラインのUI構成

- **上部（スクロールなし）**：状態サマリー（おしっこ・うんち・散歩・ごはんの最新状態）
- **下部（スクロール）**：ケア記録のタイムライン

「最後におしっこ出したのいつ？」「今日散歩いった？」に即答できることを優先した配置。

---

### care_typeの変更

| 変更前 | 変更後 |
|---|---|
| toilet | pee / poop（おしっこ・うんちを分離） |
| walk | walk_short / walk_long（コース種別を含める） |
| meal | meal（変更なし） |

---

### recorded_atの扱い

ユーザーの入力（「2時間前」「12時」）はすべてタイムスタンプに変換してDBに保存する。

- おしっこ/うんち：「○時間前」→ `now - Xh` で `recorded_at` を計算
- ごはん：「○時」→ 当日の指定時刻で `recorded_at` を設定
- 表示時：フロントが `recorded_at` から「○時間前」と「○時」を両方計算して表示

DBには「2時間前」という値は持たない。`recorded_at` のタイムスタンプのみ。

---

### STI（Single Table Inheritance）の採用

`care_records` テーブルを1つに保ちつつ、Railsモデルを2つに分ける設計。

| typeカラムの値 | Railsモデル | 用途 |
|---|---|---|
| CareRecord | `CareRecord` | meal/walk/pee/poop の記録 |
| Post | `Post < CareRecord` | 呟き＋写真（v2） |

採用理由：
- タイムライン取得が1クエリで済む（UNIONが不要）
- Postにしか関係ないロジック（写真の保持期間制御など）をPostモデルに閉じられる
- テーブルを分けるとUNIONが必要になり、ページネーションも複雑になる

---

### アクセス制御の方針

| 状態 | 読み込み | 書き込み |
|---|---|---|
| LINE認証済み・グループメンバー | OK | OK |
| LINE認証済み・未所属 | NG | NG |

- 招待トークンを踏んだ = オーナーが信頼して渡した人 → 承認なしで自動加入
- `group_members.status` カラムは不要（roleのみ：owner / member）

**v2での変更：**
- 閲覧専用ページを追加（LINE認証なし・URLを知っていれば閲覧可能）
- オーナーがコンテンツ種別（Postのみなど）を公開設定できる
- この変更でも `group_members.status` は不要。公開制御はコンテンツ側（`groups` テーブル）で持つ

---

## 言語化チェックリスト

- [x] LIFFとNext.jsの関係を説明できるか

  LIFFはLINEが提供する「LINEアプリ内でWebアプリを動かす仕組み」。そのLIFFアプリをNext.jsで実装している。LIFF画面 = Next.jsのページ。`@line/liff` SDKでLINEユーザー情報（IDトークン・表示名）を取得し、RailsにJWT発行をリクエストする。

- [x] なぜタイムラインのサマリーを上部に配置したのか

  アプリを開いた瞬間に「最後の排泄・散歩・ごはんがいつか」を確認できるようにしたかった。これがこのアプリで解決したい課題（情報が家族LINEに散らかる）の核心だから。

- [x] care_typeのenumを変更した理由（toilet分離・walk分離）

  おしっことうんちはタイミングが異なるため分離した。分離することでアラート設定もpee/poop別々に設定できる。散歩はショート/ロングの2択をenumで持ち、タイムラインでコース種別を記録できる。サマリーの「今日○回」はwalk_short + walk_longの合計で出す。

- [x] recorded_atに変換して保存する理由（「2時間前」をDBに持たない理由）

  「2時間前」をDBに保存すると、時間が経つにつれ意味が変わってしまう（3時間後に見たら「5時間前」のはず）。結局タイムスタンプが必要になるため、最初からタイムスタンプだけDBに持ち、「何時間前か」の計算はフロントに任せる。

- [x] STIを選んだ理由と、他の設計案（1テーブル/別テーブル）とのトレードオフ

  タイムラインはCareRecordとPost（v2）を混在表示する。別テーブルにするとタイムライン取得クエリがUNIONになりページネーションも複雑になる。1テーブルにするとクエリはシンプルだが、Postにしか関係ないロジック（写真保持期間の制御など）をモデルに閉じられない。STIは1テーブルのシンプルさを保ちつつRailsモデルを分けられるため採用した。

- [x] アクセス制御でstatusカラムが不要になった理由

  当初は「URLを踏んだ人全員に書き込みを許すのは危険」と考え承認制を検討していた。しかしURLを2種類に分けることで解決した。`/timeline`は犬友に見せる閲覧用、`/join?token=xxx`は家族にだけ渡すメンバー参加用。トークンURLを踏んだ時点でオーナーが信頼した相手なので自動承認でよく、`status`カラムは不要。

- [x] v2の公開設定をgroup_membersではなくgroupsテーブル側で持つ理由

  公開/非公開はメンバーの状態ではなくコンテンツの状態。v2の公開ページはグループ固有のURLではなくサービス全体のギャラリー（`/`）で、公開設定ONのグループの犬写真が一覧表示される。「うちの犬かわいいでしょ〜」で共有するURLがこのサービストップになる。公開設定は `groups` テーブルで管理する。

---

# UI設計・フロント開発方針

**日付：** 2026-04-26

---

## 作業内容

- v0.dev を使ってタイムライン画面の UI を生成
- UI生成ツールの比較検討（v0.dev / Bolt.new / Lovable）
- モックファースト開発方針の決定
- フロントエンド開発 Issue の整備（#7, #25〜#30）
- ロードマップ・設計ドキュメントの更新

---

## 決定したこと

### UI生成ツールは v0.dev を採用

Claude との相性・shadcn/ui + Tailwind の出力品質・既存の Next.js 構成との親和性から v0.dev を選んだ。

### デザインコンセプト：「みんなを輪で繋ぐ」

「家族の中心で会話のきっかけになる」というコンセプトを視覚化した。
柴犬を中心に家族メンバーのアバターが輪になる `FamilyCircle` コンポーネントを採用。
タイムラインカードの担当者アバターと色を統一し、誰の記録かを直感的に把握できるようにした。

### モックファースト

フロントをモックデータで完成させてから Rails API に繋ぐ方針。
バックエンド不在でも画面開発が進められ、「バックエンドとフロントのどちらで詰まっているか」が明確になる利点がある。
v0.dev が生成したコードはすでにモックデータで動作しているため、この方針とそのまま相性が良い。

### フロントから先に環境構築

バックエンド（Rails + Supabase + Render）は LINE Developers を含む 3 サービスが絡むため、
フロントのモック画面が完成してから集中して取り組む。

---

## フロントエンド Issue 一覧

| # | タイトル | 順番 |
|---|---|---|
| #25 | フロントエンド基盤セットアップ | Step 1 |
| #7 | LIFF画面：タイムライン（モック） | Step 1 |
| #26 | LIFF画面：/setup（モック） | Step 1 |
| #27 | LIFF画面：/join（モック） | Step 1 |
| #28 | LIFF画面：/settings（モック） | Step 1 |
| #29 | LIFF SDK 導入・LINE認証 | Step 2 |
| #30 | フロント→Rails API接続 | Step 4 |

---

## UI生成ツール比較（言語化チェック用メモ）

| ツール | 強み | 弱み |
|---|---|---|
| v0.dev | コンポーネント品質・shadcn/ui 統合・Claude との相性 | フルアプリ生成は苦手 |
| Bolt.new | ブラウザ上で動く・即デプロイ | コード制御が弱い |
| Lovable | Supabase 連携・アプリ丸ごと生成 | コード品質が粗い |

---

## 言語化チェックリスト

- [x] v0.dev を採用した理由を競合との比較で説明できるか

  shadcn/uiを提供しているVercelエコシステムのツールなのでshadcn/uiとの親和性が高く、既存のNext.js構成にそのまま組み込める。「Vercelが作った」は正確ではなく、shadcnというVercelエコシステムのエンジニアが作ったもの。

- [x] モックファーストとは何か・なぜ採用したかを説明できるか

  本物のAPIが存在しない段階でハードコードしたダミーデータでUIを完成させる開発方針。「テストのためのMock」とは別の話。API設計書でレスポンスの形を先に決めておくことで、フロントはその形に合わせたダミーデータを作れる。

- [x] FamilyCircle コンポーネントがコンセプトをどう表現しているか説明できるか

  柴犬を中心に家族アイコンが円を描くことで「家族の中心に犬がいる」を表現。まんまる柴のネーミングとも一致する。タイムラインカードの担当者色と統一することで誰の記録かが直感的にわかるUXにもなっている。FamilyCircleはライブラリではなく、このプロジェクト用のカスタムコンポーネントの命名。

- [x] shadcn/ui とは何か・なぜ使うかを説明できるか（Tailwind との関係）

  TailwindクラスがそのままコードのReactコンポーネント集のため自由にカスタマイズができる点が決め手。コンポーネントはnode_modulesに入るのではなく、`components/ui/` にソースコードとしてコピーされるため自分でコードを所有できる。

- [x] フロントファーストにした理由を説明できるか（バックエンドの複雑さとの関係）

  ゼロ円構成の制約でRails + Supabase + Render + LINE Developersの組み合わせになり複数サービスの連携が必要な複雑な構成になった。個人開発で初めてフロントとバックを分ける構成でもあったため、まずモックで動くものを作ってから1つずつ連携していく方針にした。問題が起きたときフロント・バックどちらの問題か切り分けやすいのも理由。

- [x] モックから本物の API に差し替えるとき何が必要かを説明できるか

  API設計書のエンドポイントのパスに合わせてfetchを書き、レスポンスの型を`types/`に定義しておく。あわせて環境変数でAPIのURLを開発・本番で切り替えられるようにして、LIFFのIDトークンを認証ヘッダーに付ける。

---

# TypeScript の型安全とコーディング規約

**日付：** 2026-05-08
**テーマ：** TypeScript の型アサーション・`types/` ディレクトリ・コーディング規約の整理

---

## 決定事項まとめ

- `any` は使わない
- API レスポンスの型は `types/` にドメイン単位で定義する
- 型アサーション（`as`）は外部データとの境界でやむを得ず使う場合に限る。使う場合はコメントで理由を書く
- `"use client"` はクライアント状態が必要なときだけ付ける（デフォルトは Server Components）
- コーディング規約は `docs/rules/development_rules.md` にまとめる（設計ドキュメントと重複させない）

---

## 作業ログ

### TypeScript のコンパイルの仕組み

TypeScript はブラウザ・Node.js では動かせないため、JavaScript に変換してから実行する。

```
.ts ファイル → コンパイル → .js ファイル → Node.js / ブラウザで実行
```

| タイミング | 何が起きるか |
|---|---|
| VS Code でコードを書く | エディタ内蔵の TS サーバーがリアルタイムに型チェック（赤い波線） |
| `next dev` を実行 | SWC が型を除去して JS に変換（**型チェックは省略**） |
| `tsc` を実行 | 厳密な型チェック → JS に変換 |

`next dev` は型エラーがあっても動いてしまう。型チェックを厳密に行うには `tsc --noEmit` を使う。

### 型アサーション（`as`）とは

`as` は「この値はこの型だ」と TypeScript に断言する構文。型チェックを強制的に黙らせる。

```typescript
const el = document.getElementById('search') as HTMLInputElement
// TypeScript は getElementById が HTMLElement | null を返すと知っている
// でも HTML を自分で書いているので input だとわかっている → as で断言
```

**重要：`as` は実行時には何も変換しない。**
型のラベルを貼り替えるだけで、値は元のまま動く。

```typescript
const x = "hello" as unknown as number
// 実行時の x は "hello"（文字列のまま）
console.log(x + 1)  // "hello1"（エラーにならず変な値が出る）
```

型エラーより始末が悪いため、使用は最小限にとどめる。

### SQL の AS との違い

| | 何をするか |
|---|---|
| SQL の `AS` | 別名をつける（エイリアス）。実体は変わらない |
| TypeScript の `as` | 型を断言する。値は変わらない |

### `as` を使う正当な場面

TypeScript が「わからない」が開発者は「わかっている」状況。

```typescript
// 1. DOM 操作：getElementById は HTMLElement | null を返すが HTML を見ればわかる
const input = document.getElementById('search') as HTMLInputElement

// 2. 外部データ（fetch・JSON.parse）：TypeScript には中身がわからない
const data = JSON.parse(responseText) as User
```

このプロジェクトで最もよく出るのは Rails API のレスポンス。

### `types/` ディレクトリ

API レスポンスなど外部データの型をドメイン単位でまとめる場所。

```
types/
├── dog.ts      # Dog, CareRecord, AlertSetting
├── user.ts     # User, Group, GroupMember
└── api.ts      # APIレスポンス共通の型（エラー形式など）
```

```typescript
// types/dog.ts
type Dog = {
  id: number
  name: string
  birth_date: string | null
}

type CareRecord = {
  id: number
  dog_id: number
  care_type: 'meal' | 'walk_short' | 'walk_long' | 'pee' | 'poop'
  recorded_at: string
}
```

1型1ファイルにはしない。型が少ないうちは `types/index.ts` 1ファイルでも問題ない。

**`types/` の恩恵：** VS Code の補完とエラー検知。Rails 側でカラム名を変えたとき、`types/` の型を更新すればフロント全体の使用箇所が一斉に赤くなって気づける。

### `undefined` と `unknown` の違い

| | 何か |
|---|---|
| `undefined` | 「値がない」という値。データの形は表現できない |
| `unknown` | 「型がわからない」という型。アクセス前に絞り込みが必要 |

```typescript
const dog: unknown = data
dog.name  // エラー：unknown には何があるかわからないのでアクセス不可

const dog: Dog = data as Dog
dog.name  // OK：補完も効く
```

---

## 言語化チェックリスト

### TypeScript のコンパイル

- [x] TypeScript が「コンパイルしてから実行」である理由を説明できるか

  ブラウザやNode.jsはTypeScriptを直接実行できないため、JavaScriptに変換してから実行する。コンパイル時に型チェックも行われるので実行前に型エラーに気づける。

- [x] `next dev` と `tsc` の型チェックの違いを説明できるか

  `next dev` はSWCでJavaScriptに変換するだけで型チェックを省略する。型エラーがあっても動いてしまう。`tsc` は厳密な型チェックを行う。`tsc --noEmit` で変換せず型チェックだけ行える。

### 型アサーション（`as`）

- [x] `as` が「値を変換しない」ことを具体例で説明できるか

  `as` は型のラベルを貼り替えるだけで値は変わらない。`"hello" as unknown as number` としても実行時は "hello" のまま。`x + 1` が "hello1" になるなど、エラーにならず変な値が静かに流れる。

- [x] SQL の `AS` と TypeScript の `as` の違いを説明できるか

  SQLの `AS` は別名をつけるだけ（エイリアス）。TypeScriptの `as` は型チェックをスルーして型を断言する。どちらも値そのものは変わらないが目的が全然違う。

- [x] `as` を使う正当な場面を2つ以上挙げられるか

  ①DOM操作：`getElementById` は `HTMLElement | null` を返すが、HTMLを自分で書いているので `input` だとわかっているとき。②外部データ（fetch・JSON.parse）：TypeScriptにはレスポンスの中身がわからないが、API設計を知っているので型を当てるとき。このプロジェクトで一番出てくるのはRails APIのレスポンス。

- [x] `as` が「TypeScript の恩恵を自分で捨てる行為」である理由を説明できるか

  TypeScriptは型を定義してデータが正しい型であることを型チェックで保証する。`as` で型チェックをスルーするとその保証が効かなくなる。

### `types/` ディレクトリ

- [x] `types/` を作る目的を「補完・エラー検知」で説明できるか

  APIレスポンスなど外部データの型を `types/` に定義することで、VS Codeの補完が効き、Rails側でカラム名を変えたときにフロント全体のエラーを検知できる。

- [x] `any` でなく `types/` に型を定義する利点を説明できるか

  `any` はすべての型チェックをスルーするため補完もエラー検知も効かなくなる。`types/` にカスタム型を定義することでVS Codeの補完が効き、型の変更時にエラーで気づける。

- [x] `undefined` と `unknown` の違いを説明できるか

  `undefined` は「値がない」ことを表す値。`unknown` は「型がわからない」ことを表す型。`any` と違い `unknown` はアクセス前に型の絞り込みが必要なため型安全を保ちやすい。

---

# パッケージマネージャ選定：なぜnpmを選んだか

## 選定結果

**npm採用**。pnpm・yarnは不採用。

## 参考記事

- [pnpmを使ってみた（Zenn）](https://zenn.dev/saggggo/articles/dbd739508ac212)
- [メルカリ Monorepo開発におけるツール選定](https://engineering.mercari.com/blog/entry/20220518-aaa18f6b00/)

## パッケージマネージャの比較

| | npm | yarn | pnpm |
|---|---|---|---|
| 出自 | Node.js公式同梱 | Meta製（2016） | OSS（2017） |
| 主流度 | 最も歴史が長い | かつて主流 | 今のフロント界隈で主流寄り |
| 特徴 | シンプル・追加インストール不要 | 安定・ワークスペース機能 | 速い・ディスク節約（ハードリンク） |

## pnpmが速い・軽い仕組み

npmは各プロジェクトにnode_modulesをまるごとコピーする。  
pnpmはグローバルキャッシュに実体を1つ置き、各プロジェクトからハードリンクで参照する。

```
npm:  プロジェクトA/node_modules/react  ← 実体
      プロジェクトB/node_modules/react  ← 別の実体（コピー）

pnpm: ~/.pnpm-store/react              ← 実体（1つ）
      プロジェクトA/node_modules/react  ← ハードリンク
      プロジェクトB/node_modules/react  ← ハードリンク
```

「node_modulesを開かない」ではなく「コピーを作らない」が正確。

## pnpmの恩恵が出る条件

**複数のpackage.jsonが存在するモノレポ構成**のとき。

```
# 恩恵あり（モノレポ）
project/
  frontend/
    package.json   ← ReactなどJSの依存
  backend/
    package.json   ← NestJSなどJSの依存
  shared/
    package.json   ← 共通の型定義など
```

frontendとbackendとsharedそれぞれにReactなどが入っていたら、  
npmだと3コピー → pnpmならハードリンク1つで済む。

**マイクロサービスはリポジトリが分かれるため恩恵は薄い**（リポジトリをまたいだハードリンクはしない）。

## このプロジェクトでnpmを選んだ理由

```
manmaru-shiba/
  frontend/
    package.json   ← JSはここだけ
  backend/         ← Rails（Ruby）なのでpackage.jsonなし
```

- JSのpackage.jsonが1つしかない → pnpmのハードリンク共有が効かない
- pnpm自体を追加インストールする必要がある（npmはNode.jsに同梱）
- 規模に対してoverkill

**バックエンドもJSのモノレポなら pnpm + Turborepo を検討する。**

## UIパッケージを切り出すのはいつか

`components/ui/` とは別に `ui/package.json` として独立させるケース：

- 複数アプリ（管理画面・ユーザー向け・モバイル等）で同じUIコンポーネントを共有したい
- デザインシステムとして独立してバージョン管理したい

```
# 切り出す動機がある例
project/
  apps/
    admin/         ← 管理画面
    web/           ← ユーザー向け
  packages/
    ui/            ← 共通コンポーネント（Button, Card...）
      package.json
```

1アプリなら `components/ui/` に置くだけで十分。  
「アプリが増えたら考える」で個人開発〜小規模では問題ない。

## 言語化チェックリスト

- [x] pnpmが「速い」理由をハードリンクの仕組みで説明できるか

  コピーを作らずハードリンクで参照するため。速い理由は2つ：①ディスク書き込みが少ない（コピーしない）②2回目以降はグローバルキャッシュから参照するだけでダウンロード不要。  
  補足：依存関係のツリー構造やバージョン管理はシンボリックリンクが担っており、ハードリンクとは役割が分かれている。

- [x] モノレポとマルチリポの違いを説明できるか

  モノレポは1リポジトリで複数の `package.json` を持つ構成。マルチリポはそれぞれ別リポジトリに分離する構成。

- [x] このプロジェクトでnpmを選んだ理由を一言で言えるか

  バックエンドがRailsのためJSの `package.json` が1つしかなく、pnpmのハードリンク共有の恩恵がない。モノレポではなくシングルパッケージ構成のためnpmで十分。

- [x] UIパッケージを切り出す動機を具体例で言えるか

  管理画面やモバイルアプリでも同じ部品を使いたいとき。同じリポジトリ内に複数のアプリがあり共通UIコンポーネントを使いたい場合が切り出しのタイミング。1アプリだけなら `components/ui/` に置くだけで十分。
