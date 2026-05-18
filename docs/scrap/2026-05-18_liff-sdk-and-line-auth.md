# LIFF SDK 導入・LINE認証

**作業日：** 2026-05-18  
**対応Issue：** #29

---

## やったこと

- `@line/liff` SDK（すでにpackage.jsonに含まれていた）を使って認証フックを実装
- `hooks/use-liff.ts` に `useLiff` カスタムフックを作成
- 全LIFF画面（timeline / setup / join / settings）に認証ガードを追加
- 環境変数 `NEXT_PUBLIC_LIFF_ID` でLIFF IDを管理

---

## 設計の判断ポイント

### なぜカスタムフックにまとめたか

`liff.init()` は `useEffect` 内で1回だけ呼ぶ必要がある（SSR非対応 + 非同期）。
この処理を各ページにベタ書きすると4ページ分同じコードが散らばる。
カスタムフック（`useLiff`）に切り出すことで、呼び出し側はステートを受け取るだけでよくなる。

### 外部ブラウザの扱い

`liff.isInClient()` が `false` の場合（LINE外でURLを開いた場合）は `liff.login()` を呼ばずにフォールバック表示する。

理由：外部ブラウザで `liff.login()` を呼ぶとLINEのOAuth画面にリダイレクトされる。
認証自体は動くが、このアプリはLINEアプリ内での利用を前提としているため、外部ブラウザユーザーには「LINEアプリで開いてください」と伝える方が適切。

### `"use client"` が必要な理由

`liff.init()` はブラウザのAPIを使うためSSRでは動作しない。
Next.jsのApp RouterではデフォルトがServer Componentなので、`"use client"` を明示してクライアント側でのみ実行させる必要がある。

### 環境変数の `NEXT_PUBLIC_` プレフィックス

Next.jsでブラウザ側のJavaScriptからアクセスできる環境変数は `NEXT_PUBLIC_` で始まる必要がある。
ビルド時に値がバンドルに埋め込まれる。LIFF IDは公開情報なのでこれで問題ない。

---

## 実装の流れ（useLiff）

```
liff.init({ liffId })
  ↓
isInClient() === false → フォールバック（LINE外アクセス）
  ↓
isLoggedIn() === false → liff.login()（LINEログイン画面へリダイレクト）
  ↓
getProfile() → userId / displayName を取得
```

---

## 残タスク

- LIFF IDをLINE Developersコンソールで発行して `.env.local` に設定
- 実機（LINEアプリ）でのテスト

---

## 言語化チェックリスト

- [ ] LIFFとは何か、通常のWebアプリとどう違うか説明できるか
  > 
- [ ] `liff.init()` をなぜ `useEffect` 内で呼ぶのか説明できるか
  > 
- [ ] `"use client"` が必要な理由を説明できるか
  > 
- [ ] `NEXT_PUBLIC_` プレフィックスが必要な理由を説明できるか
  > 
- [ ] 外部ブラウザで `liff.isInClient()` が `false` になるとき何をすべきか、なぜ `liff.login()` を呼ばないのか説明できるか
  > 
- [ ] カスタムフックとして切り出した理由を説明できるか
  > 
