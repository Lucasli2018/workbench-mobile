-- Workbench Mobile 云端同步 schema（D1）
-- 部署：wrangler d1 execute dev --remote --file=./schema.sql
-- 所有表带前缀 wbm_。

CREATE TABLE IF NOT EXISTS wbm_users (
  name     TEXT PRIMARY KEY,        -- 用户名（2-16 字符）
  pw_hash  TEXT NOT NULL,           -- 格式: <saltB64>:<pbkdf2Hex>
  created  INTEGER NOT NULL,
  data     TEXT NOT NULL DEFAULT '{}'  -- 整包应用数据（模块 + __* 元数据）的 JSON
);

CREATE TABLE IF NOT EXISTS wbm_sessions (
  token TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  exp   INTEGER NOT NULL            -- 过期时间戳（ms）
);

CREATE INDEX IF NOT EXISTS idx_wbm_sessions_name ON wbm_sessions(name);
CREATE INDEX IF NOT EXISTS idx_wbm_users_name    ON wbm_users(name);
