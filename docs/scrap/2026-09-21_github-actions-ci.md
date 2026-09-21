# GitHub Actions CI

**日付：** 2026-09-21
**テーマ：** Rails APIとNext.jsの自動チェック

## 決定事項

- `main`向けPull Requestと`main`へのpushでCIを実行する。
- RailsとFrontendは独立したジョブとして並列実行する。
- RailsはGitHub Actions内のPostgreSQL 16を使用し、テストDBへmigrationを適用してMinitestを実行する。
- Frontendは`npm ci`、lint、buildを実行する。
- 本番DB、LINE API、Secretsには接続しない。
- CI用の権限は`contents: read`に限定する。
- 古い実行はキャンセルし、PRのフィードバックを早くする。

## 実行コマンド

- Backend: `bundle exec rails db:prepare` / `bundle exec rails test`
- Frontend: `npm ci` / `npm run lint` / `npm run build`

## 今後の確認

- GitHub Actions上でPostgreSQL接続とRailsテストが成功すること。
- Frontendのlint/buildが設定値なしで成功すること。
- 安定後、これらのジョブをmainへの必須チェックに設定する。
