# {에이전트} 작업 로그 - {YYYY-MM-DD}

---

## {HH:MM} | {작업 제목}

### What (작업 내용)
- {수행한 작업 1}
- {수행한 작업 2}
- {수행한 작업 3}

### Why (작업 이유)
> 간단한 경우: 1-2줄로 작성
> 중요한 결정이 포함된 경우: ADR 링크

{간단한 이유}

**관련 결정:** [ADR-XXX](../ssot/adr/ADR-XXX.md) (있는 경우)

### Reference (근거/참조)
| 유형 | 링크 | 설명 |
|-----|------|-----|
| SSOT | [service-spec.md#xxx](../ssot/service-spec.md#xxx) | API 명세 |
| SSOT | [ui-ux-spec.md#xxx](../ssot/ui-ux-spec.md#xxx) | 화면 설계 |
| ADR | [ADR-001](../ssot/adr/ADR-001.md) | 관련 결정 |
| 외부 | [문서명](URL) | 참고 자료 |
| 논의 | Slack #channel MM/DD | 팀 논의 |

### 변경 파일
```
src/path/to/file.ts (신규/수정/삭제)
src/path/to/another.ts (수정)
```

### 결과
- ✅ 성공 / ⚠️ 부분 성공 / ❌ 실패
- 테스트: X/Y 통과
- 비고: {추가 메모}

### 후속 작업 / 피드백 요청
- [ ] @{담당자} {요청 내용}
- [ ] @{담당자} {요청 내용}

---

<!-- 다음 작업 로그는 위에 추가 -->
