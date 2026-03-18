---
name: tsq-update
description: |
  TimSquad 프레임워크 업데이트. 템플릿, 스킬, 에이전트를 최신 버전으로 동기화.
  Use when: /tsq-update, "업데이트", "업그레이드", "최신화", "sync templates"
version: "1.0.0"
tags: [tsq, update, upgrade, sync]
user-invocable: true
---

# /tsq-update — Framework Update

## Protocol

### 업데이트 (`/tsq-update`)

1. **현재 상태 확인**: 현재 프레임워크 버전과 설치된 버전 비교
2. **변경 사항 요약**: 어떤 파일이 동기화되는지 사용자에게 보여주기
3. **실행**:
   ```bash
   tsq update -y
   ```
4. **결과 확인**: 업데이트 결과 요약 출력
5. **후속 안내**: 변경된 스킬/룰이 있으면 재시작 권장

### 롤백 (`/tsq-update rollback`)

1. **백업 확인**: 이전 업데이트 백업 존재 여부 확인
2. **실행**:
   ```bash
   tsq update --rollback -y
   ```
3. **결과 확인**: 롤백 완료 확인

### Dry Run (`/tsq-update check`)

1. **변경 사항만 확인** (실제 수정 없음):
   ```bash
   tsq update --dry-run
   ```

## 보존 대상 (업데이트 시 절대 변경 안 됨)

- `.timsquad/config.yaml` — 프로젝트 설정
- `.timsquad/ssot/` — SSOT 문서
- `.timsquad/logs/` — 모든 로그
- `.timsquad/state/` — 워크플로우 상태, 메타인덱스
- CLAUDE.md 사용자 작성 영역 (`<!-- tsq:end -->` 이후)
