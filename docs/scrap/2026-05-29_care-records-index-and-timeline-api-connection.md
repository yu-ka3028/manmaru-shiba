# 作業ログ: CareRecordsController#index 実装 + /timeline API接続 #63 #64

## 実装内容

### Rails: CareRecordsController#index

- `GET /api/v1/dogs/:dog_id/care_records`
- 今日分（`beginning_of_day` 以降）の記録を `recorded_at: :desc` で返す
- `includes(:user)` でN+1を防ぐ
- 認可：`@current_user.dogs.find_by` で自分のグループの犬以外は404

### フロント: timeline/page.tsx

- ハードコードされた `timelineData` を削除し、APIから取得したデータに置き換え
- `care_type` → `ActivityType` のマッピングを `CARE_TYPE_MAP` に切り出し
- ローディング中：スケルトン（`animate-pulse` 3件）
- 0件時：「まだ記録がありません」空状態表示
- エラー時：エラーメッセージ表示
- `dogName` を API レスポンスから取得して `FamilyCircle` に渡す

### api.ts

- `careRecords.index(token, dogId)` エンドポイントを追加

---

## 設計のポイント

### なぜ `includes(:user)` を使うか
N+1クエリ対策。`records.map { |r| r.user.display_name }` をそのまま書くと
レコード件数分だけSQLが発行される（N+1）。`includes` で事前に `users` テーブルを
一括ロードして1+1本のクエリにまとめる。

### なぜ `beginning_of_day` で当日分のみ返すか
タイムラインは「今日の記録」を表示する用途。全件返すと将来的にパフォーマンス問題になりうる。
ページネーションは今後の課題（MVP段階では不要と判断）。

### なぜ `care_type` のマッピングをフロント側に置くか
`care_type` は Rails 側の内部表現（`pee`/`poop`/`meal`/`walk_short`/`walk_long`）。
表示ラベル（「おしっこ」「散歩」など）はUIの関心事なので、フロント側に閉じる。
Rails側に日本語を持つ必要はない。

### なぜ `useEffect` + `useState` パターンか
他の API 接続ページ（join, setup）と同じパターンに合わせた。
`accessToken` が確定してから非同期フェッチを走らせるために `useEffect([accessToken])` を使う。

### 認可の仕組み
`@current_user.dogs` は User モデルの `dogs` メソッドで定義されている：
```ruby
def dogs
  Dog.joins(group: :group_members).where(group_members: { user_id: id })
end
```
これにより「自分が所属するグループの犬」以外を `find_by` で見つけると `nil` → 404 を返す。
DogsController と全く同じパターン。

---

## 言語化チェックリスト

- [ ] なぜ `includes(:user)` を使うのか、N+1の仕組みと合わせて説明できるか
- [ ] `beginning_of_day` は何を返すか。タイムゾーンはどう扱われるか
- [ ] `@current_user.dogs` の認可ロジックをSQLに落として説明できるか
- [ ] `useEffect([accessToken])` の依存配列に `accessToken` を入れる理由は何か
- [ ] なぜ `care_type` のマッピングをフロント側に持たせるか（Rails側に置く案との比較）
- [ ] スケルトンUIと通常のローディングスピナーの使い分けは何か
