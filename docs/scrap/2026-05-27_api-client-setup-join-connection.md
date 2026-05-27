# 作業ログ：APIクライアント基盤 + /setup・/join API接続

**日付：** 2026-05-27
**イシュー：** #60 #61 #62
**ブランチ：** feature/56-api-client-setup

---

## やったこと

### Railsコントローラ実装（#60）

- `GroupsController#create`：グループ作成 + オーナーとしてgroupメンバー追加
- `GroupsController#join`：invite_tokenでグループ検索 + メンバー追加
- `DogsController#create`：犬登録 + アラート設定を自動生成（pee/poop 各4時間）
- `DogsController#show`：犬情報取得

### フロントエンド（#61 #62）

- `lib/api.ts`：JWT付き共通APIクライアント実装
- `setup-client.tsx`：LIFF accessToken → JWT → グループ作成 → 犬登録 → /timeline へリダイレクト
- `join-client.tsx`：LIFF accessToken → JWT → グループ参加 → /timeline へリダイレクト

---

## 設計の議論・決定事項

### イシューの切り方

当初 #30「フロント→Rails API接続」を1イシューで立てていたが、実装内容が多いため分割した。
さらにバック・フロントを別イシューにして、PRでまとめてマージする運用に変更した。

```
Issue A（Rails側） + Issue B（フロント側） → 1つのPR
```

**理由：** タスクの担当分けが明確になる。将来チームになったときにも使いやすい。

### lib/api.ts の設計

```typescript
async function request<T>(path, options) { ... }

export const api = {
  auth: { line: (...) => request(...) },
  groups: { create: (...), join: (...) },
  dogs: { create: (...) },
}
```

- `request` 関数を内部に閉じてエクスポートしない
- `api.xxx.yyy()` 形式でドメインごとにグループ化
- `ApiError` クラスで `status` コードを保持（401・404・500の出し分けに使う）

### DogsController でアラート設定を自動生成する実装

```ruby
dog.save
AlertSetting::CARE_TYPES.each do |type|
  dog.alert_settings.create!(care_type: type, interval_hours: 4)
end
```

コールバック（`after_create`）ではなくコントローラで生成している。

### /join のグループ名表示

join前にグループ名を取得するエンドポイントがないため、「グループに参加しますか？」という汎用的な文言にした。
モックの `MOCK_GROUP_NAME = "田中家"` は削除。

### JoinContent への accessToken の渡し方

`JoinPage`（LIFF判定）で `useLiff()` を呼び、`accessToken` を props で `JoinContent` に渡している。
`JoinContent` は `useSearchParams()` を使うため `Suspense` の中に入れる必要があり、`useLiff()` は Suspense の外で呼ぶ必要があった。

---

## 言語化チェックリスト

- [ ] `lib/api.ts` で `ApiError` クラスを作った理由は？`fetch` が投げる `Error` をそのまま使わなかった理由は？

- [ ] `request` 関数の `token` パラメータを `headers` から分離した（`options & { token?: string }` の形にした）理由は？

- [ ] `api.xxx.yyy()` のオブジェクト形式にした理由は？関数を直接エクスポート（`export function createGroup()`）する方法と比べてどういうトレードオフがあるか？

- [ ] `DogsController#create` でアラート設定をコントローラで自動生成している。`after_create` コールバックで Dog モデルに書く方法と比べて、どちらがRailsらしいか？それぞれの使い分けの判断軸は？

- [ ] `GroupsController#join` で「すでにメンバー」チェックをコントローラで行っている（`group_members.exists?`）。モデルの `uniqueness: { scope: :group_id }` バリデーションがあれば十分では？両方必要な理由は？

- [ ] `/join` でグループ名を join 前に表示しなかった理由は？表示したい場合にどんなアプローチが考えられるか？

- [ ] `JoinContent` が Suspense の中にある理由は？`useSearchParams()` と Suspense の関係を説明できるか？
