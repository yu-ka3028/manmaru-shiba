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

- [x] LIFFとは何か、通常のWebアプリとどう違うか説明できるか
  > WebアプリをLINE上で開けるサービス。LINEアプリ内で開くと `liff.init()` がLINEのトークン情報を自動で引き継ぐため、ユーザーが改めてログインする必要がない。通常のWebアプリでは独自のログイン画面が必要なところを、LINEの認証基盤をそのまま使えるので導入コストが低い。
- [x] `liff.init()` をなぜ `useEffect` 内で呼ぶのか説明できるか
  > liff.init() はブラウザ側だけで動かしたい。そのままコンポーネントのトップレベルに書くとサーバー（SSR）でも実行されてしまう。useEffect の中に書くことでブラウザでのみ実行されるようにしている。また非同期処理（async/await）を扱う場所としても useEffect が適切。
- [x] `"use client"` が必要な理由を説明できるか
  > Next.js App Router ではデフォルトで全コンポーネントがサーバー側で実行される。`"use client"` を書くことでファイル全体をブラウザ限定にする。`useState` や `useEffect` はブラウザ側の機能なので、これがないと使えない。`"use client"` が前提にあって、その上に `useEffect` が乗るイメージ。
- [x] `NEXT_PUBLIC_` プレフィックスが必要な理由を説明できるか
  > サーバー側の環境変数をフロント（ブラウザ）でも使えるようにするための Next.js の定型文。付けないとブラウザ側では undefined になる。ビルド時にバンドルに埋め込まれるため、誰でも見られる値（公開情報）にしか使えないというトレードオフがある。
- [x] 外部ブラウザで `liff.isInClient()` が `false` になるとき何をすべきか、なぜ `liff.login()` を呼ばないのか説明できるか
  > `liff.login()` を呼べば技術的には認証できるが、このアプリはLINEアプリ内での利用を前提としているため、外部ブラウザユーザーには「LINEアプリで開いてください」と伝える方が体験として適切。動かないから呼ばないのではなく、動くけど体験として適切でないから呼ばない、という判断。
- [x] カスタムフックとして切り出した理由を説明できるか
  > 全画面でログイン状態による画面の出し分けが必要なため。4画面に同じ認証処理を書くと重複するので、useLiff カスタムフックに切り出して1か所にまとめた。
