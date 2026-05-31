# タイムラインを過去24時間表示に変更・編集後に再ソート

## 何を変えたか

### 1. 表示範囲を「今日0時以降」→「過去24時間」に変更

**バックエンド** (`care_records_controller.rb`):

```ruby
# before
.where(recorded_at: Time.current.beginning_of_day..)

# after
.where(recorded_at: 24.hours.ago..)
```

### 2. 編集後に recorded_at で再ソート

**フロントエンド** (`timeline/page.tsx`):

```typescript
setRecords((prev) =>
  prev
    .map((r) => (r.id === editTarget.id ? toTimelineEntry(updated) : r))
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
)
```

### 3. セクションタイトルを「最近の{犬の名前}」に変更

## なぜ beginning_of_day ではダメだったか

`beginning_of_day` は「今日の0時」を起点にする。
深夜2時に記録した場合、翌朝4時には「昨日の記録」になって消えてしまう。
`24.hours.ago` にすることで0時をまたいでも直近24時間分が常に表示される。

## 言語化チェックリスト

- [ ] `Time.current.beginning_of_day` と `24.hours.ago` の違いを具体例で説明できるか
- [ ] 編集後に再ソートが必要な理由は？（API側でソートされていても何故フロントでも必要か）
- [ ] `sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())` が降順になる理由は？
