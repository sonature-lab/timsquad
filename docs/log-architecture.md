[English](log-architecture.en.md) | [**한국어**](log-architecture.md)

# TimSquad 3-Layer Log Architecture

> v3.0 로그 체계 설계 명세. 2026-02-14 확정.
> 구현 상태: L1 Hook + CLI enrich + L1/L2/L3 뷰/관리/게이트 구현 완료.

---

## 1. 설계 원칙

### 1.1 로그의 목적

로그는 단순한 기록이 아니라 **프로그램의 품질 모니터링, 개선 자료, 트러블슈팅**을 위한 핵심 인프라다.
DB의 binlog, 메시지큐의 이벤트 로그, 커스텀 로그를 합친 개념으로,
TimSquad의 모든 작업 단위에서 로그는 **필수 행위(mandatory)**이며 **트랜잭션**이다.

### 1.2 이론적 기반

| 이론/표준 | 적용 | 참조 |
|----------|------|------|
| **OpenTelemetry Distributed Tracing** | Phase→Sequence→Task 계층 = Trace→Span→Child Span | [OTel Traces](https://opentelemetry.io/docs/concepts/signals/traces/) |
| **W3C Trace Context** | 상위 참조만으로 트레이스 재구성 (자식→부모 방향) | [W3C Spec](https://www.w3.org/TR/trace-context/) |
| **Event Sourcing** | 로그는 append-only, immutable. 상태는 리플레이로 재구성 | [MS Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) |
| **DORA Metrics** | Lead Time, Change Failure Rate, Recovery Time, Rework Rate | [DORA](https://dora.dev/guides/dora-metrics/) |
| **AI Agent Observability** | 토큰 사용량, 도구 호출 추적, 에이전트 효율성 | [OTel AI Agent](https://opentelemetry.io/blog/2025/ai-agent-observability/) |
| **GQM (Goal-Question-Metric)** | 모든 필드는 목표→질문→지표로 역추적 가능 | [GQM Framework](https://www.geeksforgeeks.org/goal-question-metric-approach-in-software-quality/) |

### 1.3 핵심 규칙

1. **상위 참조 트리**: 하위 로그만 상위 정보를 보유 (양방향 참조 금지)
2. **Append-only**: 생성된 로그는 수정 불가 (실패해도 error 채워서 생성)
3. **트랜잭션**: 로그 없이 작업 완료 선언 불가
4. **스냅샷 집계**: 상위 로그는 완료 시점에 하위 데이터를 집계 (실시간 동기화 아님)

---

## 2. 계층 구조

```
Phase Log (L3)          ← PM이 Phase 완료 시 생성
  │                        종합 진단: 시퀀스 결과 + 계획 대비 + 회고
  │
  ├── Sequence Log (L2) ← PM이 Architect 보고서 수신 후 생성
  │     │                  분석 결과: 3축 검증 + DORA 파생 지표
  │     │
  │     ├── Task Log (L1) ← Hook(mechanical) + Agent(semantic)
  │     ├── Task Log (L1)    최소 작업 단위 기록
  │     └── Task Log (L1)
  │
  ├── Sequence Log (L2)
  │     ├── Task Log (L1)
  │     └── Task Log (L1)
  └── ...
```

### 참조 방향

```
Task    →  trace.sequence_id: "SEQ-01-auth"   (상위 참조)
            trace.phase_id: "implementation"   (상위 참조)

Sequence →  trace.phase_id: "implementation"   (상위 참조)
            (하위 태스크 배열 없음 — 디렉토리 스캔으로 조회)

Phase   →  (하위 시퀀스 배열 없음 — 디렉토리 스캔으로 조회)
            trace.phase_id만 보유
```

**근거**: W3C Trace Context 모델. 자식이 `traceparent`를 가지고 부모를 참조.
파일 시스템에서 양방향 참조는 정합성 리스크 (DB가 아님). 상위 참조가 source of truth.

---

## 3. L1: Task Log (태스크 로그)

### 개요

| 항목 | 값 |
|------|-----|
| 파일 경로 | `.timsquad/logs/tasks/{SEQ-ID}/TASK-{nn}-{agent}.json` |
| 생성 주체 | Hook (mechanical) + 서브에이전트 리턴 (semantic) |
| 생성 시점 | SubagentStop 이벤트 |
| 불변성 | Append-only, 생성 후 수정 불가 |
| 크기 | ~50-100줄 (JSON) |

### 스키마

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string",
    "sequence_id": "string",
    "task_id": "string",
    "session_id": "string"
  },

  "execution": {
    "agent": "string (developer|qa|security|dba|designer|architect)",
    "model": "string (opus|sonnet|haiku)",
    "status": "string (success|failure|error|partial)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number"
  },

  "mechanical": {
    "files": [
      { "action": "string (A|M|D|R)", "path": "string" }
    ],
    "git_range": "string (commit_hash..commit_hash)",
    "commands": [
      { "cmd": "string", "exit_code": "number" }
    ],
    "tool_calls": {
      "total": "number",
      "by_tool": { "Read": "n", "Edit": "n", "Bash": "n", "Grep": "n", "Glob": "n", "Write": "n" }
    }
  },

  "semantic": {
    "summary": "string (1줄 요약)",
    "techniques": [
      { "name": "string", "reason": "string" }
    ],
    "ssot_refs": [
      { "doc": "string", "section": "string", "status": "string (aligned|misaligned|partial)" }
    ],
    "decisions": [
      { "decision": "string", "rationale": "string", "adr": "string|null" }
    ],
    "issues": [
      { "level": "number (1|2|3)", "description": "string", "filed_as": "string|null" }
    ]
  },

  "error": {
    "type": "string (build_failure|test_failure|lint_failure|runtime_error|ssot_mismatch|timeout|context_overflow)",
    "message": "string",
    "stack": "string|null",
    "recovery": {
      "attempted": "boolean",
      "strategy": "string|null",
      "result": "string (resolved|unresolved|escalated)"
    }
  }
}
```

### 필드별 GQM 근거

| 필드 | Goal (왜 필요) | Question (어떤 질문에 답함) | Metric |
|------|---------------|---------------------------|--------|
| `trace.*` | 추적성 | "이 태스크는 어느 시퀀스/페이즈에 속하는가?" | ID 매핑 |
| `execution.status` | 품질 측정 | "태스크 성공률은?" | success count / total |
| `execution.duration_ms` | 성능 측정 | "각 태스크에 얼마나 걸리는가?" | ms 단위 소요시간 |
| `execution.model` | 비용 추적 | "어떤 모델이 얼마나 사용되는가?" | 모델별 호출 빈도 |
| `mechanical.files` | 변경 추적 | "무엇이 바뀌었는가?" | 파일 목록 + action |
| `mechanical.git_range` | 재현성 | "이 변경을 되돌리거나 diff를 볼 수 있는가?" | commit range |
| `mechanical.commands` | 트러블슈팅 | "어떤 명령이 실패했는가?" | exit_code |
| `mechanical.tool_calls` | 에이전트 효율성 | "에이전트가 얼마나 효율적으로 작업했는가?" | 도구별 호출 횟수 |
| `semantic.summary` | 가독성 | "한 줄로 뭘 했는가?" | 텍스트 |
| `semantic.techniques` | 패턴 분석 | "어떤 기법이 적용되었는가?" | 기법 목록 |
| `semantic.ssot_refs` | 적합성 | "SSOT와 일치하는가?" | aligned 비율 |
| `semantic.decisions` | 의사결정 추적 | "왜 이 선택을 했는가?" | ADR 연계 |
| `semantic.issues` | 피드백 루프 | "발견된 문제가 추적되고 있는가?" | 이슈 수 by level |
| `error.*` | 트러블슈팅 | "왜 실패했는가? 복구 가능한가?" | 에러 타입 + 복구 결과 |

### error.type 정의

| type | 설명 | 일반적 원인 |
|------|------|------------|
| `build_failure` | 컴파일/빌드 실패 | 타입 에러, import 누락 |
| `test_failure` | 테스트 미통과 | 로직 오류, 환경 미설정 |
| `lint_failure` | 린트 규칙 위반 | 코드 스타일, unused 변수 |
| `runtime_error` | 실행 중 에러 | null reference, API 오류 |
| `ssot_mismatch` | SSOT 불일치 발견 | 명세와 구현 괴리 |
| `timeout` | 에이전트 타임아웃 | 작업 범위 과대, 무한루프 |
| `context_overflow` | 컨텍스트 윈도우 초과 | 파일 과다 읽기, 긴 대화 |

### 예시: 성공

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth",
    "task_id": "TASK-01",
    "session_id": "abc12345"
  },
  "execution": {
    "agent": "developer",
    "model": "sonnet",
    "status": "success",
    "started_at": "2026-02-14T10:00:00Z",
    "completed_at": "2026-02-14T10:15:23Z",
    "duration_ms": 923000
  },
  "mechanical": {
    "files": [
      { "action": "A", "path": "src/auth/login.ts" },
      { "action": "M", "path": "src/routes/index.ts" }
    ],
    "git_range": "abc1234..def5678",
    "commands": [
      { "cmd": "npm test", "exit_code": 0 },
      { "cmd": "npm run lint", "exit_code": 0 }
    ],
    "tool_calls": {
      "total": 12,
      "by_tool": { "Read": 5, "Edit": 4, "Bash": 2, "Grep": 1 }
    }
  },
  "semantic": {
    "summary": "로그인 엔드포인트 구현 (POST /api/auth/login)",
    "techniques": [
      { "name": "JWT stateless auth", "reason": "서버 세션 불필요, 수평 확장 용이" }
    ],
    "ssot_refs": [
      { "doc": "service-spec.md", "section": "auth#login", "status": "aligned" }
    ],
    "decisions": [
      { "decision": "bcrypt 해싱", "rationale": "argon2 대비 생태계 호환성", "adr": null }
    ],
    "issues": []
  },
  "error": null
}
```

### 예시: 실패

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth",
    "task_id": "TASK-03",
    "session_id": "abc12345"
  },
  "execution": {
    "agent": "qa",
    "model": "sonnet",
    "status": "failure",
    "started_at": "2026-02-14T11:00:00Z",
    "completed_at": "2026-02-14T11:08:45Z",
    "duration_ms": 525000
  },
  "mechanical": {
    "files": [
      { "action": "A", "path": "tests/auth.test.ts" }
    ],
    "git_range": "def5678..ghi9012",
    "commands": [
      { "cmd": "npm test", "exit_code": 1 }
    ],
    "tool_calls": {
      "total": 8,
      "by_tool": { "Read": 3, "Edit": 2, "Bash": 3 }
    }
  },
  "semantic": {
    "summary": "로그인 API 테스트 작성 - 테스트 실패",
    "techniques": [],
    "ssot_refs": [
      { "doc": "service-spec.md", "section": "auth#login", "status": "partial" }
    ],
    "decisions": [],
    "issues": [
      { "level": 1, "description": "JWT_SECRET 환경변수 미설정으로 토큰 생성 실패", "filed_as": null }
    ]
  },
  "error": {
    "type": "test_failure",
    "message": "auth.test.ts:45 - Expected 200, received 401",
    "stack": "src/auth/login.ts:23 → src/middleware/jwt.ts:12",
    "recovery": {
      "attempted": false,
      "strategy": null,
      "result": "unresolved"
    }
  }
}
```

---

## 4. L2: Sequence Log (시퀀스 로그)

### 개요

| 항목 | 값 |
|------|-----|
| 파일 경로 | `.timsquad/logs/sequences/{SEQ-ID}.json` |
| 보고서 경로 | `.timsquad/reports/{SEQ-ID}-report.md` |
| 생성 주체 | PM (Architect 보고서 수신 후) |
| 생성 시점 | 시퀀스 내 모든 태스크 완료 + Architect 분석 완료 후 |
| 불변성 | Append-only, 생성 후 수정 불가 |

### 스키마

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string",
    "sequence_id": "string"
  },

  "execution": {
    "status": "string (completed|blocked|partial|aborted)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number"
  },

  "tasks": {
    "total": "number",
    "success": "number",
    "failure": "number",
    "error": "number",
    "rework": "number",
    "first_pass_success_rate": "number (0~1)",
    "final_success_rate": "number (0~1)"
  },

  "analysis": {
    "axis_1_consistency": {
      "verdict": "string (pass|warn|fail)",
      "details": "string",
      "issues": [
        { "level": "number", "description": "string", "file_ref": "string" }
      ]
    },
    "axis_2_ssot_conformance": {
      "verdict": "string (pass|warn|fail)",
      "details": "string",
      "issues": [
        { "level": "number", "ssot_doc": "string", "section": "string", "description": "string", "resolution": "string" }
      ]
    },
    "axis_3_cross_sequence": {
      "verdict": "string (pass|warn|fail|n/a)",
      "prev_sequence": "string|null",
      "details": "string",
      "issues": [
        { "level": "number", "prev_decision": "string", "conflict": "string" }
      ]
    }
  },

  "dora_derived": {
    "change_failure_rate": "number (0~1)",
    "rework_rate": "number (0~1)",
    "mean_task_duration_ms": "number",
    "recovery_time_ms": "number|null"
  },

  "verdict": {
    "proceed": "boolean",
    "conditions": ["string"],
    "report_path": "string"
  }
}
```

### 필드별 GQM 근거

| 필드 | Goal | Question | Metric |
|------|------|----------|--------|
| `tasks.first_pass_success_rate` | 품질 추세 | "첫 시도 성공률이 개선되고 있는가?" | 성공 태스크 / 전체 (재시도 전) |
| `tasks.rework` | 재작업 비용 | "얼마나 많은 태스크가 재실행되었는가?" | 재실행 횟수 |
| `analysis.axis_*` | 구조적 건강 | "아키텍처/SSOT/연속성이 유지되고 있는가?" | pass/warn/fail |
| `dora_derived.change_failure_rate` | 딜리버리 품질 | "변경의 몇 %가 실패하는가?" | failure / total |
| `dora_derived.recovery_time_ms` | 복원력 | "실패 시 얼마나 빨리 복구하는가?" | 실패→성공 재시도 시간 |
| `verdict.conditions` | 게이트키핑 | "다음 시퀀스 진행 조건은?" | 조건 목록 |

### 예시

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation",
    "sequence_id": "SEQ-01-auth"
  },
  "execution": {
    "status": "completed",
    "started_at": "2026-02-14T09:00:00Z",
    "completed_at": "2026-02-14T14:30:00Z",
    "duration_ms": 19800000
  },
  "tasks": {
    "total": 4,
    "success": 3,
    "failure": 1,
    "error": 0,
    "rework": 1,
    "first_pass_success_rate": 0.67,
    "final_success_rate": 1.0
  },
  "analysis": {
    "axis_1_consistency": {
      "verdict": "pass",
      "details": "에러 핸들링, 네이밍 컨벤션 통일",
      "issues": []
    },
    "axis_2_ssot_conformance": {
      "verdict": "warn",
      "details": "refresh token 엔드포인트 미구현",
      "issues": [
        {
          "level": 1,
          "ssot_doc": "service-spec.md",
          "section": "auth#refresh",
          "description": "refresh token 엔드포인트 미구현",
          "resolution": "SEQ-02로 이월"
        }
      ]
    },
    "axis_3_cross_sequence": {
      "verdict": "n/a",
      "prev_sequence": null,
      "details": "첫 시퀀스이므로 비교 대상 없음",
      "issues": []
    }
  },
  "dora_derived": {
    "change_failure_rate": 0.25,
    "rework_rate": 0.25,
    "mean_task_duration_ms": 660000,
    "recovery_time_ms": 180000
  },
  "verdict": {
    "proceed": true,
    "conditions": ["SEQ-02에서 refresh token 구현 필수"],
    "report_path": ".timsquad/reports/SEQ-01-auth-report.md"
  }
}
```

---

## 5. L3: Phase Log (페이즈 로그)

### 개요

| 항목 | 값 |
|------|-----|
| 파일 경로 | `.timsquad/logs/phases/{phase-name}.json` |
| 생성 주체 | PM (메인 세션) |
| 생성 시점 | Phase 전환 직전 (전환의 전제 조건) |
| 불변성 | Append-only, 생성 후 수정 불가 |

### 스키마

```json
{
  "schema_version": "1.0",

  "trace": {
    "phase_id": "string (planning|implementation|review|security)"
  },

  "execution": {
    "status": "string (completed|aborted)",
    "started_at": "ISO 8601",
    "completed_at": "ISO 8601",
    "duration_ms": "number",
    "sessions_count": "number"
  },

  "sequences": {
    "total": "number",
    "completed": "number",
    "blocked": "number",
    "ids": ["string"]
  },

  "aggregate_metrics": {
    "total_tasks": "number",
    "task_success_rate": "number (0~1)",
    "task_rework_rate": "number (0~1)",
    "total_files_changed": "number",
    "total_issues": {
      "level_1": "number",
      "level_2": "number",
      "level_3": "number"
    },
    "ssot_conformance_rate": "number (0~1)",
    "mean_sequence_duration_ms": "number"
  },

  "dora_derived": {
    "lead_time_ms": "number",
    "change_failure_rate": "number (0~1)",
    "mean_recovery_time_ms": "number|null"
  },

  "planning": {
    "original_sequences": ["string"],
    "added_sequences": ["string"],
    "removed_sequences": ["string"],
    "scope_changes": [
      { "description": "string", "reason": "string", "impact": "string" }
    ],
    "plan_adherence_rate": "number (0~1)"
  },

  "workflow_adjustments": [
    {
      "trigger": "string",
      "adjustment": "string",
      "impact": "string"
    }
  ],

  "retrospective": {
    "keep": ["string"],
    "problem": ["string"],
    "try": ["string"]
  },

  "knowledge_extracted": [
    {
      "type": "string (pattern|lesson|constraint)",
      "content": "string",
      "target": "string (knowledge 파일 경로)"
    }
  ]
}
```

### 필드별 GQM 근거

| 필드 | Goal | Question | Metric |
|------|------|----------|--------|
| `aggregate_metrics.task_success_rate` | 프로세스 품질 | "이 페이즈의 전체 성공률은?" | 성공 / 전체 |
| `aggregate_metrics.ssot_conformance_rate` | SSOT 효과 | "SSOT가 실제로 구현을 가이드하고 있는가?" | aligned / total refs |
| `dora_derived.lead_time_ms` | 딜리버리 속도 | "이 페이즈에 얼마나 걸렸는가?" | 시작~완료 |
| `dora_derived.change_failure_rate` | 딜리버리 품질 | "변경 실패율은?" | 실패 태스크 / 전체 |
| `planning.plan_adherence_rate` | 예측 가능성 | "계획대로 실행되고 있는가?" | 원래 시퀀스 / 최종 시퀀스 |
| `planning.scope_changes` | 스코프 관리 | "어떤 변경이 왜 일어났는가?" | 변경 이력 |
| `workflow_adjustments` | 적응력 | "문제 발생 시 얼마나 빠르게 조정했는가?" | 조정 이력 |
| `retrospective` | 학습 루프 | "무엇을 배웠고 다음에 어떻게 적용하는가?" | KPT 항목 |
| `knowledge_extracted` | 지식 축적 | "재사용 가능한 지식이 생겼는가?" | 추출 항목 수 |

### 예시

```json
{
  "schema_version": "1.0",
  "trace": {
    "phase_id": "implementation"
  },
  "execution": {
    "status": "completed",
    "started_at": "2026-02-14T09:00:00Z",
    "completed_at": "2026-02-16T18:00:00Z",
    "duration_ms": 205200000,
    "sessions_count": 5
  },
  "sequences": {
    "total": 3,
    "completed": 3,
    "blocked": 0,
    "ids": ["SEQ-01-auth", "SEQ-02-crud", "SEQ-03-ui"]
  },
  "aggregate_metrics": {
    "total_tasks": 9,
    "task_success_rate": 0.89,
    "task_rework_rate": 0.22,
    "total_files_changed": 34,
    "total_issues": { "level_1": 3, "level_2": 1, "level_3": 0 },
    "ssot_conformance_rate": 0.92,
    "mean_sequence_duration_ms": 18000000
  },
  "dora_derived": {
    "lead_time_ms": 205200000,
    "change_failure_rate": 0.11,
    "mean_recovery_time_ms": 240000
  },
  "planning": {
    "original_sequences": ["SEQ-01-auth", "SEQ-02-crud", "SEQ-03-ui"],
    "added_sequences": [],
    "removed_sequences": [],
    "scope_changes": [],
    "plan_adherence_rate": 1.0
  },
  "workflow_adjustments": [
    {
      "trigger": "SEQ-01 TASK-03 테스트 실패",
      "adjustment": "환경변수 설정 누락 → .env.example 추가",
      "impact": "이후 시퀀스에서 동일 문제 0건"
    }
  ],
  "retrospective": {
    "keep": [
      "SSOT 기반 구현으로 스펙 누락 0건",
      "Architect 3축 분석으로 시퀀스 간 일관성 유지"
    ],
    "problem": [
      "첫 QA 태스크 실패 (환경 설정 미비)",
      "SEQ-02에서 data-design.md 업데이트 지연"
    ],
    "try": [
      "시퀀스 시작 전 환경 설정 체크리스트 확인",
      "SSOT 변경 시 즉시 반영 규칙 강화"
    ]
  },
  "knowledge_extracted": [
    {
      "type": "pattern",
      "content": "JWT refresh token은 별도 시퀀스로 분리하면 복잡도 감소",
      "target": ".timsquad/knowledge/lessons.md"
    }
  ]
}
```

---

## 6. 디렉토리 구조

```
.timsquad/logs/
├── tasks/                         ← L1: 태스크 로그 (시퀀스별 디렉토리)
│   ├── SEQ-01-auth/
│   │   ├── TASK-01-developer.json
│   │   ├── TASK-02-developer.json
│   │   ├── TASK-03-qa.json        (실패 로그 포함)
│   │   └── TASK-03-qa-r1.json     (재시도 로그, r1 = retry 1)
│   └── SEQ-02-crud/
│       └── ...
│
├── sequences/                     ← L2: 시퀀스 메타데이터
│   ├── SEQ-01-auth.json
│   └── SEQ-02-crud.json
│
├── phases/                        ← L3: 페이즈 종합 로그
│   ├── planning.json
│   └── implementation.json
│
├── sessions/                      ← Hook 이벤트 로그 (raw, 기존)
└── quick/                         ← Quick 모드 로그 (기존)

