# 部署到 Zeabur(免費線上 Demo)

本專案採「**單一服務**」部署:後端 Express 同時托管前端 build 產物,對外只有一個網址、免處理 CORS;再外接一個代管 PostgreSQL。

```
使用者 → [Zeabur 服務:Express 吐前端頁面 + 提供 /api] → [Zeabur PostgreSQL]
```

## 一、先把程式碼推上 GitHub

```bash
cd /Users/jane/Desktop/jp_word
git init
git add -A
git commit -m "feat: 日文單字射擊遊戲 (泡泡 + 口說模式)"
# 到 GitHub 建一個空 repo(例如 jp-word),再:
git remote add origin https://github.com/<你的帳號>/jp-word.git
git branch -M main
git push -u origin main
```

> `.env`、`node_modules`、`dist` 已被 `.gitignore` 排除,不會被推上去(密碼安全)。

## 二、在 Zeabur 建立專案

1. 到 <https://zeabur.com> 用 GitHub 登入,**New Project**。
2. **Add Service → Git**,選你剛推的 `jp-word` repo。
3. 再 **Add Service → Marketplace → PostgreSQL**,建立一個資料庫服務。

## 三、設定 App 服務

在 App 服務的 **Settings** 設定指令(Zeabur 會自動用 pnpm 安裝):

| 項目 | 值 |
|------|-----|
| Build Command | `pnpm build:deploy` |
| Start Command | `pnpm start` |

### 環境變數(Variables)

| 變數 | 值 | 說明 |
|------|-----|------|
| `NODE_ENV` | `production` | 讓後端托管前端頁面 |
| `AUTO_SEED` | `true` | 首次啟動若資料庫空的就自動灌 142 筆單字 |
| `DB_SYNCHRONIZE` | `true` | 自動建立資料表(Demo 用;正式專案改用 migration) |
| `DATABASE_URL` | `${POSTGRES_CONNECTION_STRING}` | 綁定上面的 PostgreSQL 服務(用 Zeabur 變數參照) |

> - `PORT` 不用設,Zeabur 會自動注入,程式會讀取。
> - Zeabur 內網 Postgres 免 SSL,不用設 `DB_SSL`。
>   (若改用 Neon 等外部 Postgres,需加 `DB_SSL=true`。)

## 四、開啟網域

App 服務 → **Networking / Domains** → **Generate Domain**,取得一個 `xxx.zeabur.app` 網址,打開就是你的線上 Demo 🎉

首次啟動流程會自動:建立資料表 → 灌種子 → 提供前端頁面與 API。

## 疑難排解

- **打開是空白 / 404**:確認 `NODE_ENV=production`(否則後端不會托管前端),且 Build Command 有跑 `pnpm build:deploy` 產生 `apps/web/dist`。
- **資料是空的**:確認 `AUTO_SEED=true` 與 `DB_SYNCHRONIZE=true`,並已正確綁定 `DATABASE_URL`。
- **口說挑戰沒反應**:語音辨識需 HTTPS(Zeabur 網域本身是 HTTPS,沒問題)、且用 Chrome/Edge/Safari 並允許麥克風。
- **連不到資料庫**:檢查 `DATABASE_URL` 是否正確參照到 PostgreSQL 服務。

## 本機測試 production 模式

```bash
pnpm --filter @jp-word/web build          # 先產生前端 dist
PORT=3009 NODE_ENV=production pnpm start   # 後端托管前端 + API
# 打開 http://localhost:3009
```
