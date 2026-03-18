---
title: "인프라 토폴로지 (Infrastructure Topology)"
version: 1.0.0
last_updated: {{DATE}}
author: tsq-architect
status: draft
project: {{PROJECT_NAME}}
---

# 인프라 토폴로지 (Infrastructure Topology)

> 시스템의 물리/논리적 인프라 구조, 네트워크 토폴로지, 서비스 의존성을 정의합니다.
> 인프라 프로비저닝, 장애 분석, 용량 계획의 기준 문서입니다.

---

## 1. 시스템 아키텍처

### 1.1 전체 토폴로지

```
                         ┌─────────────┐
                         │     DNS     │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │   CDN/WAF   │
                         └──────┬──────┘
                                │
                    ┌───────────▼───────────┐
                    │     Load Balancer     │
                    │        (ALB)          │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
       ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
       │  Service A  │  │  Service B  │  │  Service C  │
       │ (Container) │  │ (Container) │  │ (Container) │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
       ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
       │  Database   │  │    Cache    │  │   Storage   │
       │             │  │   (Redis)   │  │             │
       └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. 네트워크 구성

### 2.1 VPC 설계

| 항목 | 설정 | 비고 |
|-----|------|------|
| VPC CIDR | 10.0.0.0/16 | 65,534 호스트 |
| 리전 | (프로젝트 대상 리전) | |
| AZ | 2개 (a, c) | 고가용성 |

### 2.2 서브넷

| 서브넷 | CIDR | AZ | 접근 | 용도 |
|-------|------|:--:|------|------|
| public-a | 10.0.1.0/24 | a | 인터넷 | ALB, NAT |
| public-c | 10.0.2.0/24 | c | 인터넷 | ALB, NAT |
| private-app-a | 10.0.10.0/24 | a | NAT | 앱 서비스 |
| private-app-c | 10.0.20.0/24 | c | NAT | 앱 서비스 |
| private-data-a | 10.0.100.0/24 | a | 내부만 | DB, Cache |
| private-data-c | 10.0.200.0/24 | c | 내부만 | DB, Cache |

### 2.3 Security Groups

| SG | 인바운드 | 소스 | 용도 |
|---|---------|------|------|
| sg-alb | 80, 443 | 0.0.0.0/0 | 로드밸런서 |
| sg-app | 3000 | sg-alb | 앱 서비스 |
| sg-db | 5432 | sg-app | PostgreSQL |
| sg-cache | 6379 | sg-app | Redis |

---

## 3. 서비스 구성

### 3.1 서비스 목록

| 서비스 | 타입 | 포트 | 인스턴스 (Prod) | 의존성 |
|-------|------|:----:|:-----------:|--------|
| API Server | 컨테이너 | 3000 | 2-10 | DB, Cache, Storage |
| Worker | 컨테이너 | - | 1-3 | DB, Queue |
| Scheduler | 서버리스 함수 | - | 1 | DB |

### 3.2 서비스 의존성

```
API Server ──► Database
           ──► Cache
           ──► Storage
           ──► Worker (Queue)
           ──► External API

Worker     ──► Database
           ──► Queue
           ──► Notification

Scheduler  ──► Database
           ──► Worker (Queue)
```

### 3.3 외부 의존성

| 서비스 | 용도 | SLA | 장애 시 대응 |
|-------|------|:---:|-----------|
| 결제 PG | 결제 처리 | 99.9% | 재시도 + 큐잉 |
| SMS | 본인인증 | 99.5% | 대체 수단 (Email) |
| CDN | 정적 파일 | 99.99% | 오리진 폴백 |

---

## 4. 데이터 흐름

### 4.1 주요 데이터 흐름

| 흐름 | 경로 | 프로토콜 | 암호화 |
|-----|------|---------|:------:|
| 클라이언트 → API | CDN → ALB → App | HTTPS | ✅ |
| App → DB | Private subnet | TCP/5432 | ✅ (TLS) |
| App → Cache | Private subnet | TCP/6379 | ✅ (TLS) |
| App → S3 | VPC Endpoint | HTTPS | ✅ |
| App → External | NAT Gateway | HTTPS | ✅ |

---

## 5. 환경별 차이

| 항목 | Development | Staging | Production |
|-----|------------|---------|-----------|
| AZ | 1 | 2 | 2 |
| App 인스턴스 | 1 | 2 | 2-10 (Auto) |
| DB | db.t3.micro | db.t3.small | db.r6g.large |
| DB Multi-AZ | ❌ | ❌ | ✅ |
| Redis | ❌ | cache.t3.micro | cache.r6g.large |
| Redis 클러스터 | ❌ | ❌ | ✅ |
| WAF | ❌ | ❌ | ✅ |
| 백업 | ❌ | 일간 | 시간별 |

---

## 6. IaC (Infrastructure as Code)

### 6.1 도구

| 도구 | 용도 | 경로 |
|-----|------|------|
| Terraform | 인프라 프로비저닝 | `infra/terraform/` |
| Docker Compose | 로컬 개발 | `docker-compose.yml` |

### 6.2 모듈 구조

```
infra/terraform/
├── modules/
│   ├── networking/    # VPC, Subnet, SG
│   ├── compute/       # ECS, Lambda
│   ├── database/      # RDS, ElastiCache
│   └── storage/       # S3, CloudFront
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
└── global/            # IAM, Route53
```

---

## 7. 관련 문서

- [배포 명세](./deployment-spec.md) — CI/CD, 컨테이너 설정
- [모니터링 명세](./monitoring-spec.md) — 인프라 메트릭
- [보안 명세](./security-spec.md) — 네트워크 보안

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | {{DATE}} | tsq-architect | 초기 작성 |
