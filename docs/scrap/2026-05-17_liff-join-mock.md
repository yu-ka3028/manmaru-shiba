# LIFF /join グループ参加画面（モック）実装ログ

**対応Issue：** #27  
**日付：** 2026-05-17

---

## 何をしたか

`/join?token=xxx` にアクセスした家族がグループに参加するための画面をモックデータで実装した。

---

## 実装のポイント

### useSearchParams と Suspense の関係

Next.js の App Router では `useSearchParams()` を使うコンポーネントは **必ず `<Suspense>` でラップ**する必要がある。

理由：`useSearchParams()` はクライアントサイドでのみクエリパラメータにアクセスできるため、静的生成（SSG）時にはパラメータが確定しない。Suspense でラップすることで、静的生成時はフォールバック UI を返し、クライアント側でハイドレーション後に実際のパラメータを読む構造になる。

```tsx
// NG: Suspense なしで useSearchParams を直接使うとビルドエラー
export default function JoinPage() {
  const searchParams = useSearchParams() // エラー
  ...
}

// OK: 内側コンポーネントを Suspense でラップ
function JoinContent() {
  const searchParams = useSearchParams() // OK
  ...
}

export default function JoinPage() {
  return (
    <Suspense fallback={...}>
      <JoinContent />
    </Suspense>
  )
}
```

### token バリデーション

モック段階での仕様：
- `token` クエリパラメータが存在しない → エラーメッセージを表示
- `token` が存在する → モックグループ名「田中家」を表示し、参加ボタンで `/timeline` へ遷移

API 接続時は、token の検証（有効期限・存在確認）をサーバー側で行う予定。

---

## 設計判断：モックデータの扱い

モック段階ではグループ名を定数 `MOCK_GROUP_NAME = "田中家"` として定義。
API 接続時に `useEffect` + fetch、または Server Component 経由に差し替える予定。

---

## 言語化チェックリスト

- [ ] `useSearchParams` を Suspense でラップする理由を説明できるか
- [ ] Next.js の静的生成とクライアントサイドレンダリングの違いを説明できるか
- [ ] token が存在しないケースをフロント側でハンドリングしている理由は何か
- [ ] モックデータを定数で定義した理由と、API接続時の差し替え方針を説明できるか
