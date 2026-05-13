# パッケージマネージャ選定：なぜnpmを選んだか

## 選定結果

**npm採用**。pnpm・yarnは不採用。

## 参考記事

- [pnpmを使ってみた（Zenn）](https://zenn.dev/saggggo/articles/dbd739508ac212)
- [メルカリ Monorepo開発におけるツール選定](https://engineering.mercari.com/blog/entry/20220518-aaa18f6b00/)

## パッケージマネージャの比較

| | npm | yarn | pnpm |
|---|---|---|---|
| 出自 | Node.js公式同梱 | Meta製（2016） | OSS（2017） |
| 主流度 | 最も歴史が長い | かつて主流 | 今のフロント界隈で主流寄り |
| 特徴 | シンプル・追加インストール不要 | 安定・ワークスペース機能 | 速い・ディスク節約（ハードリンク） |

## pnpmが速い・軽い仕組み

npmは各プロジェクトにnode_modulesをまるごとコピーする。  
pnpmはグローバルキャッシュに実体を1つ置き、各プロジェクトからハードリンクで参照する。

```
npm:  プロジェクトA/node_modules/react  ← 実体
      プロジェクトB/node_modules/react  ← 別の実体（コピー）

pnpm: ~/.pnpm-store/react              ← 実体（1つ）
      プロジェクトA/node_modules/react  ← ハードリンク
      プロジェクトB/node_modules/react  ← ハードリンク
```

「node_modulesを開かない」ではなく「コピーを作らない」が正確。

## pnpmの恩恵が出る条件

**複数のpackage.jsonが存在するモノレポ構成**のとき。

```
# 恩恵あり（モノレポ）
project/
  frontend/
    package.json   ← ReactなどJSの依存
  backend/
    package.json   ← NestJSなどJSの依存
  shared/
    package.json   ← 共通の型定義など
```

frontendとbackendとsharedそれぞれにReactなどが入っていたら、  
npmだと3コピー → pnpmならハードリンク1つで済む。

**マイクロサービスはリポジトリが分かれるため恩恵は薄い**（リポジトリをまたいだハードリンクはしない）。

## このプロジェクトでnpmを選んだ理由

```
manmaru-shiba/
  frontend/
    package.json   ← JSはここだけ
  backend/         ← Rails（Ruby）なのでpackage.jsonなし
```

- JSのpackage.jsonが1つしかない → pnpmのハードリンク共有が効かない
- pnpm自体を追加インストールする必要がある（npmはNode.jsに同梱）
- 規模に対してoverkill

**バックエンドもJSのモノレポなら pnpm + Turborepo を検討する。**

## UIパッケージを切り出すのはいつか

`components/ui/` とは別に `ui/package.json` として独立させるケース：

- 複数アプリ（管理画面・ユーザー向け・モバイル等）で同じUIコンポーネントを共有したい
- デザインシステムとして独立してバージョン管理したい

```
# 切り出す動機がある例
project/
  apps/
    admin/         ← 管理画面
    web/           ← ユーザー向け
  packages/
    ui/            ← 共通コンポーネント（Button, Card...）
      package.json
```

1アプリなら `components/ui/` に置くだけで十分。  
「アプリが増えたら考える」で個人開発〜小規模では問題ない。

## 言語化チェックリスト

- [x] pnpmが「速い」理由をハードリンクの仕組みで説明できるか

  コピーを作らずハードリンクで参照するため。速い理由は2つ：①ディスク書き込みが少ない（コピーしない）②2回目以降はグローバルキャッシュから参照するだけでダウンロード不要。  
  補足：依存関係のツリー構造やバージョン管理はシンボリックリンクが担っており、ハードリンクとは役割が分かれている。

- [x] モノレポとマルチリポの違いを説明できるか

  モノレポは1リポジトリで複数の `package.json` を持つ構成。マルチリポはそれぞれ別リポジトリに分離する構成。

- [x] このプロジェクトでnpmを選んだ理由を一言で言えるか

  バックエンドがRailsのためJSの `package.json` が1つしかなく、pnpmのハードリンク共有の恩恵がない。モノレポではなくシングルパッケージ構成のためnpmで十分。

- [x] UIパッケージを切り出す動機を具体例で言えるか

  管理画面やモバイルアプリでも同じ部品を使いたいとき。同じリポジトリ内に複数のアプリがあり共通UIコンポーネントを使いたい場合が切り出しのタイミング。1アプリだけなら `components/ui/` に置くだけで十分。
