# Design Reference

Designer 에이전트가 참조하는 UI/UX 설계 기준 데이터.

## 레이아웃 그리드

| 디바이스 | 컬럼 | 거터 | 마진 |
|---------|:----:|:----:|:----:|
| Desktop (1200px+) | 12 | 24px | 32px |
| Tablet (768-1199px) | 8 | 16px | 24px |
| Mobile (< 768px) | 4 | 16px | 16px |

## 반응형 브레이크포인트

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

## 인터랙션 상태

| 상태 | 설명 | 표현 |
|-----|------|------|
| Default | 기본 상태 | 일반 스타일 |
| Hover | 마우스 오버 | 색상 변화 |
| Active | 클릭/탭 중 | 눌린 효과 |
| Focus | 키보드 포커스 | 아웃라인 |
| Disabled | 비활성화 | 흐릿함 |
| Loading | 로딩 중 | 스피너 |
| Error | 오류 상태 | 빨간색 강조 |
| Success | 성공 상태 | 초록색 강조 |

## 마이크로카피 가이드

| 상황 | Bad | Good |
|-----|-----|------|
| 버튼 | "확인" | "저장하기" |
| 에러 | "오류 발생" | "이메일 형식이 올바르지 않습니다" |
| 빈 상태 | "데이터 없음" | "아직 등록된 항목이 없습니다" |
| 로딩 | "로딩 중..." | "데이터를 불러오는 중입니다" |
| 성공 | "완료" | "저장되었습니다" |

## 디자인 토큰 (기본)

```yaml
colors:
  primary: { 50: '#f0f9ff', 500: '#3b82f6', 900: '#1e3a8a' }
  gray: { 50: '#f9fafb', 500: '#6b7280', 900: '#111827' }
  semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' }

spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }

typography:
  fontSize: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px', 2xl: '24px' }
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }
```

## 컴포넌트 체크리스트

| 컴포넌트 | 변형 | 크기 | 상태 |
|---------|------|------|------|
| Button | primary, secondary, ghost | sm, md, lg | 8가지 |
| Input | text, email, password, search | sm, md, lg | 5가지 |
| Select | single, multi | sm, md, lg | 4가지 |
| Card | default, outline, elevated | - | 2가지 |
| Modal | sm, md, lg, fullscreen | - | 3가지 |
| Toast | success, warning, error, info | - | - |

## 화면 설계 문서 형식

```markdown
## SCR-XXX: [화면명]

### 기본 정보
| 항목 | 값 |
|-----|---|
| 화면 ID | SCR-XXX |
| URL | /path/to/page |
| 접근 권한 | [역할] |
| 관련 기능 | REQ-XXX |

### 와이어프레임
(ASCII 와이어프레임)

### 컴포넌트 목록
| ID | 컴포넌트 | 설명 | 상태 |

### 인터랙션
| 액션 | 결과 |

### 반응형 처리
| 브레이크포인트 | 변경사항 |
```
