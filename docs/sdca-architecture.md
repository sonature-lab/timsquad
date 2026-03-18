# Skill-Driven Context Architecture (SDCA)

> TimSquad의 핵심 설계 철학 — 스킬이 컨텍스트를 주도하는 LLM 에이전트 아키텍처

---

## 1. 문제 정의

### LLM 에이전트의 근본적 한계

LLM 기반 에이전트는 두 가지 본질적 문제를 안고 있다:

- **컨텍스트 망각**: 긴 태스크 수행 중 초기 지시사항, 아키텍처 결정, 컨벤션 등이 점진적으로 희석된다.
- **컨텍스트 오염**: 태스크가 복잡해질수록 무관한 정보가 쌓여 판단 품질이 저하된다.

기존 에이전트 프레임워크(CrewAI, AutoGen 등)는 이 문제를 오케스트레이터의 복잡한 제어 로직으로 해결하려 한다. 태스크가 복잡해지면 오케스트레이션 로직도 함께 복잡해지는 구조적 한계가 있다.

### Context Engineering과의 관계

Context Engineering은 "LLM에 올바른 컨텍스트를 효과적으로 구성하자"는 넓은 개념이다. SDCA는 그 안에서 **스킬이 컨텍스트의 범위, 수명, 구성을 주도하는 구체적 아키텍처 패턴**으로 위치한다.

---

## 2. 핵심 개념

### Skill-Driven Context

기존 프레임워크가 **top-down**(오케스트레이터가 태스크를 분해하고 각 에이전트에 컨텍스트를 할당)인 반면, SDCA는 **bottom-up**이다.

| 구분 | 기존 방식 (Intent-Driven) | SDCA (Skill-Driven) |
|------|--------------------------|---------------------|
| 컨텍스트 결정 주체 | 오케스트레이터 | 스킬 |
| 사용자 설정 비용 | 에이전트별 상세 정의 필요 | 프로젝트 타입 + 스택 선언만 |
| 태스크 확장 시 | 오케스트레이션 로직 수정 필요 | 스킬 리소스 추가만으로 대응 |
| 에이전트 재사용성 | 프로젝트마다 재정의 | 동일 에이전트가 스펙 주입만으로 다른 프로젝트 수행 |

### 최소 선언, 자동 조합

사용자는 `tsq init`에서 다음만 결정한다:

1. **프로젝트 타입**: web-service, api-backend, fintech 등
2. **기술 스택**: react, hono, prisma 등 (선택)
3. **프로세스 레벨**: 1(경량) ~ 3(엄격)

이후 시스템이 자동으로:
- 프로젝트 타입에 맞는 스킬 프리셋 배포
- 스택에 맞는 추가 스킬 매핑
- 에이전트별 스킬 주입
- Controller가 태스크마다 필요한 스펙을 컴파일하여 서브에이전트에 주입

```
사용자: "결제 API 만들어줘"
  → Controller가 명령 분석
    → SSOT에서 관련 스펙 컴파일 (아키텍처, 데이터 모델, 보안 제약)
      → developer 에이전트에 [스펙 + 스킬 컨텍스트 + 지시] 위임
        → 에이전트가 주입된 스킬의 rules/references 참조하며 작업 수행
```

---

## 3. 3계층 스킬 레이어

SDCA는 변경 빈도가 다른 관심사를 세 개의 레이어로 분리한다.

```
+---------------------------------------------+
|         Protocol Layer (Static)             |
|  tsq-protocol v2.1                          |
|  통신 규약, Completion Report, Phase Gating  |
|  Feedback Level (L1/L2/L3)                 |
|  -> 불변. 시스템 전체의 헌법.                |
+---------------------------------------------+
|         Controller Layer (Per-Project)      |
|  tsq-controller v2.1                        |
|  SSOT 컴파일, Capability Token, 위임 디스패치|
|  Completion Report 검증, 트리거 관리         |
|  -> 프로젝트마다 다른 스펙 컨텍스트 생성.    |
+---------------------------------------------+
|         Skill Layer (Per-Domain)            |
|  기능 스킬: coding, testing, security, ...   |
|  스택 스킬: react, hono, prisma, flutter, ...|
|  프로세스 스킬: spec, audit, review, retro   |
|  -> 주입된 스펙에 따라 리소스 조합 및 실행.  |
+---------------------------------------------+
```