.timsquad/reports/                 ← Architect 시퀀스 보고서 (.md)
├── SEQ-01-auth-report.md
└── SEQ-02-crud-report.md
```

### 재시도 파일 네이밍

```
TASK-03-qa.json        ← 최초 실행 (실패)
TASK-03-qa-r1.json     ← 1차 재시도
TASK-03-qa-r2.json     ← 2차 재시도 (있을 경우)
```

재시도 로그도 append-only. 원본 실패 로그를 수정하지 않고 새 파일로 생성.
`rework` 카운트는 같은 TASK-ID의 파일 수 - 1로 계산.

---

## 7. 트랜잭션 정책

### 원칙

> **"로그가 없으면 작업은 완료되지 않은 것이다"**

### 레이어별 트랜잭션

| 계층 | 트랜잭션 조건 | 실패 시 처리 |
|------|-------------|------------|
| **L1 Task** | SubagentStop 시 반드시 JSON 생성. 실패해도 `error` 필드 채워서 생성. | PM이 수동 로그 생성 또는 태스크 재실행 |
| **L2 Sequence** | 모든 L1 존재 확인 → Architect 분석 → PM이 JSON + report.md 저장 | 시퀀스 "미완료", 다음 시퀀스 블로킹 |
| **L3 Phase** | 모든 L2 존재 확인 → PM이 종합 JSON 작성 | Phase 전환 블로킹 |

### 트랜잭션 흐름

```
L1 생성 (훅 기반 IPC 모드 — v3.4+):
  SubagentStart 훅 → `tsq daemon notify subagent-start` → IPC → baseline 저장 + 세션 상태 갱신
  서브에이전트 작업 실행
  SubagentStop 훅 → `tsq daemon notify subagent-stop` → IPC → baseline 비교 → L1 JSON 생성 (semantic: {})
  서브에이전트 → tsq log enrich {agent} --json '{...}' → semantic 데이터 병합
  ✓ L1 완료

