---
type: platform-overlay
target: claude-code
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>tsq-protocol 스킬의 프로토콜 준수 (로그 직접 기록, Completion Report, Decision Log)</must>
    <must>작업 시작/완료 시 .timsquad/logs/ 에 직접 기록</must>
  </rules>
</overlay>