### Protocol Layer — 최상위, 불변

- **역할**: 메인 세션과 모든 서브에이전트가 공유하는 공통 통신 규약
- **내용**: Completion Report 형식(5필드 필수), Phase gating 룰, SSOT 관리 규칙, Feedback Level(L1 자체수정 / L2 PM보고 / L3 사용자승인), Decision Log 기록 규칙
- **변경 빈도**: 거의 없음 (메이저 버전에서만)
- **비유**: gRPC의 `.proto` 파일, 네트워크의 TCP/IP

### Controller Layer — 프로젝트별 가변

- **역할**: 사용자 명령을 전처리하여 구조화된 스펙 컨텍스트로 컴파일하고, 서브에이전트에 위임
- **핵심 프로세스**:
  1. SSOT Map 참조 → 티어별 compiled spec 확인
  2. Capability Token 발급 (controller-active + allowed-paths.txt)
  3. 에이전트 파일 + prerequisites 파싱 → spec resolve
  4. 프롬프트 조합 (protocol + memory + specs + methodology + 지시)
  5. Task() 호출 → Completion Report 검증 (5필드 확인)
  6. 완료 트리거 실행 → Capability Token 회수
- **동기/비동기 분리**: Controller는 동기적 프로세스 강제(게이트 판정), Daemon은 비동기적 관찰/기록. Daemon 장애 시 Controller는 정상 동작.
- **변경 빈도**: 프로젝트 시작 시 세팅
- **핵심 가치**: 사용자의 프롬프트 품질에 의존하지 않고, 정해진 절차대로 스펙을 채워서 서브에이전트가 받는 컨텍스트의 품질을 일정하게 보장

### Skill Layer — 도메인별 축적

- **역할**: 주입받은 스펙과 지시에 따라 하위 리소스에서 필요한 것을 조합하여 실행
- **변경 빈도**: 지속적 축적
- **핵심 특성**: 스킬은 인터페이스. 구현은 주입되는 스펙에 의해 결정됨

#### 스킬 분류

| 유형 | 예시 | 역할 |
|------|------|------|
| **기능 스킬** | coding, testing, security, debugging | 개발 행위의 품질 규칙 |
| **스택 스킬** | react, hono, prisma, flutter, dart | 기술 스택별 컨벤션 |
| **방법론 스킬** | tdd, bdd, ddd | 개발 방법론 원칙 |
| **프로세스 스킬** | spec, audit, review, retro | 파이프라인 절차 (슬래시 커맨드) |
| **시스템 스킬** | protocol, controller, librarian, start | 프레임워크 내부 동작 |

#### Progressive Disclosure — 스킬 복잡도별 구조

스킬은 복잡도에 따라 자연스럽게 다른 구조를 갖는다. 단순한 스킬에 빈 디렉토리를 강제하지 않는다.

| 복잡도 | 구조 | 예시 |
|--------|------|------|
| **단순** (30줄 이하) | `SKILL.md`만 | tsq-start, tsq-status, tsq-log |
| **중간** (~70줄 인덱스) | `SKILL.md + rules/` | tsq-coding, tsq-testing, tsq-security |
| **복합** (프레임워크급) | `SKILL.md + rules/ + references/ + scripts/` | tsq-react (22 rules), tsq-flutter (5 서브도메인) |

SKILL.md는 항상 로드되는 **인덱스**. rules/는 Read로 온디맨드 로드. scripts/는 Bash로 실행(토큰 0).

