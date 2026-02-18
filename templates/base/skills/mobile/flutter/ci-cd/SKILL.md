---
name: ci-cd
description: |
  Flutter CI/CD 파이프라인 가이드라인.
  코드 서명, Fastlane, Codemagic, GitHub Actions,
  스토어 배포, 버전 관리 자동화.
version: "1.0.0"
tags: [flutter, ci-cd, fastlane, codemagic, github-actions, code-signing, deployment]
user-invocable: false
---

# CI/CD Pipeline

Flutter 앱의 빌드, 테스트, 서명, 배포 자동화 가이드.
iOS/Android 코드 서명, Fastlane/Codemagic/GitHub Actions 파이프라인, 스토어 배포, 버전 관리.

## Philosophy

- 배포는 자동 — 수동 빌드/업로드 금지, CI가 전부 처리
- 서명은 분리 — 코드 서명 키를 CI 환경에 안전하게 주입, 레포에 절대 포함 금지
- 버전은 규칙 — 시맨틱 버저닝 + 빌드 넘버 자동 증가
- 환경은 격리 — dev/staging/prod 설정 분리, 환경별 독립 파이프라인

## Resources

6개 규칙 + 1개 참조. CI/CD 파이프라인 전체를 커버.

| Priority | Type | Resource | Description |
|----------|------|----------|-------------|
| CRITICAL | rule | [code-signing](rules/code-signing.md) | iOS provisioning profile, Android keystore, 인증서 관리 |
| HIGH | rule | [fastlane-setup](rules/fastlane-setup.md) | Fastfile 구성, match, supply, deliver, .env 관리 |
| HIGH | rule | [codemagic-setup](rules/codemagic-setup.md) | codemagic.yaml 워크플로우, 환경변수, 빌드 트리거 |
| HIGH | rule | [github-actions](rules/github-actions.md) | Flutter 빌드 워크플로우, 테스트-빌드-업로드 파이프라인 |
| HIGH | rule | [store-deployment](rules/store-deployment.md) | TestFlight, Play Store tracks, 메타데이터, 단계적 출시 |
| MEDIUM | rule | [versioning](rules/versioning.md) | 시맨틱 버저닝, 빌드 넘버 자동 증가, CHANGELOG, git 태그 |
| — | ref | [ci-cd-pipeline](references/ci-cd-pipeline.md) | 파이프라인 아키텍처, 환경 설정, 시크릿 관리, 롤백 |

## Quick Rules

### 코드 서명
- iOS: `match` 로 인증서/프로필 Git 저장소 관리 (팀 공유)
- Android: keystore 파일을 CI 환경변수로 base64 주입
- 개발용/배포용 인증서 분리 — 동일 인증서 사용 금지
- 서명 키를 레포에 커밋 금지 — `.gitignore` 에 `*.keystore`, `*.jks`, `*.p12` 추가

### Fastlane
- `Fastfile` 에 `ios`/`android` 레인 분리
- `match` → iOS 인증서 자동 관리 (Git 저장소 or Google Cloud Storage)
- `supply` → Google Play 업로드, `deliver` → App Store 업로드
- `.env` 로 환경별 설정 분리 (`.env.production`, `.env.staging`)

### CI/CD 플랫폼
- Codemagic: Flutter 네이티브 지원, `codemagic.yaml` 로 워크플로우 정의
- GitHub Actions: `subosito/flutter-action` 으로 Flutter 설치, pub cache 캐시 필수
- 빌드 트리거: 태그 푸시 (`v*`) → 릴리스, PR → 테스트만

### 스토어 배포
- TestFlight: `deliver` 또는 `app-store-connect` API로 업로드
- Play Store: internal → closed → open → production 트랙 순서
- 단계적 출시 (staged rollout): 1% → 5% → 20% → 50% → 100%
- 메타데이터 (스크린샷, 설명) 코드로 관리 (`fastlane/metadata/`)

### 버전 관리
- `pubspec.yaml`: `version: major.minor.patch+buildNumber`
- 빌드 넘버: CI에서 자동 증가 (`--build-number=$CI_BUILD_NUMBER`)
- git 태그: `v1.2.3` 형식, 릴리스 빌드와 1:1 매핑

## Checklist

| Priority | Item |
|----------|------|
| CRITICAL | iOS 코드 서명 (provisioning profile + 인증서) CI에 구성 |
| CRITICAL | Android keystore CI 환경변수로 안전하게 주입 |
| CRITICAL | 서명 키/인증서 `.gitignore` 에 추가 확인 |
| CRITICAL | CI 파이프라인: test → build → deploy 순서 보장 |
| HIGH | Fastlane match 설정 (iOS 인증서 팀 공유) |
| HIGH | 환경별 (dev/staging/prod) 빌드 설정 분리 |
| HIGH | 스토어 업로드 자동화 (TestFlight + Play Store) |
| HIGH | 빌드 넘버 자동 증가 전략 구현 |
| MEDIUM | CHANGELOG 자동 생성 (conventional commits 기반) |
| MEDIUM | 슬랙/디스코드 배포 알림 설정 |
| MEDIUM | 롤백 절차 문서화 및 테스트 |
