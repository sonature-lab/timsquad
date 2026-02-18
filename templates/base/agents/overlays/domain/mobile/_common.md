---
type: domain-overlay
target: mobile
version: 1.0.0
---

<overlay>
  <rules strategy="APPEND">
    <must>플랫폼 가이드라인 준수 (Material Design / Human Interface Guidelines)</must>
    <must>오프라인 모드 고려 — 네트워크 불가 시 graceful degradation</must>
    <must>배터리/메모리 효율 고려 — 불필요한 백그라운드 작업 금지</must>
  </rules>
</overlay>
