# アラート設定API・設定画面API接続

**作成日：** 2026-05-27
**関連Issue：** #8（排泄アラート）、#53（排泄アラート定期送信）

---

## 今回やったこと

- 排泄アラートのうち「設定画面でpee/poopの時間を変更できる」部分を実装
- 「定期実行してLINE通知を送る」部分はMVPから外し、Issue #53として別立て

---

## 設計の決定事項

### なぜ定期実行をMVPから外したか

当初GoodJobを未導入にした理由は「webhookの応答時間が遅くなったら非同期化するため（計測後に判断）」だった。
アラートの定期実行には別の仕組みが必要で、それは最初の設計では未検討だった。
MVPスコープを「設定値を保存・取得できること」に絞り、通知送信は計測フェーズ後に検討する。

### JWTをどこで発行するか

LIFFはすでに認証済みのユーザーのアクセストークン（`liff.getAccessToken()`）を持っている。
このトークンでLINEの `/v2/profile` を叩けばユーザーの `line_user_id` が取得できる。
これをDBのUsersテーブルと照合してJWTを発行する。

```
LIFF → accessToken → POST /api/v1/auth/line → JWTを返す
```

### JWTの秘密鍵の管理

`ENV.fetch("JWT_SECRET")` を使う。既存のLINE_CHANNEL_SECRETと同じパターン。
Railsのcredentials.yml.encは開発環境でmaster.keyが必要になるため、ENV変数の方がシンプル。

### アラート設定APIの認可

`@current_user.dogs.find_by(id: params[:dog_id])` で取得する。
userに紐づくdogのみアクセスできるので、他グループのdogは自然に弾ける。
`user.dogs` はGroupMembersを経由したJOINで実装されている。

### 設定画面でdog_idをどう取得するか

`/api/v1/auth/line` のレスポンスに `dogs` を含める。
設定画面は最初の1匹を使う（MVP段階では多頭飼い対応は不要）。

```json
{
  "token": "jwt...",
  "dogs": [{ "id": 1, "name": "まる" }]
}
```

### PATCHをpeeとpoopで2回叩く理由

ルート定義が `resource :alert_settings`（単数）で `care_type` パラメータで区別する設計になっていた。
保存ボタン1回でpee/poop両方を更新するため `Promise.all` で並列リクエストする。

---

## 言語化チェックリスト

- [x] JWTとLIFF accessTokenの違いを説明できるか（何を認証しているか）
  > JWTはRails側でJWT_SECRETを使って発行・管理する。フロントにはパスポートのように「認証OK」の証として渡すが、秘匿情報（JWT_SECRET）はサーバーから出ない。ペイロードにはDBのuser_idが入っている。
  > LIFF accessTokenはLINEが発行するトークン。「このユーザーはLINEで認証済み」を証明する。ただしline_user_id自体はトークンに含まれておらず、このトークンを使ってLINEの /v2/profile を叩いて初めてline_user_idが取得できる。
- [x] `resource`（単数）と`resources`（複数）の違いと今回どちらを使ったか
  > `resources`（複数）は同じ種類のレコードが複数あって、どれか1つを特定するために `:id` がURLに入る。`resource`（単数）はその文脈で1つしか存在しないのでURLに `:id` が入らない。今回は `resource :alert_settings` を使った。犬（`:dog_id`）が決まればアラート設定も一意に決まるため `:id` 不要。
- [x] `find_or_initialize_by` とは何か。なぜ`find_or_create_by`ではないか
  > `find_or_initialize_by` は該当レコードがなければメモリ上に作るだけでDBには保存しない。値を全部セットしてから `.save` を呼ぶことでバリデーションを通してから保存できる。`find_or_create_by` はブロックで必要な値が全部揃う前提でsaveまで一気にやる。AlertSettingには `interval_hours presence: true` のバリデーションがあるため、属性をセットする前にINSERTしようとする `find_or_create_by` だとバリデーションエラーになる。
- [x] `Promise.all` はなぜ使うか。`await` を2回書くのと何が違うか
  > `await` を2回書くと順番に実行される（peeが終わってからpoopが始まる）。`Promise.all` は複数の処理を同時にスタートさせて両方終わるまで待つ。peeとpoopは互いに依存していないので並行して処理できる。合計時間が「pee+poop」ではなく「長い方の時間」で済む。
- [x] GoodJobのcron機能がPostgreSQLだけで動く理由
  > GoodJobはジョブをRedisではなくPostgreSQLのテーブルに保存する。SidekiqはRedisが別途必要だが、GoodJobはすでに使っているSupabase（PostgreSQL）だけで完結するのでRedisのコストがゼロ。
- [x] なぜ`ENV.fetch("JWT_SECRET")`か。`ENV[]`との違いは
  > `ENV[]` は環境変数が設定されていなければ `nil` を返してそのまま動き続ける。`ENV.fetch` は設定されていなければ起動時点で `KeyError` を出してクラッシュする。JWT_SECRETがnilのまま動くとJWTの署名がおかしくなってから気づくことになるため、設定漏れを早期に検出するために `ENV.fetch` を使う。
