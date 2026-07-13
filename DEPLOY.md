# 部署到 Render + Neon(免費線上 Demo)

採「**單一服務**」部署:後端 Express 同時托管前端 build 產物,對外只有一個網址、免處理 CORS;資料庫用 **Neon**(免費、不過期)的代管 PostgreSQL。

```
使用者 → [Render Web Service:Express 吐前端頁面 + 提供 /api] → [Neon PostgreSQL]
```

> 為什麼這樣配:Render 免費的 **Web Service 網域不會過期**(僅閒置會休眠);而 Render 免費的 Postgres 會過期,所以資料庫改用 **Neon**(免費且不過期)。

## 一、把程式碼推上 GitHub

```bash
cd /Users/jane/Desktop/jp_word
git add -A
git commit -m "日文單字射擊遊戲"
git push
```

> `.env`、`node_modules`、`dist` 已被 `.gitignore` 排除,不會外洩密碼。`.env.example` 是無密碼的範本,可以放心留著。

## 二、建立 Neon 資料庫(免費、不過期)

1. 到 <https://neon.tech> 用 GitHub 登入 → **Create project**
2. 複製它的 **Connection string**,格式類似:
   ```
   postgresql://使用者:密碼@ep-xxxx.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
   ```

## 三、建立 Render Web Service

1. 到 <https://render.com> 用 GitHub 登入 → **New + → Web Service** → 選 `jp_word` repo
2. 設定:

   | 欄位 | 值 |
   |------|-----|
   | Region | Singapore(離台灣近) |
   | Build Command | `pnpm install --no-frozen-lockfile && pnpm build:deploy` |
   | Start Command | `pnpm start` |
   | Instance Type | **Free** |

### 環境變數(Environment)

| 變數 | 值 | 說明 |
|------|-----|------|
| `NODE_ENV` | `production` | 讓後端托管前端頁面 |
| `AUTO_SEED` | `true` | 首次啟動若資料庫空的就自動灌 142 筆單字 |
| `DB_SYNCHRONIZE` | `true` | 自動建立資料表(Demo 用;正式專案改用 migration) |
| `DB_SSL` | `true` | Neon 需要 SSL |
| `DATABASE_URL` | Neon 的連線字串 | 上一步複製的那一串 |

> `PORT` 不用設,Render 會自動注入,程式會讀取。

## 四、部署並開啟

存檔後 Render 會自動部署。成功後 Logs 會出現:

```
✅ 資料庫連線成功
🌱 資料庫是空的,開始自動灌種子…
✅ 已建立 14 個分類、142 個單字
🚀 後端服務啟動…
```

打開 Render 給的 `https://xxx.onrender.com` 網址就是你的線上 Demo 🎉,把網址丟給朋友即可。

## 免費方案須知

- ✅ `onrender.com` 網域**不會過期**;Neon 資料庫也**不會過期**
- ⚠️ 免費 Web Service **閒置 15 分鐘會休眠**,下次有人開會**冷啟動約 30–50 秒**才回應(不是壞掉,等一下就好)

## 疑難排解

- **build 失敗 `ERR_PNPM_OUTDATED_LOCKFILE`**:Build Command 要加 `--no-frozen-lockfile`(見上)。
  或在本機 `pnpm install` 更新 `pnpm-lock.yaml` 後 commit/push,之後就能用 `pnpm install && pnpm build:deploy`。
- **打開是空白 / 404**:確認 `NODE_ENV=production`(否則後端不托管前端),且 Build Command 有跑 `pnpm build:deploy` 產生 `apps/web/dist`。
- **連不到資料庫**:確認 `DATABASE_URL` 正確、`DB_SSL=true`;必要時改用 Neon 的完整連線字串(含 `?sslmode=require`)。
- **資料是空的**:確認 `AUTO_SEED=true` 與 `DB_SYNCHRONIZE=true`。
- **口說挑戰沒反應**:語音辨識需 HTTPS(`onrender.com` 本身是 HTTPS,沒問題),用 Chrome/Edge/Safari 並允許麥克風。

## 更新網站

之後改了程式,只要 `git push`,Render 會自動重新部署。

## 本機測試 production 模式

```bash
pnpm --filter @jp-word/web build            # 先產生前端 dist
PORT=3009 NODE_ENV=production pnpm start     # 後端托管前端 + API(連本機或雲端 DB)
# 打開 http://localhost:3009
```
