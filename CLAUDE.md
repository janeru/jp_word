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
