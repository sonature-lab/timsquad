# Inspect Checklist — 상세 점검 항목

## 1. Hook 정합성

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| H-1 | 유령 Hook | settings.json command에서 참조하는 .sh가 scripts/에 존재하는지 | 미존재 → Red |
| H-2 | 고아 스크립트 | scripts/*.sh 중 settings.json 어디에서도 참조 안 되고, 다른 .sh에서도 source 안 되는 것 | 존재 → Amber |
| H-3 | Fail 전략 | `\|\| true`가 있으면 fail-open, 없으면 fail-closed. 의도와 일치하는지 | 불일치 → Amber |
| H-4 | Hook 수 카운트 | settings.json의 개별 command 엔트리 수 vs 문서 주장 | 불일치 → Amber |

### Fail 전략 의도 참조

| 스크립트 | 의도 | 기대 |
|---------|------|------|
| phase-guard | fail-closed | `\|\| true` 없어야 함 |
| check-capability | fail-closed | `\|\| true` 없어야 함 |
| safe-guard | fail-closed | `\|\| true` 없어야 함 |
| completion-guard | fail-closed | `\|\| true` 없어야 함 |
| build-gate | fail-closed | `\|\| true` 없어야 함 |
| pre-compact | fail-closed | `\|\| true` 없어야 함 |
| context-restore | fail-closed | `\|\| true` 없어야 함 |
| change-scope-guard | fail-open | `\|\| true` 있어야 함 |
| tdd-guard | fail-open | `\|\| true` 있어야 함 |
| stale-guard | fail-open | `\|\| true` 있어야 함 |
| tsq daemon start | fail-open | `\|\| true` 있어야 함 |
| subagent-start | fail-open | `\|\| true` 있어야 함 |
| subagent-stop | fail-open | `\|\| true` 있어야 함 |

## 2. 스킬 정합성

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| S-1 | 고아 디렉토리 | templates/base/skills/tsq-*/ 중 SKILL.md 없는 것 | Red |
| S-2 | Frontmatter 누락 | SKILL.md에 `name:` 또는 `description:` 없음 | Red |
| S-3 | 120줄 초과 | `wc -l SKILL.md > 120` | Amber |
| S-4 | references 포인터 끊김 | SKILL.md에서 `references/xxx.md` 참조하지만 파일 없음 | Red |
| S-5 | 미등록 스킬 | BASE_SKILLS, SKILL_PRESETS, DOMAIN_SKILL_MAP, methodology 매핑 어디에도 없음 | Amber |
| S-6 | reference frontmatter | references/*.md에 `title:`, `category:` 없음 | Amber |

## 3. CLI 정합성

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| C-1 | 미등록 커맨드 | src/commands/*.ts 존재하지만 src/index.ts에 import 없음 | Red |
| C-2 | 유령 import | src/index.ts에 register*Command import 있지만 파일 없음 | Red |
| C-3 | 빌드 동기화 | src/ 최신 mtime > dist/ 최신 mtime | Amber |

## 4. 문서 Drift

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| D-1 | Hook 수 | competitive-analysis + MEMORY.md 주장 vs settings.json 실제 | 불일치 → Amber |
| D-2 | 스킬 수 | 문서 "N개" vs `ls templates/base/skills/tsq-* \| wc -l` | 불일치 → Amber |
| D-3 | 테스트 수 | 문서 "N 테스트" vs `npm test` 실제 출력 | 불일치 → Amber |
| D-4 | CLI 수 | 문서 "N개" vs `ls src/commands/*.ts \| wc -l` | 불일치 → Amber |
| D-5 | 보완계획 상태 | competitive-analysis vs MEMORY.md vs GitHub 이슈 | 불일치 → Red |
| D-6 | 내부 자기 불일치 | 같은 문서 내 다른 곳에서 다른 수치 | Red |

## 5. 테스트 커버리지 갭

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| T-1 | 핵심 소스 미커버 | src/commands/*.ts, src/lib/*.ts 중 대응 .test.ts 없음 | Amber (commands), Red (핵심 lib) |
| T-2 | daemon 미커버 | src/daemon/*.ts 중 대응 .test.ts 없음 | Amber |
| T-3 | utils 미커버 | src/utils/*.ts 전수 미커버 | Amber |
| T-4 | 빈 테스트 | .test.ts 존재하지만 describe/it 블록 없음 | Red |

### 핵심 lib 판정 기준
다음 파일에 테스트 없으면 Red: `config.ts`, `template.ts`, `planning-parser.ts`, `workflow-state.ts`, `agent-generator.ts`, `skill-generator.ts`, `compiler.ts`

## 6. 설정 일관성

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| CF-1 | 버전 일치 | package.json version vs getInstalledVersion() 반환값 | 불일치 → Red |
| CF-2 | files 필드 | package.json files에 templates/base, templates/platforms 포함 | 누락 → Red |
| CF-3 | npm scripts | test, build, prepublishOnly 정의 여부 | 누락 → Red |
| CF-4 | tsconfig strict | strict: true 활성화 여부 | false → Amber |
| CF-5 | engines | package.json engines.node ≥ 18 | 미정의 → Amber |

## 7. 의존성 위생

| ID | 점검 | 방법 | 판정 |
|----|------|------|------|
| DEP-1 | 순환 import | `madge --circular src/` 또는 수동 grep | 존재 → Red |
| DEP-2 | 미사용 타입 export | types/*.ts의 export가 src/ 어디에서도 import 안 됨 | 존재 → Amber |
| DEP-3 | 미사용 devDeps | package.json devDependencies 중 코드/설정에서 안 쓰이는 것 | 존재 → Amber |