L1 생성 (JSONL 감시 모드 — 레거시):
  SubagentStart Hook → baseline HEAD 기록 (/tmp/tsq-task-baseline-{SESSION}-{AGENT})
  서브에이전트 작업 실행
  SubagentStop Hook → mechanical 데이터 자동 수집 → JSON 생성 (semantic: {})
  서브에이전트 → tsq log enrich {agent} --json '{...}' → semantic 데이터 병합
  ✓ L1 완료

L2 생성:
  모든 태스크 L1 존재 확인 (tsq log sequence check {SEQ-ID})
  PM → Architect 호출 (입력 계약: seq_id, task_logs, ssot_refs, prev_reports)
  Architect → 3축 분석 → 보고서 리턴
  PM → .timsquad/reports/{SEQ-ID}-report.md 저장
  PM → tsq log sequence create {SEQ-ID} --phase {phase} --report {path} --verdict proceed
  ✓ L2 완료

L3 생성:
  tsq log phase gate {phase-id} → PASSED 확인
  PM → retro 스킬 실행 (KPT)
  PM → tsq log phase create {phase-id} --sequences "SEQ-01,SEQ-02,..."
  ✓ L3 완료 → Phase 전환 가능
```

### 무결성 검증

```
L1 검증: ls .timsquad/logs/tasks/{SEQ-ID}/ 에 예상 태스크 수만큼 파일 존재
L2 검증: .timsquad/logs/sequences/{SEQ-ID}.json 존재 + report.md 존재
L3 검증: .timsquad/logs/phases/{phase-name}.json 존재
```

---

## 8. .gitignore 정책

```gitignore
# L1: 태스크 로그 (런타임 생성, 대량)
.timsquad/logs/tasks/

