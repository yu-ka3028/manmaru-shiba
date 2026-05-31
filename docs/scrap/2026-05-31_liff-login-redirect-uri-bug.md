# LIFF login() に redirectUri がなかったバグ

## 何が起きていたか

招待リンク（`/join?token=xxx`）を初回アクセス（LIFFアプリ未認証）で開いたとき、
`/setup`（新規犬の登録画面）に遷移してしまっていた。

## 原因

`use-liff.ts` の `liff.login()` に `redirectUri` を指定していなかった。

LIFF の認証フロー：
1. ユーザーが `/join?token=xxx` を開く
2. `liff.init()` 完了後、`liff.isLoggedIn()` が false（初回）
3. `liff.login()` を呼ぶ → LINE 認証画面へ遷移
4. 認証後、LIFF がリダイレクト先を決める
5. `redirectUri` の指定がないため、LIFF Developer Console に設定されたエンドポイント URL（`/`）に戻る
6. `/` → `/timeline` → `dogs: []` → `/setup` に遷移

## 修正

```typescript
// before
liff.login()

// after
liff.login({ redirectUri: window.location.href })
```

`window.location.href` を渡すことで、認証後に元の URL（`/join?token=xxx` など）に戻るようになる。

## 言語化チェックリスト

- [ ] `liff.isLoggedIn()` が false になるのはどんな状況？
- [ ] `liff.isInClient()` と `liff.isLoggedIn()` の違いは？
- [ ] `redirectUri` を指定しなかった場合、LIFF はどこに戻るか？
- [ ] この修正が効くのはどの状況に限られるか（外部ブラウザでは効かない理由は？）
