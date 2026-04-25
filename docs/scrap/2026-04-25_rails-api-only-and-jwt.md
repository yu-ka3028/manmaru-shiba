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