# L2: 시퀀스 메타 JSON (런타임 생성)
.timsquad/logs/sequences/

# L3: 페이즈 로그 (런타임 생성)
.timsquad/logs/phases/

# 세션/Quick 로그 (런타임)
.timsquad/logs/sessions/
.timsquad/logs/quick/

# Architect 보고서는 git 추적 (검토 가능한 문서)
# .timsquad/reports/ → 추적함
```

---

## 9. CLI 구현 현황

### 구현 완료

| 커맨드 | 설명 | 계층 |
|--------|------|:----:|
| `tsq log enrich <agent> --json '{...}'` | 최근 task log에 semantic 데이터 병합 | L1 |
| `tsq log task list [--agent <name>]` | 태스크 로그 목록 (상태/semantic 여부 표시) | L1 |
| `tsq log task view <file>` | 태스크 로그 상세 (mechanical + semantic) | L1 |
| `tsq log task stats` | 통계 (성공률, semantic coverage, 에이전트별) | L1 |
| `tsq log sequence list` | 시퀀스 로그 목록 | L2 |
| `tsq log sequence view <seq-id>` | 시퀀스 로그 상세 (3축 + DORA + verdict) | L2 |
| `tsq log sequence create <seq-id> --phase <id> --report <path>` | L1 집계 → L2 JSON 생성 | L2 |
| `tsq log sequence check <seq-id>` | 시퀀스 내 태스크 semantic 완성도 확인 | L2 |
| `tsq log phase list` | 페이즈 로그 목록 | L3 |
| `tsq log phase view <phase-id>` | 페이즈 로그 상세 (메트릭 + 회고) | L3 |
| `tsq log phase create <phase-id> --sequences "..."` | L2 집계 → L3 JSON 생성 | L3 |
| `tsq log phase gate <phase-id>` | 페이즈 전환 가능 여부 검증 (PASSED/BLOCKED) | L3 |

### Semantic Enrichment 프로토콜

Hook(SubagentStop)은 에이전트 텍스트 출력에 접근할 수 없으므로, semantic 데이터는 에이전트가 직접 CLI를 호출하여 채웁니다.

```
Hook 생성 → task JSON {mechanical: {...}, semantic: {}}
                                                  ↓
에이전트 호출 → tsq log enrich {agent} --json '{summary, techniques, ...}'
                                                  ↓
                task JSON {mechanical: {...}, semantic: {summary, techniques, ...}}
```

모든 에이전트의 `<on-task-complete>` / `<on-review-complete>` / `<on-analysis-complete>` 프로토콜에 `tsq log enrich` 호출이 포함되어 있습니다.

---

## 10. 향후 확장 가능성

| 확장 | 설명 | 시점 |
|------|------|------|
| 훅 기반 IPC 모드 | JSONL 의존 제거. `tsq daemon notify`로 이벤트 수신, `session-state.json`으로 상태 영속화 | v3.4 (구현 완료) |
| 토큰 비용 추적 | `execution.tokens` 필드 추가 (input/output/cache) | Stop 훅에서 usage 데이터 수신 시 |
| 대시보드 | 로그 기반 시각화 (DORA 차트, 성공률 추세) | Phase 3 |
| 로그 압축/아카이빙 | 오래된 로그 gzip 압축 | 프로젝트 성숙 후 |
