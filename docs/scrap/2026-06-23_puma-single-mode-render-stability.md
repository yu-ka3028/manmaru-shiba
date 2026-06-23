# Puma single mode化・Render安定性の検討

**日付：** 2026-06-23
**フェーズ：** Phase 1（MVP実装）→ Phase 2（計測）

---

## やったこと

- Renderのスリープ問題とUptimeRobotによる対策の実現性を検討した
- Renderのメトリクスからメモリ・CPU使用状況を確認した
- Pumaのcluster modeが余分なメモリを消費していることを発見し、single modeに変更した
- DBの応答時間が4〜5秒かかっている問題を発見した（計測データとして記録）

---

## 技術的な判断

### Renderスリープ問題の現実

Renderの無料プランは15分アクセスがないとスリープする。
UptimeRobotで5分おきにpingすることで起こしておける方針だったが、時間枠が厳しい。

| 条件 | 時間 |
|---|---|
| 30日月の24時間稼働 | 720時間 |
| 31日月の24時間稼働 | 744時間 |
| 無料枠上限 | 750時間/月 |

月末に枯渇するリスクがある。対策の選択肢：

| 方法 | コスト | 現実性 |
|---|---|---|
| UptimeRobot + Render無料 | ¥0 | ギリギリ・不安定 |
| Render Starter | $7/月 | 確実 |
| Fly.io | ¥0（クレカ必要） | RAM 256MBでRailsにはリスク |

### Fly.ioを選ばない理由

- 無料枠はRAM 256MB → Renderの半分
- Railsは起動だけで150〜200MB使うため、OOMキルのリスクが高い
- OOMが起きると「スリープして遅い」ではなく「そもそも起動しない」になる
- Dockerization は問題ないが、メモリリスクがある

### Pumaのcluster modeとsingle mode

Renderのログに以下のwarningが出ていた：

```
! Running Puma in cluster mode with a single worker is often a misconfiguration.
! Consider running Puma in single-mode (workers = 0) in order to reduce memory overhead.
```

**cluster mode（変更前）**
- マスタープロセス（親）＋ワーカープロセス（子）の2プロセス構成
- Renderが環境変数 `WEB_CONCURRENCY=1` を自動設定していたため発動していた
- 親プロセス分のメモリが無駄になる

**single mode（変更後）**
- プロセス1つのみ
- スレッドは5本維持するので同時5リクエストまで捌ける
- 家族数人規模のアプリには十分

**single modeで限界になる規模感**

Pumaのスレッドが5本 → 同時5リクエストまで。ワーカーが必要になるのは数百人が同時アクセスするレベル。

RubyはGVL（グローバルロック）の制約でスレッドがCPUを並列使用できないが、DBクエリ待ち（I/Oバウンド）が主な処理なので、スレッドで十分カバーできる。

### DBの応答時間（計測データ）

```
POST /api/v1/auth/line → 4153ms（ActiveRecord: 2606ms）
POST /api/v1/auth/line → 5433ms（ActiveRecord: 1670ms）
GET  /api/v1/dogs/1/care_records → 953ms（ActiveRecord: 697ms）
```

LINEのwebhookタイムアウト（3秒）を認証が超えている。
Supabaseのコネクション確立に時間がかかっている可能性が高い（コールドスタート時の接続プール warm-up）。

→ Phase 2の計測で継続確認する。

---

## 言語化できるか

- [ ] Pumaのcluster modeとsingle modeの違いを説明できるか
- [ ] なぜワーカー1個のcluster modeが無駄なのかを説明できるか
- [ ] single modeでも同時リクエストを捌ける理由（スレッド）を説明できるか
- [ ] RubyのGVLとI/Oバウンドの関係を説明できるか
- [ ] Fly.ioをメモリ観点で選ばなかった理由を数字で説明できるか
- [ ] DBの応答時間4〜5秒の原因の仮説（Supabaseコネクションwarm-up）を説明できるか
