#!/bin/bash
# 一键部署：提交 source 分支，合并到 main，推送到 GitHub
set -e

MSG="${1:-更新网站}"

npm install --no-audit --no-fund 2>/dev/null
node build.js
git add -A
git commit -m "$MSG" || echo "没有新变更，跳过提交"
git push origin source
git checkout main
git merge source -m "合并：$MSG"
git push origin main
git checkout source
echo "部署完成"
