#!/bin/bash
# ============================================
# Cloudflare 资源初始化脚本
# 用于一次性创建所有 Cloudflare 资源（D1、R2、KV、Pages 等）
# 使用方式：chmod +x scripts/init-cloudflare.sh && ./scripts/init-cloudflare.sh
# ============================================

set -e

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 输出辅助函数
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# 存储所有资源 ID 的临时文件
RESOURCE_FILE="/tmp/cloudflare-resources-$(date +%s).txt"

echo "=========================================="
echo "  Nova Blog - Cloudflare 资源初始化"
echo "=========================================="
echo ""

# ------------------------------------------
# 1. 检查 wrangler 是否安装
# ------------------------------------------
info "[1/9] 检查 wrangler CLI 是否已安装..."

if ! command -v wrangler &> /dev/null; then
    error "wrangler 未安装！"
    echo ""
    echo "请先安装 wrangler："
    echo "  npm install -g wrangler"
    echo ""
    echo "安装后重新运行此脚本。"
    exit 1
fi

WRANGLER_VERSION=$(wrangler --version 2>/dev/null || echo "unknown")
success "wrangler 已安装，版本: $WRANGLER_VERSION"

# ------------------------------------------
# 2. wrangler login
# ------------------------------------------
info "[2/9] 登录 Cloudflare 账号..."

# 检查是否已登录
if wrangler whoami &> /dev/null; then
    ACCOUNT_INFO=$(wrangler whoami 2>&1)
    success "已登录 Cloudflare 账号"
    echo "$ACCOUNT_INFO" | head -5
else
    warn "未登录 Cloudflare，即将打开浏览器进行授权..."
    wrangler login
    if [ $? -ne 0 ]; then
        error "登录失败，请重试。"
        exit 1
    fi
    success "Cloudflare 登录成功！"
fi

echo ""
echo "--- 资源创建开始 ---"
echo ""

# ------------------------------------------
# 3. 创建 D1 数据库
# ------------------------------------------
info "[3/9] 创建 D1 数据库..."

# 创建生产数据库
info "  创建生产数据库 blog-db..."
PROD_DB_OUTPUT=$(wrangler d1 create blog-db 2>&1 || true)
PROD_DB_ID=$(echo "$PROD_DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$PROD_DB_ID" ]; then
    success "  生产数据库 blog-db 创建成功，ID: $PROD_DB_ID"
    echo "PROD_DB_ID=$PROD_DB_ID" >> "$RESOURCE_FILE"
else
    # 如果数据库已存在，尝试获取 ID
    warn "  生产数据库 blog-db 可能已存在，跳过创建"
    echo "PROD_DB_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# 创建 Staging 数据库
info "  创建预发布数据库 blog-db-staging..."
STAGING_DB_OUTPUT=$(wrangler d1 create blog-db-staging 2>&1 || true)
STAGING_DB_ID=$(echo "$STAGING_DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$STAGING_DB_ID" ]; then
    success "  预发布数据库 blog-db-staging 创建成功，ID: $STAGING_DB_ID"
    echo "STAGING_DB_ID=$STAGING_DB_ID" >> "$RESOURCE_FILE"
else
    warn "  预发布数据库 blog-db-staging 可能已存在，跳过创建"
    echo "STAGING_DB_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# ------------------------------------------
# 4. 创建 R2 存储桶
# ------------------------------------------
info "[4/9] 创建 R2 存储桶..."

# 创建生产 R2 存储桶
info "  创建生产存储桶 blog-assets..."
if wrangler r2 bucket create blog-assets 2>&1 | grep -q "created"; then
    success "  生产存储桶 blog-assets 创建成功"
else
    warn "  生产存储桶 blog-assets 可能已存在，跳过"
fi

# 创建 Staging R2 存储桶
info "  创建预发布存储桶 blog-assets-staging..."
if wrangler r2 bucket create blog-assets-staging 2>&1 | grep -q "created"; then
    success "  预发布存储桶 blog-assets-staging 创建成功"
