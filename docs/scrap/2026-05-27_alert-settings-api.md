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

- [ ] JWTとLIFF accessTokenの違いを説明できるか（何を認証しているか）
- [ ] `resource`（単数）と`resources`（複数）の違いと今回どちらを使ったか
- [ ] `find_or_initialize_by` とは何か。なぜ`find_or_create_by`ではないか
- [ ] `Promise.all` はなぜ使うか。`await` を2回書くのと何が違うか
- [ ] GoodJobのcron機能がPostgreSQLだけで動く理由
- [ ] なぜ`ENV.fetch("JWT_SECRET")`か。`ENV[]`との違いは
