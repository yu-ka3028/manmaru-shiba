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

- [ ] なぜ update/destroy をネストせずトップレベルに置いたのか？
- [ ] 404 と 403 の使い分けの考え方を説明できるか？
- [ ] 204 No Content はいつ使うのか？200 との違いは？
- [ ] `@current_user.care_records.find_by` で認可が成立する理由を説明できるか？
- [ ] Strong Parameters はなぜ必要か？`permit` と `require` の役割の違いは？
- [ ] `find_by` と `find` の違いと、このコードでどちらを使っているか？
