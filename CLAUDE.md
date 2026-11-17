# CLAUDE.md

給 Claude Code 的專案指南。**請一律使用繁體中文與使用者溝通。**

## 專案概述

日文單字射擊遊戲(Japanese Word Shooting Game)網頁版。玩家透過輸入單字讀音(羅馬拼音)「射擊」畫面上出現的日文單字目標,藉此練習日文單字。

## 架構:Monorepo (pnpm workspaces)

```
apps/web      前端  React 19 + Vite + TypeScript
apps/api      後端  Express 5 + TypeORM + PostgreSQL
packages/shared  前後端共用的 TypeScript 型別與常數
```

- 套件管理一律使用 **pnpm**(已設定 workspace)。
- 共用型別放在 `packages/shared`,前後端透過 `@jp-word/shared` 匯入,避免型別重複定義。

## 常用指令

於專案根目錄執行:

```bash
pnpm install          # 安裝所有 workspace 依賴
pnpm dev              # 同時啟動前端 + 後端
pnpm --filter web dev # 只啟動前端 (預設 http://localhost:5173)
pnpm --filter api dev # 只啟動後端 (http://localhost:3008)
pnpm build            # 建置全部
```

後端資料庫相關(於 `apps/api` 內):

```bash
pnpm --filter api migration:generate  # 產生 migration
pnpm --filter api migration:run       # 執行 migration
pnpm --filter api seed                # 灌單字/分類種子資料
pnpm --filter api seed:auth           # 同步權限與預設角色(啟動時也會自動跑)
pnpm --filter api leaderboard:rebuild # 從 Postgres 重建 Redis 排行榜 ZSET
```

## 開發約定

- **語言**:與使用者溝通一律用繁體中文;程式碼註解也用繁體中文。
- **型別優先**:任何跨前後端的資料結構(單字、遊戲結果、API 請求/回應)都定義在 `packages/shared`。
- **後端資料存取**:一律透過 TypeORM Entity 與 Repository,不要手寫原始 SQL(除非有效能考量並註記原因)。
- **環境變數**:後端設定放 `apps/api/.env`(參考 `.env.example`),切勿把真實密碼提交進版控。
- **API 路由**:REST 風格,前綴 `/api`。

## 資料庫

- PostgreSQL,連線設定見 `apps/api/.env`。
- TypeORM DataSource 定義於 `apps/api/src/data-source.ts`。
- Entity 放在 `apps/api/src/entities/`。

### 資料模型

- **words**:單字,去重複後只存一筆。
- **categories**:分類/主題,`group` 分 `basic`(基礎 10 類)與 `travel`(旅遊 4 類),`slug` 為程式用穩定代號。
- **word_categories**:單字與分類的**多對多**中介表(由 TypeORM `@JoinTable` 自動建立)。
  - 重點:有些單字同時屬於多個分類(例:「水」在 food + restaurant、「駅」在 location + directions),所以用多對多,**不要**在 word 上放單一 category 欄位。
- 種子資料:`apps/api/src/seed.ts` 內含 N5 共 14 分類、142 個去重複單字。以 `kanji || kana` 為鍵去重複並合併分類。執行:`pnpm --filter api seed`。

### 登入與權限(RBAC)

設計參考 official-backend,簡化後為五張表:

- **users**:帳號。`passwordHash` 用 bcrypt,Entity 上設 `select: false`,一般查詢不會帶出來。
- **roles**:角色,`code` 為程式用穩定代號(`admin`、`player`);`isDefault` 為新使用者註冊時自動掛上的角色。
- **permissions**:權限最小單位,以 `code` 判斷。資料由 seed 依 `packages/shared` 的 `PERMISSIONS` 定義表產生,**不透過 API 新增**(每個 code 都要有對應的程式碼在檢查它)。
- **user_role** / **role_permission**:兩張多對多中介表。使用者可有多個角色,權限取**聯集**。

與 official-backend 的差異(刻意簡化):不做多站台的 `source_id`,也不做樹狀的 `permission_groups`,權限分組改用 `permissions.groupCode` 扁平欄位。兩張中介表不做軟刪除,改用唯一索引防重複。

重點約定:

- **新增權限**:在 `packages/shared/src/auth.ts` 的 `PERMISSION_CODES` 與 `PERMISSIONS` 加一筆,重啟後端即自動同步進資料庫(`seedAuth` 是 idempotent 的,啟動時會跑)。
- **JWT 內只放 `sub` 與 `email`**,角色與權限每次請求都重查資料庫 → 管理員一改權限立即生效,不必等 token 過期。
- **token 只存 httpOnly cookie**,不放回應 body,前端讀不到也不保管。前端靠 `GET /api/auth/me` 還原登入狀態,不用 localStorage 判斷。
- **路由掛權限**:`auth.requirePermission('Xxx_Yyy_Zzz')`,見 `apps/api/src/http/authMiddleware.ts`。
- **身分不信任前端**:成績的 `playerName` / `userId` 一律由後端從登入者帶入,忽略 request body。
- 關卡進度目前仍存在瀏覽器 localStorage(`apps/web/src/progress/storage.ts`),**沒有**綁帳號。

第一位管理員由 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 環境變數在啟動時自動建立;沒有他就沒人能進權限管理。

## Redis(選用的加速層)

**沒設定 `REDIS_URL` 就整套停用,服務照常運作**(直接查 Postgres)。本機開發用 `docker run -d --name jpword-redis -p 6380:6379 redis:7-alpine`。

三個用途:

| 用途 | Key | 說明 |
|---|---|---|
| 權限快取 | `auth:user:{id}` | 省掉每個請求的五表 JOIN |
| 登入速率限制 | `rl:login:ip:{ip}`、`rl:login:email:{email}` | INCR + EXPIRE,超過上限回 429 |
| 排行榜 | `lb:global`(ZSET)、`lb:top:{limit}` | ZSET 提供 `ZREVRANK` 查名次 |

**最重要的三條約定:**

- **Postgres 永遠是真相來源**,Redis 只是加速層。ZSET 可用 `pnpm --filter api leaderboard:rebuild` 從資料表重建。
- **一律 fail-open**:所有 Redis 操作都經過 `withRedis()` 包裝,失敗時回 fallback 而非拋錯 —— 讀取當 cache miss 去查 DB,寫入靜默略過。速率限制也選 fail-open(失去保護但不會讓全站無法登入),正式環境應搭配告警。
- **改「角色」權限時,要清掉所有持有該角色的使用者快取**,不是單一使用者。這是最容易出錯的地方,已封裝在 `RoleService.invalidateRoleHolders()`;新增任何會影響權限的路徑時務必比照辦理。

權限快取為什麼不能用行程內記憶體:若跑多台 API,在 A 台改權限只會清掉 A 的記憶體,B 台會繼續拿舊權限放行,「撤銷立即生效」的保證就破了。快取必須共用。