```
tsq-react/                     tsq-start/
+-- SKILL.md (index)           +-- SKILL.md (전부)
+-- rules/
|   +-- _sections.md (목차)
|   +-- component-conventions.md
|   +-- state-management.md
|   +-- ... (22개)
```

---

## 4. 컨텍스트 무결성 보장

### 4.1 SSOT (Single Source of Truth)

모든 에이전트가 참조하는 문서의 단일 원본을 유지한다. 에이전트마다 다른 버전의 정보를 참조하는 문제를 원천 차단한다.

#### 4-Tier SSOT 계층

| Tier | 주입 시점 | 주입 방식 | 예시 |
|------|----------|----------|------|
| T0 | 항상 | Hook 자동 주입 | security-constraints, completion-criteria |
| T1 | Phase 시작 | Controller 주입 | prd-summary, architecture |
| T2 | Sequence 시작 | Controller 주입 | service-spec, data-design |
| T3 | Task 시작 | Controller 주입 | error-codes, functional-spec |

- 서브에이전트는 SSOT를 **읽기 전용**으로 참조
- 변경은 정해진 프로세스(Librarian 또는 PM 승인)를 통해서만 발생
- **Stale 감지**: `.compile-manifest.json`의 해시 비교로 최신 여부 확인

### 4.2 Hook 시스템

주요 시점에 훅을 삽입하여 컨텍스트 무결성을 **hard하게** 검증한다.

| Hook | 스크립트 | 역할 |
|------|---------|------|
| PreToolUse | safe-guard.sh | 파괴적 명령 차단 |
| PreToolUse | phase-guard.sh | Phase별 파일 접근 제한 (설계Phase에서 src/ 수정 차단) |
| PreToolUse | check-capability.sh | Capability Token 검증 (allowed-paths 외 차단) |
| Stop | completion-guard.sh | 테스트 미실행 경고 |
| Stop | build-gate.sh | tsc 에러 블로킹 |
| PreCompact | pre-compact.sh | 컨텍스트 압축 전 상태 저장 |
| SessionStart | context-restore.sh | 컨텍스트 복원 |

핵심 원칙: **프롬프트(soft) 의존이 아닌 Hook(hard) 강제**. LLM이 지시를 무시해도 Hook이 차단한다.

### 4.3 Event Sourcing + Phase Memory

모든 컨텍스트 변경을 이벤트로 기록하여, 컨텍스트 망각이 발생하더라도 이벤트 로그에서 복원할 수 있다.

- **Daemon = 관찰자 + 수집자**: L1 태스크 로그 생성 + Decision Log 수집 + SSOT 자동 recompile. Workflow 진행은 Controller만 담당.
- **Controller = 유일한 workflow 진행자**: task-complete → sequence-complete → phase-complete 판정과 게이트 실행.
- **역할 분리**: Daemon(비동기 관찰)은 Controller(동기 강제)와 독립. Daemon 장애 시 메인 프로세스 영향 없음.

#### 4계층 메모리

| 계층 | 파일 | 수명 |
|------|------|------|
| 작업 기억 | `.timsquad/state/decisions.jsonl` | Phase 진행 중 (에이전트가 매 결정마다 append) |
| 최근 기억 | `.timsquad/state/phase-memory.md` | 다음 Phase에 주입 (~50줄, 슬라이딩 윈도우) |
| 중기 기억 | `.timsquad/trails/phase-{id}.md` | Phase 전체 사고과정 아카이브 |
| 장기 기억 | L1/L2/L3 로그 + 메트릭 + 회고 | 영구 |

---

## 5. 실행 흐름

