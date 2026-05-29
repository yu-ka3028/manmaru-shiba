# ケア記録の編集・削除API設計と実装

## 概要

CareRecordsController に `update`（PATCH）と `destroy`（DELETE）を追加した。
Rails のルーティング設計・認可の考え方・HTTPステータスコードの使い分けが主なテーマ。

---

## 設計決定

### エンドポイント

| メソッド | パス | アクション |
|---|---|---|
| PATCH | `/api/v1/care_records/:id` | update |
| DELETE | `/api/v1/care_records/:id` | destroy |

`index`・`create` は `dogs/:dog_id/care_records` にネストしているが、`update`・`destroy` はトップレベルに置いた。
理由：更新・削除に `dog_id` は不要。必要なのは `care_record` の `id` だけ。

### 認可

```ruby
record = @current_user.care_records.find_by(id: params[:id])
```

`@current_user.care_records` でスコープを絞ることで「自分の記録か」を確認している。
他人の記録や存在しないIDは同じく **404** を返す（403を返すと「記録の存在」が漏れるため）。

### HTTPステータスコード

- PATCH 成功 → 200 + 更新後のJSON
- DELETE 成功 → **204 No Content**（ボディなし）
- 対象なし → 404
- バリデーション失敗 → 422 + `errors` 配列

### 204 を選んだ理由

削除完了後に返すべきデータがないため。200 で `{ message: "deleted" }` を返す実装も存在するが、
「削除したのにデータが返る」のは意味的に不自然。204 がより RESTful。

フロント側では `res.status === 204` のとき `.json()` を呼ばないよう `request()` 関数を修正した。

### 更新可能フィールド

`care_type` と `recorded_at` の2つを許可。
Strong Parameters で `params.require(:care_record).permit(...)` を使用。

---

## Railsの設計判断

### ネストしたルートとトップレベルルートの使い分け

```ruby
# トップレベル（dog_id 不要な操作）
resources :care_records, only: [:update, :destroy]

# ネスト（dog_id が必要な操作）
resources :dogs, only: [:create, :show] do
  resources :care_records, only: [:index, :create]
end
```

1つのコントローラーに2種類のルートが混在するのは Rails では自然なパターン。
`params` に何が入るか（`dog_id` があるか `id` だけかなど）でアクションごとに分岐する。

### `find_by` vs `find`

`find` は見つからないと `ActiveRecord::RecordNotFound` を raise して 500 になりうる（rescue_from で拾えば別）。
`find_by` は `nil` を返すので `unless record` で明示的に 404 を返せる。
このコントローラーでは全アクションで `find_by` を統一している。

---

## 言語化チェックリスト

- [x] なぜ update/destroy をネストせずトップレベルに置いたのか？
  - update/destroy は care_record の id だけで対象が特定できるため、dog_id は不要。`dogs/:dog_id` にネストする理由がない。

- [x] 404 と 403 の使い分けの考え方を説明できるか？
  - 403を返すと「そのIDのレコードが存在すること」が漏れる。404にすることで「そんなレコードは知らない」と答えられ、他人の記録の存在自体を隠せる。
  - 参考：401=未認証、403=認可エラー、404=見つからない

- [x] 204 No Content はいつ使うのか？200 との違いは？
  - 204は「成功したが返すボディがない」。200は「成功＋レスポンスボディあり」。
  - DELETE後に返すべきデータはないので204が適切。ステータスコードだけで成功が伝わる。
  - フロント側では `res.status === 204` のとき `.json()` を呼ばないよう処理が必要。

- [x] `@current_user.care_records.find_by` で認可が成立する理由を説明できるか？
  - JWTで「誰か（`@current_user`）」を特定するのは認証の部分。
  - `@current_user.care_records` のスコープが `WHERE user_id = 自分のID` を自動でかけるため、他人のIDを指定しても `nil` が返り404になる。JWTだけでは防げないケースをスコープが防いでいる。

- [x] Strong Parameters はなぜ必要か？`permit` と `require` の役割の違いは？
  - Mass Assignment脆弱性を防ぐため。`permit` で指定していないフィールド（例：`user_id`）を外から書き換えられないようにする。
  - `require(:care_record)` → リクエストJSONの `care_record` キーを要求する（構造の指定）
  - `permit(:care_type, :recorded_at)` → その中から受け取っていいカラムを制限する

- [x] `find_by` と `find` の違いと、このコードでどちらを使っているか？
  - このコードでは `find_by` を使用。
  - `find` → 見つからないと `ActiveRecord::RecordNotFound` を raise（rescue_fromで拾わないと500になる）
  - `find_by` → 見つからないと `nil` を返す → `unless record` で明示的に404を返せる
