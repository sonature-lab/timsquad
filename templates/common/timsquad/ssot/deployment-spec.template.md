---
title: "배포 명세서 (Deployment Specification)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-planner
status: draft
project: {{PROJECT_NAME}}
required_level: 3
---

# 배포 명세서 (Deployment Specification)

> 인프라 아키텍처, CI/CD 파이프라인, 배포 환경을 정의합니다.
> Level 3 (Enterprise) 프로젝트 필수 문서입니다.

---

## 1. 인프라 개요

### 1.1 아키텍처 다이어그램

```
                    ┌─────────────┐
                    │   CDN       │
                    │ (CloudFront)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load Balancer│
                    │    (ALB)     │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ App #1  │      │ App #2  │      │ App #3  │
    │(Container)│    │(Container)│    │(Container)│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
         │  DB     │  │ Redis  │  │  S3    │
         │ (RDS)   │  │(Cache) │  │(Storage)│
         └─────────┘  └────────┘  └────────┘
```

### 1.2 환경 구성

| 환경 | 용도 | URL | 인프라 |
|-----|------|-----|--------|
| Development | 개발 | dev.example.com | 단일 인스턴스 |
| Staging | QA/테스트 | staging.example.com | Production 유사 |
| Production | 서비스 운영 | example.com | 고가용성 |

---

## 2. 클라우드 리소스

### 2.1 컴퓨팅

| 리소스 | 서비스 | 사양 | 환경별 수량 |
|-------|-------|------|-----------|
| 애플리케이션 | ECS Fargate | 0.5 vCPU, 1GB | Dev:1, Stg:2, Prod:3+ |
| 배치 작업 | Lambda | 256MB | 필요 시 |

### 2.2 데이터베이스

| 리소스 | 서비스 | 사양 | 백업 |
|-------|-------|------|------|
| Primary DB | RDS PostgreSQL | db.t3.medium | 7일 |
| Read Replica | RDS (Prod만) | db.t3.medium | - |
| Cache | ElastiCache Redis | cache.t3.micro | - |

### 2.3 스토리지

| 리소스 | 서비스 | 용도 |
|-------|-------|------|
| 정적 파일 | S3 | 이미지, 파일 업로드 |
| 로그 | S3 + CloudWatch | 애플리케이션 로그 |
| 백업 | S3 Glacier | DB 백업 장기 보관 |

### 2.4 네트워크

| 리소스 | 서비스 | 설정 |
|-------|-------|------|
| VPC | VPC | 10.0.0.0/16 |
| Public Subnet | 2개 AZ | 10.0.1.0/24, 10.0.2.0/24 |
| Private Subnet | 2개 AZ | 10.0.10.0/24, 10.0.20.0/24 |
| NAT Gateway | 각 AZ | 아웃바운드 트래픽 |
| Security Group | 서비스별 | 최소 권한 |

---

## 3. CI/CD 파이프라인

### 3.1 파이프라인 개요

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Push   │ → │  Build  │ → │  Test   │ → │ Deploy  │ → │ Verify  │
│ (Main)  │   │ (Docker)│   │ (Auto)  │   │ (Auto)  │   │ (Smoke) │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 3.2 브랜치 전략

| 브랜치 | 용도 | 배포 환경 | 자동 배포 |
|-------|------|----------|:--------:|
| `main` | 프로덕션 릴리스 | Production | ❌ (승인 필요) |
| `develop` | 개발 통합 | Staging | ✅ |
| `feature/*` | 기능 개발 | - | ❌ |
| `hotfix/*` | 긴급 수정 | Production | ❌ (승인 필요) |

### 3.3 배포 단계

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build & Push Docker
        run: |
          docker build -t $IMAGE_NAME .
          docker push $IMAGE_NAME

  test:
    needs: build
    steps:
      - name: Unit Tests
        run: npm test

      - name: Integration Tests
        run: npm run test:integration

      - name: Security Scan
        run: npm audit

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: ./deploy.sh staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    environment: production  # 승인 필요
    steps:
      - name: Deploy to Production
        run: ./deploy.sh production

  verify:
    needs: [deploy-staging, deploy-production]
    steps:
      - name: Smoke Test
        run: ./smoke-test.sh
