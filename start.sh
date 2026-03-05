#!/bin/bash
# LiveSub 개발 서버 실행 스크립트
# 사용법: ./start.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start.sh]${NC} $1"; }
warn() { echo -e "${YELLOW}[start.sh]${NC} $1"; }
err()  { echo -e "${RED}[start.sh]${NC} $1"; exit 1; }

# ── 1. 기본 의존성 체크 ─────────────────────────────────────
log "의존성 확인 중..."
command -v uv     >/dev/null 2>&1 || err "uv가 없습니다. https://docs.astral.sh/uv/ 에서 설치하세요."
command -v python3 >/dev/null 2>&1 || err "python3가 없습니다."
command -v npm    >/dev/null 2>&1 || err "npm이 없습니다."

# ── 2. 백엔드 설정 ──────────────────────────────────────────
if [ -d "$BACKEND_DIR" ]; then
  log "백엔드 설정 중..."
  cd "$BACKEND_DIR"

  log "백엔드 패키지 설치 중 (uv)..."
  uv sync

  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    warn ".env가 없습니다. .env.example을 복사합니다."
    cp .env.example .env
    warn "backend/.env에서 GOOGLE_CLOUD_API_KEY를 설정하세요."
  fi
fi

# ── 3. 프론트엔드 설정 ──────────────────────────────────────
if [ -d "$FRONTEND_DIR" ]; then
  log "프론트엔드 패키지 설치 중..."
  cd "$FRONTEND_DIR"
  npm install -q
fi

# ── 4. 서버 동시 실행 ───────────────────────────────────────
log "서버를 시작합니다..."
echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │  백엔드:     http://localhost:8000   │"
echo "  │  프론트엔드: http://localhost:3000   │"
echo "  │  종료:       Ctrl+C                  │"
echo "  └─────────────────────────────────────┘"
echo ""

PIDS=()

cd "$BACKEND_DIR"
uv run uvicorn main:app --reload --port 8000 &
PIDS+=($!)

cd "$FRONTEND_DIR"
npm run dev &
PIDS+=($!)

# Ctrl+C 시 모든 프로세스 종료
trap "log '서버를 종료합니다...'; kill ${PIDS[*]} 2>/dev/null; exit 0" INT TERM

wait "${PIDS[@]}"
