# Backend Lessons Learned

### [2026-03-05] | LiveSub
**에이전트**: db-agent
**문제**: SQLAlchemy async 모드에서 pytest 실행 시 `greenlet` 라이브러리가 없으면 `ValueError: the greenlet library is required` 에러 발생
**해결**: `uv add greenlet`으로 명시적 설치
**교훈**: SQLAlchemy async + aiosqlite 조합 사용 시 greenlet을 반드시 명시적 의존성으로 추가할 것. SQLAlchemy가 내부적으로 greenlet 기반 coroutine bridge를 사용하기 때문.

### [2026-03-05] | LiveSub
**에이전트**: db-agent
**문제**: pytest-asyncio strict 모드에서는 모든 async 테스트에 `@pytest.mark.asyncio` 데코레이터를 수동으로 붙여야 함
**해결**: `pyproject.toml`에 `[tool.pytest.ini_options] asyncio_mode = "auto"` 설정 추가
**교훈**: FastAPI async 테스트 프로젝트에서는 처음부터 pytest-asyncio auto 모드를 설정하면 데코레이터 반복을 줄일 수 있음.

### [2026-03-05] | LiveSub
**에이전트**: db-agent
**문제**: SQLite에서 PRAGMA foreign_keys=ON을 설정하지 않으면 FK 제약조건이 동작하지 않음
**해결**: SQLAlchemy event listener(`@event.listens_for(engine.sync_engine, "connect")`)로 매 연결마다 PRAGMA 자동 실행
**교훈**: SQLite FK 제약조건은 기본 비활성. 반드시 연결 시 PRAGMA 설정 필요.
