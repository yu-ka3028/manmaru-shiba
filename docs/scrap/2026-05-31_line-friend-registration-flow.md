# LINE友達登録フローの追加

## 背景・問題

招待リンクから `/join` を開いても、LINEのbot（公式アカウント）を友達追加していないとグループ参加ができない状態だった。

### なぜ友達登録なしでは参加できないか

`auth_controller.rb` の `line` アクションは、LINEのアクセストークンでプロフィールを取得した後、**DBにUserレコードが存在することを前提**としている。

```ruby
user = User.find_by(line_user_id: profile["userId"])
unless user
  render json: { error: "User not found. Please open the LINE bot first." }, status: :not_found
end
```

Userレコードはfollowイベント（友達追加）のWebhookで作られる設計になっている。

```ruby
def handle_follow(event)
  User.find_or_create_by(line_user_id: line_user_id) do |u|
    u.display_name = profile["displayName"]
    ...
  end
end
```

つまり「友達追加 → followイベント → Userレコード作成 → 認証可能」という順序が前提で、この順序を飛ばして参加ボタンを押すとバックエンドで404になっていた。

## 実装

### liff.getFriendship()

LIFFにはbotとの友達関係を取得するAPIがある。

```typescript
const { friendFlag } = await liff.getFriendship()
// friendFlag: true → 友達 / false → 未登録
```

これを `useLiff` フックの初期化時に並列実行し、`isFriend` として返す。

```typescript
const [p, friendship] = await Promise.all([
  liff.getProfile(),
  liff.getFriendship().catch(() => ({ friendFlag: true })), // 取得失敗時はブロックしない
])
```

失敗時に `true` にフォールバックしているのは、チャンネル設定の問題などで取得できない場合にユーザーを不当にブロックしないため。

### 友達追加ステップ

`isFriend === false` のとき `JoinPage` はグループ参加UIではなく `AddFriendStep` を表示する。

```tsx
{isFriend === false ? (
  <AddFriendStep onRecheckFriendship={recheckFriendship} />
) : (
  <JoinContent accessToken={accessToken} />
)}
```

`AddFriendStep` の2ステップ：

1. **「友達追加する」ボタン** → `liff.openWindow()` でLINEアプリ内の友達追加画面を開く
2. **「追加しました →」ボタン** → `recheckFriendship()` を呼んで再確認。`isFriend` が `true` になれば自動的にグループ参加UIに遷移

```typescript
liff.openWindow({ url: "https://line.me/R/ti/p/@152uuqjs", external: false })
```

`external: false` はLINEアプリ内ブラウザで開く指定。友達追加後に戻ってきたとき、LIFFページはそのまま維持されている。

## 設計上の判断

### なぜ「参加ボタンを押してからエラーを出す」のではなく「事前チェック」か

- エラーをバックエンドに到達させてから表示するよりも、フロントで事前チェックした方がユーザー体験がよい
- 「なぜ参加できないのか」を明確なUIで伝えられる（エラーメッセージより友達追加ボタンの方がわかりやすい）

### なぜUserレコードの作成をjoinフローに移さないか

- Userレコードの作成タイミングをfollowイベントに統一しておくことで、「友達追加 = アカウント作成」の責任の境界がはっきりする
- followイベントのWebhookではプロフィール情報（displayName, pictureUrl）もbotのServer-side APIで取得している。joinフローのアクセストークン経由でも同じ情報は取れるが、フローを混在させると複雑になる
- 結局、joinには友達登録が必要という業務ルールは変わらないので、フロントで先に誘導する方が自然

## 言語化チェックリスト

- [ ] なぜfollowイベントまでUserレコードが作られないのか説明できるか
- [ ] `liff.getFriendship()` がどのタイミングで呼ばれているか説明できるか
- [ ] フォールバック（`.catch(() => ({ friendFlag: true }))`）の理由を説明できるか
- [ ] `recheckFriendship` 関数の役割と、なぜ状態更新だけで画面遷移できるかを説明できるか
- [ ] `liff.openWindow({ external: false })` の `external: false` の意味を説明できるか
