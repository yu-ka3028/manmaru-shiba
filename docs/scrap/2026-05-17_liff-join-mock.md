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

- [x] `useSearchParams` を Suspense でラップする理由を説明できるか
  - ビルド時（サーバー側でHTMLを生成する段階）ではURLが確定していないため、`useSearchParams` でトークンを読もうとするとエラーになる。`<Suspense>` でラップすることでその部分の描画を「保留」し、ブラウザ起動後（クライアント側）に準備が整ったタイミングで合流する形にする。Suspenseは「一時的に先送りにする」という意味で、描画タイミングをずらす仕組み。
- [x] Next.js の静的生成とクライアントサイドレンダリングの違いを説明できるか
  - 静的生成（ビルド時）はURLが存在しないためクエリパラメータが読めない。クライアントサイドレンダリングはブラウザでURLを開いた後に実行されるため、その時点でクエリパラメータにアクセスできる。
- [x] token が存在しないケースをフロント側でハンドリングしている理由は何か
  - tokenがURLにそもそもない場合は明らかに無効なリクエストなので、APIを呼ぶ前に即エラーを出す「最初のふるい」として機能させている。無駄なAPI通信を減らすUXの判断。tokenが存在するが無効（グループが存在しない・期限切れ）かどうかはサーバーしか知らないので、そちらはAPI接続後にサーバー側で検証する。フロントとバックで「判断に必要な情報がある場所で検証する」という分け方。
- [x] モックデータを定数で定義した理由と、API接続時の差し替え方針を説明できるか
  - APIがまだないので、まず画面が動く状態にするために定数でモックデータを用意した。API接続後は `MOCK_GROUP_NAME` 定数ごと消えて、サーバーから取得したグループ名に置き換わる（定数を変数に変えるのではなく、APIレスポンスに差し替える）。

## 補足：useRouter と useSearchParams の役割の違い

- `useRouter` → ボタンなどのイベントから**命令として遷移を発火する**（`router.push("/timeline")`）。`<Link>` がHTMLとして書く宣言的な方法に対して、JSのコードとして実行する命令的な方法。
- `useSearchParams` → URLの `?token=xxx` の部分を**読み取るだけ**。有無の判断はその戻り値が `null` かどうかを別のコードが見ている。「読み取り」と「判断」は別レイヤー。