else
    warn "  预发布存储桶 blog-assets-staging 可能已存在，跳过"
fi

# ------------------------------------------
# 5. 创建 KV 命名空间
# ------------------------------------------
info "[5/9] 创建 KV 命名空间..."

# 创建生产 CACHE 命名空间
info "  创建生产 CACHE 命名空间..."
CACHE_OUTPUT=$(wrangler kv namespace create CACHE 2>&1 || true)
PROD_CACHE_ID=$(echo "$CACHE_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$PROD_CACHE_ID" ]; then
    success "  生产 CACHE 命名空间创建成功，ID: $PROD_CACHE_ID"
    echo "PROD_CACHE_KV_ID=$PROD_CACHE_ID" >> "$RESOURCE_FILE"
else
    warn "  生产 CACHE 命名空间可能已存在，跳过"
    echo "PROD_CACHE_KV_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# 创建生产 AUTH 命名空间
info "  创建生产 AUTH 命名空间..."
AUTH_OUTPUT=$(wrangler kv namespace create AUTH 2>&1 || true)
PROD_AUTH_ID=$(echo "$AUTH_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$PROD_AUTH_ID" ]; then
    success "  生产 AUTH 命名空间创建成功，ID: $PROD_AUTH_ID"
    echo "PROD_AUTH_KV_ID=$PROD_AUTH_ID" >> "$RESOURCE_FILE"
else
    warn "  生产 AUTH 命名空间可能已存在，跳过"
    echo "PROD_AUTH_KV_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# 创建 Staging CACHE 命名空间
info "  创建预发布 CACHE 命名空间..."
STAGING_CACHE_OUTPUT=$(wrangler kv namespace create CACHE --env=staging 2>&1 || true)
STAGING_CACHE_ID=$(echo "$STAGING_CACHE_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$STAGING_CACHE_ID" ]; then
    success "  预发布 CACHE 命名空间创建成功，ID: $STAGING_CACHE_ID"
    echo "STAGING_CACHE_KV_ID=$STAGING_CACHE_ID" >> "$RESOURCE_FILE"
else
    warn "  预发布 CACHE 命名空间可能已存在，跳过"
    echo "STAGING_CACHE_KV_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# 创建 Staging AUTH 命名空间
info "  创建预发布 AUTH 命名空间..."
STAGING_AUTH_OUTPUT=$(wrangler kv namespace create AUTH --env=staging 2>&1 || true)
STAGING_AUTH_ID=$(echo "$STAGING_AUTH_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+' || echo "")
if [ -n "$STAGING_AUTH_ID" ]; then
    success "  预发布 AUTH 命名空间创建成功，ID: $STAGING_AUTH_ID"
    echo "STAGING_AUTH_KV_ID=$STAGING_AUTH_ID" >> "$RESOURCE_FILE"
else
    warn "  预发布 AUTH 命名空间可能已存在，跳过"
    echo "STAGING_AUTH_KV_ID=<需要手动填入>" >> "$RESOURCE_FILE"
fi

# ------------------------------------------
# 6. 执行数据库迁移
# ------------------------------------------
info "[6/9] 执行数据库迁移..."

BACKEND_DIR="packages/backend"

if [ -d "$BACKEND_DIR/migrations" ]; then
    # 本地数据库迁移
    info "  执行本地数据库迁移..."
    (cd "$BACKEND_DIR" && wrangler d1 migrations apply blog-db --local)
    success "  本地数据库迁移完成"

    # Staging 远程数据库迁移
    info "  执行预发布环境远程数据库迁移..."
    (cd "$BACKEND_DIR" && wrangler d1 migrations apply blog-db-staging --remote --env=staging)
    success "  预发布环境数据库迁移完成"

    # 生产环境迁移 - 需要确认
    echo ""
    warn "  生产环境数据库迁移需要手动确认执行："
    echo "    cd $BACKEND_DIR && wrangler d1 migrations apply blog-db --remote --env=production"
    echo ""
    read -p "  是否现在执行生产环境迁移？(y/N): " CONFIRM_MIGRATE
    if [ "$CONFIRM_MIGRATE" = "y" ] || [ "$CONFIRM_MIGRATE" = "Y" ]; then
        (cd "$BACKEND_DIR" && wrangler d1 migrations apply blog-db --remote --env=production)
        success "  生产环境数据库迁移完成"
    else
        warn "  已跳过生产环境迁移，请稍后手动执行"
    fi
else
    warn "  未找到迁移文件目录 ($BACKEND_DIR/migrations)，跳过迁移"
fi

# ------------------------------------------
# 7. 设置 Worker Secrets
# ------------------------------------------
info "[7/9] 设置 Worker Secrets..."

echo ""
echo "  请输入以下密钥值（输入内容不会显示）："
echo ""

# 生成随机 JWT_SECRET（如果用户不提供）
read -sp "  JWT_SECRET（留空则自动生成）: " JWT_SECRET_VALUE
echo ""
if [ -z "$JWT_SECRET_VALUE" ]; then
    JWT_SECRET_VALUE=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -plain -cols 32)
    info "  已自动生成 JWT_SECRET"
