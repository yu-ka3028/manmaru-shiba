# LIFF URLのliff.stateを処理せずにリダイレクトしていたバグ

## 何が起きていたか

`liff.line.me/{LIFF_ID}/join?token=xxx` 形式のURLをLINEのトークから開くと、
joinページではなく `/setup`（新規犬の登録画面）に遷移してしまっていた。

## LIFFのURL構造を理解する

LIFF URLに続くパスは、ブラウザが受け取る段階では `liff.state` クエリパラメータに変換される。

```
開く URL:     https://liff.line.me/{LIFF_ID}/join?token=xxx
ブラウザ受取: https://manmaru-shiba.vercel.app/?liff.state=%2Fjoin%3Ftoken%3Dxxx
```

LIFF SDKが `liff.init()` を呼ぶと、`liff.state` を読んで
URLを `/join?token=xxx` に書き換える。

## バグの発生順序

1. ブラウザは `/?liff.state=/join?token=xxx` を受け取る
2. Next.jsのルートページ（`page.tsx`）がサーバーサイドで即座に `/timeline` へリダイレクト
3. `/timeline` でLIFFが初期化される（この時点で `liff.state` はURLから消えている）
4. `api.auth.line()` → `dogs: []` → `/setup` へリダイレクト
5. クライアントサイドのLIFF SDKが `liff.state` を処理する前に全部終わっていた

## 修正

### ルートページで `liff.state` を先読みしてリダイレクト

```typescript
// app/page.tsx
export default async function RootPage({ searchParams }) {
  const params = await searchParams
  const liffState = params["liff.state"]
  if (typeof liffState === "string" && liffState.startsWith("/")) {
    redirect(liffState) // /join?token=xxx へ直接リダイレクト
  }
  redirect("/timeline")
}
```

### 招待URLをLIFF URL形式に変更

直接URL（`https://manmaru-shiba.vercel.app/join?token=xxx`）だと
LINEの通常ブラウザとして開かれるため、LIFF認証が不安定になる場合がある。
`liff.line.me` 形式にすることでLIFFブラウザとして確実に開く。

```typescript
const inviteUrl = `https://liff.line.me/${liffId}/join?token=${inviteToken}`
```

## 言語化チェックリスト

- [ ] LIFF URLを開いたとき、ブラウザが最初に受け取るURLはどういう形式か？
- [ ] `liff.state` はどこから来て、誰が処理するのか？
- [ ] なぜサーバーサイドのリダイレクトが「LIFF SDKより先に」実行されるのか？
- [ ] `liff.line.me` 形式と直接HTTPSのURL、それぞれをLINEで開いたときの違いは？
