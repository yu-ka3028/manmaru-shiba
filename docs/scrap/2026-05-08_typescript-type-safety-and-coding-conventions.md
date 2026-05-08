# TypeScript の型安全とコーディング規約

**日付：** 2026-05-08
**テーマ：** TypeScript の型アサーション・`types/` ディレクトリ・コーディング規約の整理

---

## 決定事項まとめ

- `any` は使わない
- API レスポンスの型は `types/` にドメイン単位で定義する
- 型アサーション（`as`）は外部データとの境界でやむを得ず使う場合に限る。使う場合はコメントで理由を書く
- `"use client"` はクライアント状態が必要なときだけ付ける（デフォルトは Server Components）
- コーディング規約は `docs/rules/development_rules.md` にまとめる（設計ドキュメントと重複させない）

---

## 作業ログ

### TypeScript のコンパイルの仕組み

TypeScript はブラウザ・Node.js では動かせないため、JavaScript に変換してから実行する。

```
.ts ファイル → コンパイル → .js ファイル → Node.js / ブラウザで実行
```

| タイミング | 何が起きるか |
|---|---|
| VS Code でコードを書く | エディタ内蔵の TS サーバーがリアルタイムに型チェック（赤い波線） |
| `next dev` を実行 | SWC が型を除去して JS に変換（**型チェックは省略**） |
| `tsc` を実行 | 厳密な型チェック → JS に変換 |

`next dev` は型エラーがあっても動いてしまう。型チェックを厳密に行うには `tsc --noEmit` を使う。

### 型アサーション（`as`）とは

`as` は「この値はこの型だ」と TypeScript に断言する構文。型チェックを強制的に黙らせる。

```typescript
const el = document.getElementById('search') as HTMLInputElement
// TypeScript は getElementById が HTMLElement | null を返すと知っている
// でも HTML を自分で書いているので input だとわかっている → as で断言
```

**重要：`as` は実行時には何も変換しない。**
型のラベルを貼り替えるだけで、値は元のまま動く。

```typescript
const x = "hello" as unknown as number
// 実行時の x は "hello"（文字列のまま）
console.log(x + 1)  // "hello1"（エラーにならず変な値が出る）
```

型エラーより始末が悪いため、使用は最小限にとどめる。

### SQL の AS との違い

| | 何をするか |
|---|---|
| SQL の `AS` | 別名をつける（エイリアス）。実体は変わらない |
| TypeScript の `as` | 型を断言する。値は変わらない |

### `as` を使う正当な場面

TypeScript が「わからない」が開発者は「わかっている」状況。

```typescript
// 1. DOM 操作：getElementById は HTMLElement | null を返すが HTML を見ればわかる
const input = document.getElementById('search') as HTMLInputElement

// 2. 外部データ（fetch・JSON.parse）：TypeScript には中身がわからない
const data = JSON.parse(responseText) as User
```

このプロジェクトで最もよく出るのは Rails API のレスポンス。

### `types/` ディレクトリ

API レスポンスなど外部データの型をドメイン単位でまとめる場所。

```
types/
├── dog.ts      # Dog, CareRecord, AlertSetting
├── user.ts     # User, Group, GroupMember
└── api.ts      # APIレスポンス共通の型（エラー形式など）
```

```typescript
// types/dog.ts
type Dog = {
  id: number
  name: string
  birth_date: string | null
}

type CareRecord = {
  id: number
  dog_id: number
  care_type: 'meal' | 'walk_short' | 'walk_long' | 'pee' | 'poop'
  recorded_at: string
}
```

1型1ファイルにはしない。型が少ないうちは `types/index.ts` 1ファイルでも問題ない。

**`types/` の恩恵：** VS Code の補完とエラー検知。Rails 側でカラム名を変えたとき、`types/` の型を更新すればフロント全体の使用箇所が一斉に赤くなって気づける。

### `undefined` と `unknown` の違い

| | 何か |
|---|---|
| `undefined` | 「値がない」という値。データの形は表現できない |
| `unknown` | 「型がわからない」という型。アクセス前に絞り込みが必要 |

```typescript
const dog: unknown = data
dog.name  // エラー：unknown には何があるかわからないのでアクセス不可

const dog: Dog = data as Dog
dog.name  // OK：補完も効く
```

---

## 言語化チェックリスト

### TypeScript のコンパイル

- [ ] TypeScript が「コンパイルしてから実行」である理由を説明できるか
- [ ] `next dev` と `tsc` の型チェックの違いを説明できるか

### 型アサーション（`as`）

- [ ] `as` が「値を変換しない」ことを具体例で説明できるか
- [ ] SQL の `AS` と TypeScript の `as` の違いを説明できるか
- [ ] `as` を使う正当な場面を2つ以上挙げられるか
- [ ] `as` が「TypeScript の恩恵を自分で捨てる行為」である理由を説明できるか

### `types/` ディレクトリ

- [ ] `types/` を作る目的を「補完・エラー検知」で説明できるか
- [ ] `any` でなく `types/` に型を定義する利点を説明できるか
- [ ] `undefined` と `unknown` の違いを説明できるか