fi

# 生成随机 ADMIN_PASSWORD（如果用户不提供）
read -sp "  ADMIN_PASSWORD（留空则自动生成）: " ADMIN_PASSWORD_VALUE
echo ""
if [ -z "$ADMIN_PASSWORD_VALUE" ]; then
    ADMIN_PASSWORD_VALUE=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64)
    info "  已自动生成 ADMIN_PASSWORD"
fi

# R2 访问密钥
read -sp "  R2_PUBLIC_ACCESS_KEY（留空跳过）: " R2_PUBLIC_KEY
echo ""
read -sp "  R2_SECRET_ACCESS_KEY（留空跳过）: " R2_SECRET_KEY
echo ""

# 设置生产环境 Secrets
info "  设置生产环境 Worker Secrets..."
echo "$JWT_SECRET_VALUE" | wrangler secret put JWT_SECRET --env=production
echo "$ADMIN_PASSWORD_VALUE" | wrangler secret put ADMIN_PASSWORD --env=production
if [ -n "$R2_PUBLIC_KEY" ]; then
    echo "$R2_PUBLIC_KEY" | wrangler secret put R2_PUBLIC_ACCESS_KEY --env=production
fi
if [ -n "$R2_SECRET_KEY" ]; then
    echo "$R2_SECRET_KEY" | wrangler secret put R2_SECRET_ACCESS_KEY --env=production
fi
success "  生产环境 Worker Secrets 设置完成"

# 设置 Staging 环境 Secrets
info "  设置预发布环境 Worker Secrets..."
echo "$JWT_SECRET_VALUE" | wrangler secret put JWT_SECRET --env=staging
echo "$ADMIN_PASSWORD_VALUE" | wrangler secret put ADMIN_PASSWORD --env=staging
if [ -n "$R2_PUBLIC_KEY" ]; then
    echo "$R2_PUBLIC_KEY" | wrangler secret put R2_PUBLIC_ACCESS_KEY --env=staging
fi
if [ -n "$R2_SECRET_KEY" ]; then
    echo "$R2_SECRET_KEY" | wrangler secret put R2_SECRET_ACCESS_KEY --env=staging
fi
success "  预发布环境 Worker Secrets 设置完成"

# 保存密钥信息到资源文件（不保存实际值，仅做提醒）
echo "JWT_SECRET=<已设置>" >> "$RESOURCE_FILE"
echo "ADMIN_PASSWORD=<已设置>" >> "$RESOURCE_FILE"

# ------------------------------------------
# 8. 创建 Pages 项目
# ------------------------------------------
info "[8/9] 创建 Pages 项目..."

# 创建生产 Pages 项目
info "  创建生产 Pages 项目 nova-blog-frontend..."
wrangler pages project create nova-blog-frontend --production-branch=main 2>&1 || \
    warn "  生产 Pages 项目可能已存在，跳过"
success "  生产 Pages 项目创建完成"

