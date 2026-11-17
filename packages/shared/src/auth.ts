// 認證與權限(RBAC)相關的共用型別與常數。
// 設計參考 official-backend:users / roles / permissions 三主體,
// 中間以 user_role、role_permission 兩張中介表串接(多對多)。
// 簡化處:不做 official-backend 的多站台 source_id 與樹狀 permission_groups,
// 權限分組改用 permissions.groupCode 這個扁平欄位表示。

/**
 * 權限代號(程式判斷權限的唯一依據)。
 * 命名沿用 official-backend 的 `群組_對象_動作` 風格,方便日後對照。
 * 新增權限:在此加一筆 → 後端 seed 會自動同步進 permissions 表。
 */
export const PERMISSION_CODES = [
  // 遊戲
  'Game_Play', // 遊戲-進行遊戲
  'Game_Leaderboard_Search', // 遊戲-查看排行榜

  // 內容管理
  'ContentManage_Word_Search', // 內容管理-搜尋單字
  'ContentManage_Word_Create', // 內容管理-新增單字
  'ContentManage_Word_Edit', // 內容管理-編輯單字
  'ContentManage_Word_Delete', // 內容管理-刪除單字
  'ContentManage_Category_Search', // 內容管理-搜尋分類
  'ContentManage_Category_Create', // 內容管理-新增分類
  'ContentManage_Category_Edit', // 內容管理-編輯分類
  'ContentManage_Category_Delete', // 內容管理-刪除分類

  // 成績管理
  'ScoreManage_Score_Search', // 成績管理-搜尋所有成績
  'ScoreManage_Score_Delete', // 成績管理-刪除成績

  // 權限管理
  'PermissionManage_Role_Search', // 權限管理-搜尋角色
  'PermissionManage_Role_Create', // 權限管理-新增角色
  'PermissionManage_Role_Edit', // 權限管理-編輯角色
  'PermissionManage_Role_Delete', // 權限管理-刪除角色
  'PermissionManage_User_Search', // 權限管理-搜尋使用者
  'PermissionManage_User_Edit', // 權限管理-編輯使用者(指派角色)
] as const;

/** 權限代號的字面量聯集型別 */
export type PermissionCode = (typeof PERMISSION_CODES)[number];

/** 權限群組代號(僅用於後台分組顯示,不影響權限判斷) */
export type PermissionGroupCode =
  | 'Game'
  | 'ContentManage'
  | 'ScoreManage'
  | 'PermissionManage';

/** 權限的中文名稱與所屬群組(seed 與後台顯示共用) */
export interface PermissionMeta {
  code: PermissionCode;
  name: string;
  groupCode: PermissionGroupCode;
}

/** 權限群組的中文名稱 */
export const PERMISSION_GROUP_NAMES: Record<PermissionGroupCode, string> = {
  Game: '遊戲',
  ContentManage: '內容管理',
  ScoreManage: '成績管理',
  PermissionManage: '權限管理',
};

/** 全部權限的定義表;順序即後台顯示順序 */
export const PERMISSIONS: PermissionMeta[] = [
  { code: 'Game_Play', name: '進行遊戲', groupCode: 'Game' },
  { code: 'Game_Leaderboard_Search', name: '查看排行榜', groupCode: 'Game' },

  { code: 'ContentManage_Word_Search', name: '搜尋單字', groupCode: 'ContentManage' },
  { code: 'ContentManage_Word_Create', name: '新增單字', groupCode: 'ContentManage' },
  { code: 'ContentManage_Word_Edit', name: '編輯單字', groupCode: 'ContentManage' },
  { code: 'ContentManage_Word_Delete', name: '刪除單字', groupCode: 'ContentManage' },
  { code: 'ContentManage_Category_Search', name: '搜尋分類', groupCode: 'ContentManage' },
  { code: 'ContentManage_Category_Create', name: '新增分類', groupCode: 'ContentManage' },
  { code: 'ContentManage_Category_Edit', name: '編輯分類', groupCode: 'ContentManage' },
  { code: 'ContentManage_Category_Delete', name: '刪除分類', groupCode: 'ContentManage' },

  { code: 'ScoreManage_Score_Search', name: '搜尋所有成績', groupCode: 'ScoreManage' },
  { code: 'ScoreManage_Score_Delete', name: '刪除成績', groupCode: 'ScoreManage' },

  { code: 'PermissionManage_Role_Search', name: '搜尋角色', groupCode: 'PermissionManage' },
  { code: 'PermissionManage_Role_Create', name: '新增角色', groupCode: 'PermissionManage' },
  { code: 'PermissionManage_Role_Edit', name: '編輯角色', groupCode: 'PermissionManage' },
  { code: 'PermissionManage_Role_Delete', name: '刪除角色', groupCode: 'PermissionManage' },
  { code: 'PermissionManage_User_Search', name: '搜尋使用者', groupCode: 'PermissionManage' },
  { code: 'PermissionManage_User_Edit', name: '編輯使用者', groupCode: 'PermissionManage' },
];

// ---- 預設角色 ----

/** 內建角色代號 */
export const ROLE_ADMIN = 'admin';
export const ROLE_PLAYER = 'player';

/** 內建角色的定義(seed 用);isDefault 為新使用者註冊時自動掛上的角色 */
export interface RoleSeed {
  code: string;
  name: string;
  description: string;
  isDefault: boolean;
  permissions: PermissionCode[];
}

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    code: ROLE_ADMIN,
    name: '管理員',
    description: '擁有全部權限',
    isDefault: false,
    permissions: [...PERMISSION_CODES],
  },
  {
    code: ROLE_PLAYER,
    name: '玩家',
    description: '一般玩家:可遊玩、看排行榜與單字',
    isDefault: true,
    permissions: [
      'Game_Play',
      'Game_Leaderboard_Search',
      'ContentManage_Word_Search',
      'ContentManage_Category_Search',
    ],
  },
];

// ---- 對外 DTO ----

/** 一項權限 */
export interface Permission {
  id: number;
  code: PermissionCode;
  name: string;
  groupCode: PermissionGroupCode;
  sort: number;
}

/** 一個角色(含其權限) */
export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  permissions: Permission[];
}

/** 登入後回傳給前端的使用者資訊(絕不含密碼) */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  /** 使用者身上的角色 */
  roles: Array<Pick<Role, 'id' | 'code' | 'name'>>;
  /** 所有角色權限的聯集,已去重複;前端用它決定畫面能顯示什麼 */
  permissions: PermissionCode[];
  lastLoginAt: string | null;
  createdAt: string;
}

// ---- API 契約 ----

/** POST /api/auth/register */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/** POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** PUT /api/users/:id/roles 指派角色 */
export interface AssignRolesRequest {
  roleIds: number[];
}

/** POST /api/roles、PUT /api/roles/:id */
export interface UpsertRoleRequest {
  code: string;
  name: string;
  description?: string | null;
  permissionCodes: PermissionCode[];
}

/** 密碼規則(前後端共用,避免兩邊驗證不一致) */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt 上限
