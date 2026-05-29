# ケア記録の編集・削除UI実装

**日付：** 2026-05-29
**対応Issue：** #66（フロント）、#65（バックエンド、前PR完了済み）

---

## 実装内容

タイムライン画面（`/timeline`）の各ケア記録カードに、編集・削除UIを繋ぎこんだ。

バックエンド（#65）・APIクライアント（`lib/api.ts`の`update`/`destroy`）はすでに実装済みで、今回はフロントのハンドラとダイアログのみ追加。

### 変更ファイル

- `frontend/app/timeline/page.tsx`

### 追加したUI

| コンポーネント | 役割 |
|---|---|
| `AlertDialog` | 削除前の確認ダイアログ（「この操作は取り消せません」） |
| `Dialog` | ケア種別を選ぶ編集ダイアログ（5種類のボタン） |

### state設計

```ts
const [authToken, setAuthToken] = useState<string | null>(null)
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
const [isDeleting, setIsDeleting] = useState(false)
const [editTarget, setEditTarget] = useState<{ id: string; care_type: string } | null>(null)
const [isUpdating, setIsUpdating] = useState(false)
```

- `authToken`：`api.auth.line()` 取得後に保持。update/destroyで再利用する
- `deleteTargetId`：`null` → ダイアログ非表示、IDセット → 表示。AlertDialogの `open` に直結
- `editTarget`：対象ID + 現在の `care_type` を保持。ダイアログ内のボタン選択と保存に使う

### フロー

**削除：**
1. ゴミ箱ボタン押下 → `setDeleteTargetId(entry.id)`
2. AlertDialog表示 → 確認 → `api.careRecords.destroy()` → `records` からfilter除去

**編集：**
1. 鉛筆ボタン押下 → `setEditTarget({ id, care_type })` で現在値をセット
2. Dialog表示 → ボタン選択で `editTarget.care_type` を更新
3. 保存 → `api.careRecords.update()` → レスポンスを `toTimelineEntry()` で変換して `records` を差し替え

### `TimelineEntry` への `care_type` 追加

編集ダイアログを開くとき、現在のケア種別（`care_type`文字列）が必要になる。
`TimelineEntry` はUIに最適化した型（`type: ActivityType`）に変換済みなので、元の `care_type` を別途保持するようにした。

---

## Phase 1 完了

このPRでロードマップのPhase 1（MVP実装）のチェックリストがすべて埋まった。
次はPhase 2（計測）へ。

---

## 言語化チェックリスト

- [x] なぜ `authToken` をstateに持つのか？useEffectの外で使うためだが、どういう理由でuseEffect内に閉じ込めなかったのか説明できるか
  - トークンは `useEffect` の中でしか取得できない。削除・編集のハンドラは `useEffect` の外にあるので、スコープをまたいで共有するためにstateに保持する。

- [x] `deleteTargetId` をstateにして `AlertDialog` の `open` に渡すパターンの意図を説明できるか
  - 「ダイアログの表示/非表示」と「削除対象のID」は常にセットで発生する。`deleteTargetId` がnullかどうかで両方を同時に表現できるので、stateを1つにまとめた方がシンプル。

- [x] 削除成功後に `setRecords(prev => prev.filter(...))` でUIを更新している理由（再fetchしない理由）を説明できるか
  - 削除するIDはボタンを押した時点でわかっている。APIが成功したらそのIDのレコードが消えたことは確定しているので、サーバーに再fetchする必要がない。「知らないことを知るため」に再fetchするが、今回は知らないことがない。

- [x] 編集ダイアログで「ボタン選択 → state更新 → 保存」の流れが、controlled componentの考え方とどう繋がるか説明できるか
  - controlled componentは「UIの状態はstateが正」という考え方。ボタンを押したら `editTarget.care_type` を更新し、保存時はそのstateの値を直接APIに渡す。DOMから値を取り出すステップがない。uncontrolledの場合は `useRef` でDOM要素を参照して値を取り出す。

- [x] `toTimelineEntry(updated)` でAPIレスポンスをそのまま変換して差し替えている理由を説明できるか
  - サーバーが保存した実際のデータを使うことで、フロントとDBのズレをなくすため。自分でstateを書き換えると `recorded_at` などサーバー側で更新された値が反映されない可能性がある。
