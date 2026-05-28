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

- [x] `lib/api.ts` で `ApiError` クラスを作った理由は？`fetch` が投げる `Error` をそのまま使わなかった理由は？

  エラー内容によって処理を分岐したいから。`ApiError` に `status: number` を持たせることで、401なら未認証、404なら存在しないなどの出し分けができる。`fetch` が投げる `Error` はネットワーク障害のときだけで `status` を持っていない。HTTPレベルのエラー（401・404・500）はレスポンスが返ってきた時点では例外にならないため、自分で `throw` するときに `status` を一緒に持てるクラスが必要になる。

- [x] `request` 関数の `token` パラメータを `headers` から分離した（`options & { token?: string }` の形にした）理由は？

  2つの理由がある。①`token` がoptionalなので、JWTが不要な `/auth/line` はtokenなしでそのまま呼べる。②`Authorization: Bearer ${token}` という組み立ての詳細を `request` 関数の中に閉じ込めることで、呼び出し側はヘッダー名やBearerプレフィックスを知らなくて済む（隠蔽）。将来認証形式が変わっても `request` だけ直せばよい。

- [x] `api.xxx.yyy()` のオブジェクト形式にした理由は？関数を直接エクスポート（`export function createGroup()`）する方法と比べてどういうトレードオフがあるか？

  ドメインでグループ化できるのが最大のメリット。`api.groups.create()` / `api.groups.join()` のようにドメインが名前空間になるため、`api.` と打つだけでIDEがドメイン一覧を補完してくれる。関数直接エクスポートだとimportが増えるたびに列挙が長くなる。トレードオフとして、オブジェクト形式はTree-shaking（使っていない関数をビルドから除外する最適化）が効きにくいが、この規模では気にする必要はない。

- [x] `DogsController#create` でアラート設定をコントローラで自動生成している。`after_create` コールバックで Dog モデルに書く方法と比べて、どちらがRailsらしいか？それぞれの使い分けの判断軸は？

  モデル（`after_create`）の方がRailsらしい。「犬を作ったら必ずアラート設定が必要」はビジネスロジックであり、コントローラではなくモデルが持つべき知識。コントローラに書くと、Webhookやseedなど別の経路で犬を作ったときにアラート設定の生成を忘れるリスクがある。判断軸：この画面特有の処理はコントローラ、どの経路からでも必ず走るべき処理はモデル。

- [x] `GroupsController#join` で「すでにメンバー」チェックをコントローラで行っている（`group_members.exists?`）。モデルの `uniqueness: { scope: :group_id }` バリデーションがあれば十分では？両方必要な理由は？

  役割が違う。コントローラの `exists?` は「Already a member」という意味のあるエラーメッセージをフロントに返す関所。モデルの `uniqueness` はコントローラを経由しない書き込み（seedやコンソール操作）でもDBの整合性を守る最後の砦。どちらか1つが壊れても被害を最小化するためにDefense in Depthとして層を分けて守る。

- [x] `/join` でグループ名を join 前に表示しなかった理由は？表示したい場合にどんなアプローチが考えられるか？

  invite_tokenからグループ情報を取得するエンドポイントがないため。現在のAPIは `POST /api/v1/groups/join`（参加）しかなく、参加前にグループ名を取得する手段がない。表示したい場合のアプローチ：①`GET /api/v1/groups/preview?invite_token=xxx` のような読み取り専用エンドポイントを追加する、②招待URLにグループ名をクエリパラメータで埋め込む（`?token=xxx&name=田中家`）。

- [x] `JoinContent` が Suspense の中にある理由は？`useSearchParams()` と Suspense の関係を説明できるか？

  `useSearchParams()` はURLのクエリパラメータを読み取るhookだが、クエリパラメータはブラウザにしか存在せずサーバー側では値がわからない。Next.jsは `useSearchParams()` を使うコンポーネントを必ず `Suspense` で囲むよう要求しており、囲まないとページ全体のSSRが無効化される。`Suspense` で囲むことでその部分だけクライアント側で処理され、他はSSRを維持できる。`useLiff()` を `Suspense` の外の `JoinPage` で呼んでいるのは、`JoinContent`（Suspense内）で呼んでしまうと `accessToken` を外に渡せなくなるため。
