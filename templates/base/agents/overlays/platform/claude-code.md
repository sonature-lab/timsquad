---
type: platform-overlay
target: claude-code
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>tsq-protocol 스킬의 CLI 규칙 준수 (tsq log, tsq feedback, tsq commit)</must>
    <must>작업 시작/완료 시 tsq log로 기록</must>
  </rules>
</overlay>
