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

- [ ] Active Record パターンとは何か？一言で説明できるか？
- [ ] "Convention over Configuration" が解いている問題を具体例で言えるか？
- [ ] Rails Doctrine の "Provide sharp knives" が Java の何を批判しているか説明できるか？
- [ ] Ruby が「黒魔術」と呼ばれる理由を具体例で説明できるか？

### DDD との対比

- [ ] Active Record と Repository パターンの違いを「誰が DB に話しかけるか」で説明できるか？
- [ ] SQL を書かなくて済む理由（ORM）と、Active Record の「混ぜている」話が別の話であることを説明できるか？
- [ ] Java で DDD が発展した背景をJavaの言語哲学と繋げて説明できるか？
- [ ] Rails が DDD を選ばない理由を 3 つ以上の観点で説明できるか？

### テスト戦略

- [ ] 「アーキテクチャの選択がテスト戦略を決める」を Active Record と DDD の対比で因果関係を使って説明できるか？
- [ ] Java の「DB なし単体テスト」が DDD アーキテクチャの自然な帰結である理由を説明できるか？
- [ ] DHH「test-induced damage」の意味を具体例で説明できるか？
- [ ] Rails のテスト階層（Model spec / Request spec / System spec）それぞれの役割を言えるか？
- [ ] このプロジェクトでどのテスト戦略をとるかを理由付きで説明できるか？

### 開発時の総合言語化

- [ ] 「なぜ Rails を選んだか」を Java 経験者の視点から DDDとの対比を使って 3 分で説明できるか？
- [ ] 「なぜ DDD を選ばないか」をドメインの複雑さ・チーム規模・Rails との相性の 3 軸で説明できるか？