```

### 3.4 롤백 전략

| 상황 | 롤백 방식 | 소요 시간 |
|-----|----------|:--------:|
| 배포 실패 | 자동 롤백 (이전 버전) | < 5분 |
| 버그 발견 | 수동 롤백 | < 10분 |
| 긴급 상황 | Blue-Green 스위칭 | < 1분 |

---

## 4. 컨테이너 설정

### 4.1 Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

### 4.2 컨테이너 설정

| 설정 | 값 | 비고 |
|-----|-----|------|
| Base Image | node:20-alpine | 보안 업데이트 유지 |
| Port | 3000 | 내부 포트 |
| User | node (non-root) | 보안 |
| Health Check | /health | 30초 간격 |

### 4.3 리소스 제한

| 환경 | CPU | Memory | 최소/최대 인스턴스 |
|-----|:---:|:------:|:---------------:|
| Development | 0.25 | 512MB | 1/1 |
| Staging | 0.5 | 1GB | 1/2 |
| Production | 1.0 | 2GB | 2/10 |

---

## 5. 환경 변수

### 5.1 환경 변수 목록

→ [env-config.md](./env-config.md) 참조

| 변수 | 설명 | 시크릿 | 환경별 |
|-----|------|:------:|:------:|
| NODE_ENV | 실행 환경 | ❌ | ✅ |
| DATABASE_URL | DB 연결 문자열 | ✅ | ✅ |
| JWT_SECRET | JWT 서명 키 | ✅ | ✅ |
| REDIS_URL | Redis 연결 | ✅ | ✅ |
| AWS_REGION | AWS 리전 | ❌ | ❌ |

### 5.2 시크릿 관리

| 관리 도구 | 용도 |
|----------|------|
| AWS Secrets Manager | 데이터베이스 자격 증명 |
| GitHub Secrets | CI/CD 환경 변수 |
| AWS Parameter Store | 애플리케이션 설정 |

---

## 6. 모니터링

### 6.1 메트릭

| 메트릭 | 도구 | 알림 조건 |
|-------|------|----------|
| CPU 사용률 | CloudWatch | > 80% (5분) |
| Memory 사용률 | CloudWatch | > 85% (5분) |
| 응답 시간 (P95) | CloudWatch | > 500ms |
| 에러율 | CloudWatch | > 1% |
| 4xx/5xx 응답 | ALB Metrics | > 10/분 |

### 6.2 로깅

| 로그 유형 | 저장소 | 보존 기간 |
|---------|-------|----------|
| 애플리케이션 | CloudWatch Logs | 30일 |
| 액세스 로그 | S3 | 90일 |
| 에러 로그 | CloudWatch + 알림 | 90일 |
| 감사 로그 | S3 (Glacier) | 7년 |

### 6.3 알림

| 채널 | 용도 | 대상 |
|-----|------|------|
| Slack | 일반 알림 | #alerts |
| PagerDuty | 긴급 알림 (P1) | On-call |
| Email | 일일 리포트 | 팀 전체 |

---

## 7. 스케일링

### 7.1 Auto Scaling 정책

| 조건 | 액션 | 쿨다운 |
|-----|------|:------:|
| CPU > 70% (3분) | Scale Out (+1) | 300초 |
| CPU < 30% (10분) | Scale In (-1) | 300초 |
| Memory > 80% | Scale Out (+1) | 300초 |

### 7.2 예상 트래픽

| 시간대 | 예상 RPS | 인스턴스 수 |
|-------|:-------:|:---------:|
| 평시 | 100 | 2 |
| 피크 (오후 2-6시) | 500 | 5 |
| 이벤트 | 1000+ | 10+ |

---

## 8. 재해 복구 (DR)

### 8.1 RPO/RTO

| 메트릭 | 목표 | 전략 |
|-------|:----:|------|
| RPO (복구 시점 목표) | 1시간 | 시간별 백업 |
| RTO (복구 시간 목표) | 4시간 | 자동화된 복구 |

### 8.2 백업 전략

| 대상 | 주기 | 보존 | 복구 테스트 |
|-----|------|------|-----------|
| DB 스냅샷 | 매일 | 7일 | 월간 |
| S3 데이터 | 실시간 (버전관리) | 30일 | 분기별 |
| 설정 파일 | 변경 시 (Git) | 영구 | - |

### 8.3 Multi-AZ 구성

| 리소스 | AZ 분산 |
|-------|:------:|
| ECS Tasks | 2 AZ |
| RDS | 2 AZ (Multi-AZ) |
| ElastiCache | 2 AZ |
| ALB | 2 AZ |

---

## 9. 보안

### 9.1 네트워크 보안

| 레이어 | 보안 설정 |
|-------|----------|
| Edge | CloudFront + WAF |
| ALB | HTTPS only, Security Group |
| Application | Private Subnet |
| Database | Private Subnet, 암호화 |

### 9.2 접근 제어

| 리소스 | 접근 방식 |
|-------|----------|
| AWS Console | IAM + MFA 필수 |
| 서버 접속 | SSM Session Manager (SSH 없음) |
| DB 접속 | Bastion + IAM Auth |

---

## 10. 비용 최적화

### 10.1 예상 비용 (월간)

| 리소스 | 예상 비용 | 비고 |
|-------|:--------:|------|
| ECS Fargate | $150 | 3 tasks 기준 |
| RDS | $100 | db.t3.medium |
| ElastiCache | $30 | cache.t3.micro |
| S3 + Transfer | $50 | 100GB 기준 |
| CloudWatch | $20 | 로그 + 메트릭 |
| **총계** | **$350** | |

### 10.2 비용 절감 방안

| 방안 | 절감율 | 적용 |
|-----|:------:|------|
| Reserved Instance | 30-50% | 운영 안정 후 |
| Spot Instance (비운영) | 70-90% | Dev/Test |
| S3 Intelligent Tiering | 20% | 자동 |

---

## 11. 관련 문서

- [환경 설정](./env-config.md) - 환경 변수
- [보안 명세](./security-spec.md) - 보안 설정
- [테스트 명세](./test-spec.md) - CI/CD 테스트

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-planner | 초기 작성 |
