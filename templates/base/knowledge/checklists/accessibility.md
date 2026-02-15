# Accessibility Checklist

Designer 에이전트가 참조하는 접근성 기준.

## WCAG 2.1 기준

| 레벨 | 설명 | 필수 |
|-----|------|:----:|
| A | 최소 접근성 | 필수 |
| AA | 권장 수준 | 필수 |
| AAA | 최고 수준 | 선택 |

## 필수 체크리스트

| 항목 | 기준 | 검증 방법 |
|-----|------|----------|
| 색상 대비 | 4.5:1 이상 | Contrast Checker |
| 키보드 접근 | 모든 기능 | Tab 테스트 |
| 스크린 리더 | 의미 전달 | VoiceOver/NVDA |
| 폼 라벨 | 명확한 연결 | `<label for>` |
| 이미지 대체 | alt 텍스트 | `<img alt>` |
| 포커스 표시 | 명확한 표시 | 시각적 확인 |

## ARIA 사용 가이드

```html
<!-- 버튼 상태 -->
<button aria-pressed="true">토글</button>
<button aria-expanded="false">메뉴</button>

<!-- 폼 검증 -->
<input aria-invalid="true" aria-describedby="error-msg" />
<span id="error-msg">필수 항목입니다</span>

<!-- 동적 콘텐츠 -->
<div aria-live="polite">새 메시지가 도착했습니다</div>
```
