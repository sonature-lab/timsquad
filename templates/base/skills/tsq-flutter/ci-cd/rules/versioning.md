---
title: Versioning
impact: MEDIUM
impactDescription: "버전 관리 부재 → 빌드 추적 불가, 체계적 버전 → 출시 이력 완전 추적"
tags: versioning, semver, build-number, changelog, git-tag, pubspec
---

## Versioning

**Impact: MEDIUM (버전 관리 부재 → 빌드 추적 불가, 체계적 버전 → 출시 이력 완전 추적)**

pubspec.yaml 시맨틱 버저닝, 빌드 넘버 자동 증가, CHANGELOG 생성, git 태그 연동.

### pubspec.yaml 버전 형식

**Incorrect (빌드 넘버 누락):**
```yaml
version: 1.0.0  # → 스토어 업로드 시 구분 불가, 수동 관리 실수
```

**Correct (시맨틱 버전 + 빌드 넘버):**
```yaml
version: 1.2.3+45
# major(1) — 호환 불가 변경
# minor(2) — 새 기능 (하위 호환)
# patch(3) — 버그 수정
# build(45) — CI 빌드 넘버 (스토어 구분용, 항상 증가)
```

### 빌드 넘버 자동 증가

```bash
# 전략 1: CI 빌드 넘버 (권장)
flutter build appbundle --build-number=${{ github.run_number }}  # GitHub Actions
flutter build ipa --build-number=$PROJECT_BUILD_NUMBER           # Codemagic

# 전략 2: 타임스탬프 (YYYYMMDDNN)
BUILD_NUMBER=$(date +%Y%m%d)$(printf "%02d" $BUILD_COUNT)

# 전략 3: Git 커밋 카운트
BUILD_NUMBER=$(git rev-list --count HEAD)
```

### CI에서 버전 오버라이드

```bash
TAG=${GITHUB_REF#refs/tags/v}  # v1.2.3 → 1.2.3
flutter build ipa --release \
  --build-name=$TAG \
  --build-number=${{ github.run_number }}
```

### 런타임 버전 접근

```dart
import 'package:package_info_plus/package_info_plus.dart';

class AppVersion {
  static Future<String> getFullVersion() async {
    final info = await PackageInfo.fromPlatform();
    return '${info.version}+${info.buildNumber}';  // "1.2.3+45"
  }
}
```

### CHANGELOG 자동 생성

```yaml
# .github/workflows/changelog.yml (태그 푸시 시)
- uses: orhun/git-cliff-action@v3
  with:
    config: cliff.toml
    args: --verbose
  env:
    OUTPUT: CHANGELOG.md
- uses: softprops/action-gh-release@v2
  with:
    body_path: CHANGELOG.md
```

### Git 태그 전략

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 태그 규칙:
# v1.2.3        → production
# v1.2.3-rc1    → release candidate
# v1.2.3-beta.1 → beta (TestFlight/Internal)
```

### 플랫폼별 주의

```
iOS:  CFBundleVersion = build-number, 동일 버전 재업로드 불가
Android: versionCode = 정수, 감소 불가 (한번 올리면 되돌릴 수 없음)
```

### 규칙

- `version: major.minor.patch+buildNumber` 형식 유지
- 빌드 넘버는 CI에서 자동 증가 — 수동 관리 금지
- `--build-name` + `--build-number` CI 오버라이드
- git 태그 `v*` — 릴리스와 1:1 매핑
- CHANGELOG 자동 생성 — conventional commits 기반
- 빌드 넘버 절대 감소 불가 — 스토어 거부
