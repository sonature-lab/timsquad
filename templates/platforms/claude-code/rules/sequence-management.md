---
description: 시퀀스 관리 규칙. 네이밍, 자동화 파이프라인, 수동 모드.
globs:
  - ".timsquad/logs/**"
  - ".timsquad/state/workspace.xml"
---

# 시퀀스 관리

태스크를 시퀀스로 그룹화하여 관리합니다.

## PM 자동 등록 프로토콜

사용자가 작업을 요청하면 `.timsquad/config.yaml`의 `naming` 섹션을 읽고
Phase/Sequence/Task ID를 **자동 생성**하여 등록하세요. 사용자에게 수동 명령을 요구하지 마세요.

**네이밍 규칙** (config.yaml → naming 참조):
- Phase ID: `P{N}` — planning=P1, design=P2, implementation=P3, review=P4, security=P5, deployment=P6
- Sequence ID: `P{N}-S{NNN}` — 페이즈 내 시퀀스 번호 (zero-padded)
- Task ID: `P{N}-S{NNN}-T{NNN}` — 시퀀스 내 태스크 번호 (zero-padded)
- 번호는 `tsq wf status`로 기존 시퀀스를 확인한 후 이어서 부여

**흐름 예시**:
```
사용자: "인증 기능이랑 결제 API 구현해줘"
PM 내부 처리:
1. config.yaml → naming.phase.order → implementation = P3
2. tsq wf set-phase P3
3. tsq wf add-sequence P3-S001 --agents developer,dba
4. tsq wf add-sequence P3-S002 --agents developer,security
5. @tsq-developer "P3-S001: 인증 구현"
```

## 자동화 파이프라인 (데몬 기반)

```
SessionStart → tsq daemon start
  ├─ JSONL 스트림 실시간 감시
  ├─ 인메모리 메타인덱스 로드
  └─ 소스 파일 변경 감시

SubagentStop 감지 시:
  ├─ L1 태스크 로그 자동 생성
  ├─ workflow.json 업데이트
  └─ 시퀀스 완료 → L2 자동 → 페이즈 완료 → L3 + Gate + 회고

SessionEnd → tsq daemon stop
  ├─ worklog markdown 생성
  ├─ 최종 메트릭 갱신
  └─ 정리
```

## 자동화 토글
```bash
tsq wf config sequence_log off   # L2 자동 생성 끄기
tsq wf config retro off          # 자동 회고 끄기
tsq wf status                    # 현재 상태 확인
```

## 수동 모드 (자동화 꺼진 경우)

### Architect 호출
시퀀스 완료 후 `@tsq-architect` 호출:
- `seq_id`, `task_logs`, `ssot_refs` 필수
- 보고서 저장: `.timsquad/reports/{SEQ-ID}-report.md`

### 수동 L2/L3 생성
```bash
tsq log sequence create {SEQ-ID} --phase {phase} --report {path} --verdict proceed
tsq log phase create {phase-id} --sequences "SEQ-01,SEQ-02"
tsq log phase gate {phase-id}
```
