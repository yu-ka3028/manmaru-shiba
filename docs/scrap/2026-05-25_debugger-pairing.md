# 作業ログ：デバッガを使ったペアプロ

**作成日：** 2026-05-25

---

## やったこと

`binding.irb` を使いながら `handle_postback` の処理を1行ずつ追った。

---

## デバッガの基本操作

| コマンド | 動作 |
|---|---|
| `next` | 今の行を実行して次へ（メソッドの中に入らない） |
| `step` | メソッドの中に入る |
| `finish` | 今いるメソッドを抜けて呼び出し元に戻る |
| `continue` | 次の `binding.irb` まで、なければ最後まで走る |
| `bt` | コールスタックを表示 |

---

## rails runner と rails c の使い分け

| | `rails c` | `rails runner` |
|---|---|---|
| 対話式 | ○ | ✗ |
| 使いどころ | 手動で試したい・デバッグ | 確認スクリプトを自動で流したい |

`rails runner` はRSpecが育つまでの繋ぎ。RSpecが整備されたらほぼ不要になる。

---

## 今回の手順

### 1. テストデータを rails c で作成

```ruby
user = User.create!(line_user_id: "Utest001", display_name: "テストユーザー")
group = Group.create!(name: "柴田家")
GroupMember.create!(group: group, user: user, role: "owner")
dog = Dog.create!(group: group, name: "まる")
```

### 2. binding.irb をコードに埋める

```ruby
def handle_postback(event)
  binding.irb  # ← ここで止まる
  line_user_id = event["source"]["userId"]
```

### 3. LINEのWebhookイベントをハッシュで再現

```ruby
event = {
  "source" => { "userId" => "Utest001" },
  "postback" => { "data" => "care_type=pee" }
}
controller = Webhooks::LineController.new
controller.send(:handle_postback, event)
```

`send` を使うのはprivateメソッドを外から呼ぶため。

### 4. next で1行ずつ追う

ファイルを編集後は必ず `reload!` → `controller = Webhooks::LineController.new` でインスタンスを作り直す。
`reload!` だけではインスタンスが古いクラスのまま残るため。

---

## ハマりポイント

### step は引数を左から評価する

```ruby
# これだと dogs.first（ActiveRecord）に潜ってしまう
create_care_record_and_reply(event["replyToken"], user, dogs.first, care_type)

# 変数に出しておくと狙ったメソッドに入れる
dog = dogs.first
create_care_record_and_reply(event["replyToken"], user, dog, care_type)
```

`step` は行の中で最初に評価されるメソッドに入る。引数の中にメソッド呼び出しがあるとそちらに先に入ってしまう。

### reload! 後はインスタンスを作り直す

```ruby
reload!
controller = Webhooks::LineController.new  # 必要
controller.send(:handle_postback, event)
```

---

## 気づいたこと

- `User Exists? SELECT 1 ...` は `validates uniqueness` が発行するSQL（Ruby側の重複チェック）
- DB側の `UNIQUE制約` と2段構えになっている
- `invite_token` がログで `[FILTERED]` になるのは `filter_parameter_logging.rb` の `:token` 設定が効いているため
- `User#dogs` の `joins(group: :group_members).where(...)` が `INNER JOIN groups ... INNER JOIN group_members ...` に変換されるのをSQLで確認できた
- LINEのreply_messageは `400 Bad Request` になるが、ダミーのreplyTokenなので想定内

---

## 言語化チェックリスト

- [ ] `next` と `step` の違いを説明できるか？
- [ ] `step` で意図しないメソッドに入ったときの対処法（`finish`）を説明できるか？
- [ ] `reload!` 後にインスタンスを作り直す理由を説明できるか？
- [ ] `binding.irb` と `binding.pry` の違いを説明できるか？（pryは別gemが必要）
- [ ] `send` をprivateメソッドに使う理由を説明できるか？
- [ ] `validates uniqueness` とDB UNIQUE制約の2段構えの理由を説明できるか？