# 创建 Staging Pages 项目
info "  创建预发布 Pages 项目 nova-blog-frontend-staging..."
wrangler pages project create nova-blog-frontend-staging --production-branch=develop 2>&1 || \
    warn "  预发布 Pages 项目可能已存在，跳过"
success "  预发布 Pages 项目创建完成"

# ------------------------------------------
# 9. 输出所有资源 ID
# ------------------------------------------
info "[9/9] 输出所有资源 ID..."

echo ""
echo "=========================================="
echo "  初始化完成！所有资源 ID 汇总"
echo "=========================================="
echo ""
cat "$RESOURCE_FILE"
echo ""

echo "=========================================="
echo "  后续操作指南"
echo "=========================================="
echo ""
echo "1. 更新 wrangler.toml 中的占位符 ID："
echo "   文件路径: packages/backend/wrangler.toml"
echo ""
echo "   需要替换的占位符："
echo "   - placeholder-local-dev       -> 本地开发 D1 数据库 ID"
echo "   - placeholder-staging-db-id   -> 预发布 D1 数据库 ID: $STAGING_DB_ID"
echo "   - placeholder-prod-db-id      -> 生产 D1 数据库 ID: $PROD_DB_ID"
echo "   - placeholder-cache-kv-id     -> 生产 CACHE KV ID: $PROD_CACHE_ID"
echo "   - placeholder-auth-kv-id      -> 生产 AUTH KV ID: $PROD_AUTH_ID"
echo "   - placeholder-staging-cache-kv-id -> 预发布 CACHE KV ID: $STAGING_CACHE_ID"
echo "   - placeholder-staging-auth-kv-id  -> 预发布 AUTH KV ID: $STAGING_AUTH_ID"
echo "   - placeholder-prod-cache-kv-id    -> 生产 CACHE KV ID: $PROD_CACHE_ID"
echo "   - placeholder-prod-auth-kv-id     -> 生产 AUTH KV ID: $PROD_AUTH_ID"
echo ""
echo "2. 将以下值添加到 GitHub Repository Secrets："
echo "   Settings -> Secrets and variables -> Actions -> New repository secret"
echo ""
echo "   必需的 Secrets："
echo "   CLOUDFLARE_API_TOKEN              - Cloudflare API Token"
echo "   CLOUDFLARE_ACCOUNT_ID             - Cloudflare Account ID"
echo "   JWT_SECRET                        - JWT 签名密钥"
echo "   ADMIN_PASSWORD                    - 管理员密码"
echo "   JWT_SECRET_STAGING                - Staging JWT 签名密钥"
echo "   ADMIN_PASSWORD_STAGING            - Staging 管理员密码"
echo "   R2_PUBLIC_ACCESS_KEY              - R2 公开访问密钥（可选）"
echo "   R2_SECRET_ACCESS_KEY              - R2 秘密访问密钥（可选）"
echo ""
echo "3. 配置自定义域名（在 Cloudflare Dashboard 中操作）："
echo ""
echo "   前端 Pages 域名："
echo "     - blog.example.com           -> nova-blog-frontend.pages.dev"
echo "     - staging.blog.example.com   -> nova-blog-frontend-staging.pages.dev"
echo ""
echo "   后端 Worker 域名（wrangler.toml routes 中已配置）："
echo "     - api.blog.example.com       -> nova-blog-api"
echo "     - staging-api.blog.example.com -> nova-blog-api-staging"
echo ""
echo "   DNS 记录："
echo "     - blog.example.com           -> CNAME -> nova-blog-frontend.pages.dev (Proxied)"
echo "     - staging.blog.example.com   -> CNAME -> nova-blog-frontend-staging.pages.dev (Proxied)"
echo "     - api.blog.example.com       -> CNAME -> nova-blog-api.<account>.workers.dev (Proxied)"
echo "     - staging-api.blog.example.com -> CNAME -> nova-blog-api-staging.<account>.workers.dev (Proxied)"
echo ""
echo "4. 资源 ID 已保存到临时文件：$RESOURCE_FILE"
echo ""
success "初始化脚本执行完毕！"