```
사용자: "결제 API 만들어줘"

[Main Session]
|
+-- tsq-protocol 자동 활성 (Protocol Layer)
|
+-- Controller 스킬 실행 (Controller Layer)
    +-- 1. Memory 참조 (프로젝트 컨텍스트)
    +-- 2. SSOT Map -> 관련 compiled spec 확인
    +-- 3. Capability Token 발급
    |      controller-active + allowed-paths.txt
    +-- 4. 에이전트 파일 확인 (tsq-developer.md)
    +-- 5. Prerequisites -> 필요 SSOT 추출
    +-- 6. Spec Resolve (references/에서 로드)
    +-- 7. Stale 체크 (hash 비교)
    +-- 8. 방법론 참조 (config.yaml -> tdd? bdd?)
    +-- 9. 프롬프트 조합
    |      [protocol + memory + specs + methodology + 지시]
    +-- 10. Task() 호출 -> 서브에이전트 실행
    |
    |   [tsq-developer] (Skill Layer)
    |   +-- tsq-protocol 준수
    |   +-- 주입된 스펙 해석
    |   +-- rules/clean-architecture.md 참조
    |   +-- rules/error-handling.md 참조
    |   +-- 작업 수행
    |   +-- Completion Report 출력 (5필드 필수)
    |
    +-- 11. Completion Report 검증 (누락 시 재요청)
    +-- 12. 완료 트리거 실행
    |      task-complete: 단위 테스트 확인
    |      sequence-complete: 통합 테스트 + 문서 갱신 체크
    |      phase-complete: E2E + Librarian + 회고
    +-- 13. Capability Token 회수
```

---

## 6. 에이전트 시스템

### 페르소나 + 스킬 주입 패턴

에이전트는 **역할(페르소나)**을 정의하고, **스킬은 init 시점에 프로젝트 스택에 맞게 주입**된다.

```yaml
# tsq-developer.md
---
model: sonnet
tools: [Read, Write, Edit, Bash, Grep, Glob]
skills: [tsq-protocol, tsq-coding, tsq-testing, tsq-typescript]
---
# Developer
...
<prerequisites>
- architecture compiled spec
- service-spec compiled spec
</prerequisites>
```

| 에이전트 | 역할 | 도구 범위 |
|---------|------|----------|
| developer | 코드 구현 + 단위 테스트 | 전체 |
| qa | 테스트 전략 + 품질 검증 | 전체 |
| architect | 설계 검토 (읽기 전용) | Read, Grep, Glob |
| security | 보안 감사 | Read, Grep, Glob, Bash |
| librarian | Phase 기록 (src/ 수정 금지) | 전체 (src/ 제외) |
| designer | UI/UX 설계 | Read, Write, Edit |
| dba | DB 설계 + 마이그레이션 | 전체 |

동일한 developer 에이전트가 프로젝트 A(React + Hono)와 프로젝트 B(Flutter + Dart)에서 다른 스킬셋을 주입받아 완전히 다른 작업을 수행한다.

---

## 7. 기존 프레임워크와의 비교

| 특성 | CrewAI / AutoGen | LangGraph | TimSquad SDCA |
|------|-----------------|-----------|---------------|
| 설계 패러다임 | Persona-Driven | Graph-Driven | Skill-Driven |
| 컨텍스트 관리 | 에이전트별 하드코딩 | 그래프 상태로 관리 | 3계층 레이어 + SSOT 4-Tier |
| 에이전트 재사용 | 프로젝트마다 재정의 | 노드 재사용 가능 | 스펙 주입만으로 재사용 |
| 태스크 확장 | 오케스트레이션 수정 | 그래프 노드 추가 | 스킬 리소스 추가 |
| 사용자 설정 비용 | 높음 | 중간 | 최소 (타입 + 스택 선언) |
| 컨텍스트 망각 대응 | 없음 / 수동 | 체크포인팅 | SSOT + Hook + Event Sourcing |
| 프로세스 강제 | 프롬프트(soft) | 엣지 제약 | Hook(hard) + Capability Token |

### 학술적 유사 개념

- **VOYAGER** (Minecraft AI): 스킬을 코드로 저장하고 상황에 맞게 불러오는 스킬 라이브러리 개념
- **SayCan** (Google Robotics): 로봇이 가진 스킬의 실행 가능성이 행동 선택을 주도하는 구조

---

## 8. 강점과 트레이드오프

