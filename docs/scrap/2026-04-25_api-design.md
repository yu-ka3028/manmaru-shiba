# API設計の議論ログ

**日付：** 2026-04-25  
**テーマ：** Rails API onlyのエンドポイント設計・HTTPメソッドの使い分け

---

## 決定事項まとめ

### エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/line` | LINEのIDトークンを検証してJWTを発行 |
| POST | `/api/v1/groups` | グループ作成 |
| POST | `/api/v1/groups/join` | 招待トークンでグループ参加 |
| POST | `/api/v1/dogs` | 犬を登録（アラート設定も自動生成） |
| GET | `/api/v1/dogs/:id` | 犬の情報取得 |
| POST | `/api/v1/dogs/:dog_id/care_records` | 記録を登録 |
| GET | `/api/v1/dogs/:dog_id/care_records` | タイムライン取得 |
| GET | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を取得 |
| PATCH | `/api/v1/dogs/:dog_id/alert_settings` | アラート設定を変更 |
| POST | `/webhooks/line` | LINEからのイベント受信 |

### HTTPメソッドの使い分け
- `PUT`：リソース全体を置き換える
- `PATCH`：リソースの一部だけ変更する
- アラート設定は `interval_hours` だけ変えることが多いので `PATCH` が適切

### alert_settingsにPOSTが不要な理由
- 犬を作成したタイミングでRailsのコールバック（`after_create`）でデフォルト値を自動生成する
- フロントから2回APIを叩く必要がなくなる
- `interval_hours` のデフォルト値は4時間

```ruby
class Dog < ApplicationRecord
  after_create :create_default_alert_settings

  def create_default_alert_settings
    alert_settings.create!(care_type: 'toilet', interval_hours: 4)
  end
end
```

### Railsの7アクションとAPI onlyの関係
- `new` と `edit` はHTMLフォームを返すためのアクション
- API onlyではフォーム表示はNext.jsの仕事なので不要
- `edit` と `update` が分かれている理由：「画面表示」と「データ処理」は別のHTTPリクエストだから

### API設計書を作る意義
- フロントバック分離では「このエンドポイントにこのJSONを投げたらこのJSONが返る」という契約書として必須
- フロントとバックを並行開発するために必要
- Rails onlyでも作れるが、フロントバック分離では重要度が上がる

---

## 言語化チェックリスト

- [ ] `PUT` と `PATCH` の違いを説明できるか
- [ ] `alert_settings` にPOSTが不要な理由を説明できるか
- [ ] `edit` と `update` が別アクションになっている理由を説明できるか
- [ ] API設計書がフロントバック分離で必須になる理由を説明できるか
