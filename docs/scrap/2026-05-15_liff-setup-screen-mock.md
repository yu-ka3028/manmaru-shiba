# LIFF画面 /setup 初回セットアップ（モック）

**対応Issue：** #26  
**対応PR：** #34

---

## やったこと

`/setup` ページをモックデータで実装した。  
Next.js App Router + react-hook-form + Zod でフォームバリデーションを構成し、送信後は `/timeline` にリダイレクトする。

---

## 設計メモ

### この画面が表示されるタイミング

- LINEのBot友達追加 → チャットにLIFFリンクが届く → LIFFを開く
- LIFF SDK（Issue #29）が「グループ未所属」を検知したとき `/setup` にリダイレクトする
- `/setup` は「グループを作成する最初の1人」だけが使う画面
- 家族の2人目以降は `/join?token=xxx` から参加する

```
友達追加 → LIFFリンクを開く → グループ未所属？
                                    ↓ YES
                                  /setup（グループ名・犬の名前・誕生日を入力）
                                    ↓
                                  /timeline
                                  招待URLを共有
                                    ↓
                              家族 → /join?token=xxx
```

### フォーム実装の構成

| ライブラリ | 役割 |
|---|---|
| `react-hook-form` | フォームの状態管理・送信制御 |
| `zod` | バリデーションスキーマ定義 |
| `@hookform/resolvers/zod` | 2つのブリッジ |
| `react-day-picker` + shadcn `Calendar` | 誕生日の日付ピッカー |

モック段階では送信後にAPIを呼ばず、そのまま `/timeline` へリダイレクトする。

---

## 言語化チェックリスト

- [x] `/setup` は誰が・いつ・なぜ表示されるのか説明できるか

  LINE Botを友達追加してLIFFを開いたとき、グループ未所属が検知されると表示される。グループの親となるユーザーが飼い犬の初期登録をするための画面。

- [x] `react-hook-form` と `zod` の役割分担を説明できるか（なぜ2つ使うのか）

  react-hook-form はフォームの状態管理（入力値・エラー・送信状態）を担う。Zod はバリデーションのルール定義（APIへ送信前の防御壁）を担う。2つを使うのはそれぞれ役割が違うから。

- [x] `zodResolver` は何をしているか

  Zod の言語を react-hook-form が読み取れるように変換するアダプター。

- [x] `Popover` + `Calendar` の組み合わせで日付ピッカーを作る理由（ネイティブ `<input type="date">` との違い）

  OSに依存しないデザインを作れるから。LINE内ブラウザ（WebView）ではAndroidとiOSで `<input type="date">` のUIが大きく異なるため、shadcnのCalendarでデザインを統一した。

- [x] モック段階でAPIを呼ばない設計の意図は何か

  フロントとバックを分けて並行開発できる。まず画面を動かして確認し、段階的にAPIを繋いでいくことで、常に動いている状態を保ちながら開発できる。