### 강점

1. **설정 비용 최소화**: 프로젝트 타입과 스택 선언만으로 전체 파이프라인 구성
2. **관심사의 완전한 분리**: Protocol / Controller / Skill 각 레이어가 독립적으로 수정 및 진화 가능
3. **프로젝트 간 에이전트 재사용**: Controller의 스펙 주입만 바뀌면 동일 에이전트가 완전히 다른 프로젝트 수행
4. **컨텍스트 무결성**: SSOT 4-Tier + Hook hard 강제 + Event Sourcing 3중 보장
5. **서브에이전트 확장 용이**: tsq-protocol이 공통 언어이므로 새 에이전트 추가 비용이 극도로 낮음
6. **동기/비동기 분리**: Controller(강제) 장애와 Daemon(관찰) 장애가 서로 영향 없음

### 트레이드오프

1. **스킬 리소스 품질 의존**: 시스템의 출력 품질 천장이 rules/references 문서의 품질에 의해 결정됨
2. **초기 리소스 구축 비용**: 프레임워크 자체는 가볍지만, 고품질 스킬 리소스를 축적하기까지 시간이 필요
3. **도메인 전문성 전제**: 해당 도메인 전문성이 있는 시니어 엔지니어가 사용할 때 가치가 극대화됨

### 트레이드오프의 전환: 해자(Moat)로서의 스킬 리소스

이 트레이드오프는 동시에 경쟁 우위가 된다. 축적된 고품질 스킬 리소스는:

- 쉽게 복제할 수 없는 도메인 지식의 구조화된 집합
- 사용할수록 풍부해지는 복리 효과
- 1인 에이전시 / 소규모 팀의 생산성 증폭기

---

## 9. Domain Layer — 성장 로드맵

Domain Layer는 SDCA의 비즈니스 확장 축이다. 현재는 기반 구조만 갖추어져 있으며, 실제 프로젝트 적용을 통해 점진적으로 축적한다.

### 현재 상태

- `templates/domains/` 디렉토리 구조 준비 (콘텐츠 미구축)
- 에이전트 overlay로 도메인별 경량 제약 제공 (`agents/overlays/domain/`)
- Open Core 모델: 기본 스킬은 공개, 도메인팩은 유료 자산

### 성장 경로

```
Phase 1 (현재): 범용 스킬 안정화
  -> 기능 스킬 + 스택 스킬로 대부분의 프로젝트 커버

Phase 2: 실전 적용에서 도메인 패턴 추출
  -> 프로젝트 수행 중 발견되는 도메인 규칙을 rules/로 축적
  -> 예: fintech 프로젝트에서 PCI-DSS 규칙, 결제 플로우 패턴 등

Phase 3: 도메인팩 구조화
  -> 축적된 규칙을 templates/domains/{domain}/ 으로 패키징
  -> 구조: rules/ + references/ (스킬과 동일한 Progressive Disclosure)

Phase 4: 마켓플레이스
  -> 도메인팩을 유료 자산으로 배포
  -> 커뮤니티 기여 도메인팩 수용
```

핵심 원칙: **먼저 만들고 구조화하지 않는다. 실전에서 축적하고 나중에 구조화한다.**

---

## 10. 타겟 사용자

- **1인 에이전시 / 프리랜서**: 최소 설정으로 다양한 프로젝트를 빠르게 수행
- **시니어 엔지니어**: 자신의 도메인 전문성을 스킬 리소스로 구조화하여 에이전트 품질을 극대화
- **소규모 개발팀**: 팀의 컨벤션과 아키텍처 결정을 스킬 리소스로 공유하여 일관성 확보

---

*SDCA는 "에이전트를 똑똑하게 만드는 것"이 아니라 "에이전트에 흘러가는 컨텍스트를 구조적으로 보장하는 것"에 집중한다. LLM의 능력이 발전하더라도 컨텍스트 품질이 출력 품질의 상한을 결정한다는 전제 위에 설계되었다.*
