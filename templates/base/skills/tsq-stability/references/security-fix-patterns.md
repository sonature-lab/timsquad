---
title: Security Fix Patterns
category: reference
---

# 보안 수정 패턴 모음

출처: OWASP Node.js Cheat Sheet, ShellCheck Wiki, BashFAQ/048, Shellharden

## 1. 커맨드 인젝션 (Node.js)

### Incorrect
```typescript
execSync(`git clone "${url}" "${dir}"`);
const sanitized = input.replace(/["`$\\]/g, '');
execSync(`command "${sanitized}"`);
```

### Correct
```typescript
import { execFileSync } from 'child_process';
execFileSync('git', ['clone', url, dir]);  // shell: false (기본값)
```

**원칙**: `execSync` → `execFileSync` 배열 기반. 새니타이징은 불완전하므로 의존하지 않는다.

## 2. JSON 구성 (Shell Script)

### Incorrect
```bash
echo "{\"key\":\"$VAR\"}"           # $VAR에 " 포함 시 깨짐
cat > file.json << EOF
{"key": "$VAR"}
EOF
```

### Correct
```bash
jq -n --arg key "$VAR" '{"key": $key}'
jq -n --arg k1 "$A" --arg k2 "$B" '{a: $k1, b: $k2}'
jq -n --argjson num "$NUMBER" '{count: $num}'  # 숫자/불린
```

## 3. jq + set -e Fail-Open

### Incorrect
```bash
set -e
VAR=$(echo "$INPUT" | jq -r '.field' 2>/dev/null)  # jq 실패 시 스크립트 종료
```

### Correct
```bash
set -e
VAR=$(echo "$INPUT" | jq -r '.field // ""' 2>/dev/null || echo "")
```

## 4. source 대신 안전한 설정 읽기

### Incorrect
```bash
source "$HOME/.config"  # 임의 코드 실행 가능
```

### Correct
```bash
VALUE=$(grep -m1 '^KEY=' "$HOME/.config" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
```

## 5. grep 변수 안전 사용

### Incorrect
```bash
grep "$var" file          # $var가 "-e ..."이면 플래그로 해석
grep "^${file}" output    # $file에 . + [ 등 regex 특수문자
```

### Correct
```bash
grep -- "$var" file       # -- 로 옵션 종료
grep -F -- "$file" output # -F 로 리터럴 매칭
```

## 6. 사용자 입력 검증

### Incorrect
```bash
PROJECT_NAME="$1"
echo "name: $PROJECT_NAME" > config.yaml  # 인젝션 가능
```

### Correct
```bash
if [[ ! "$1" =~ ^[a-zA-Z][a-zA-Z0-9_-]{0,63}$ ]]; then
  echo "Error: invalid name" >&2; exit 1
fi
PROJECT_NAME="$1"
```

## 7. .gitignore 보안 항목

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
credentials.json
service-account*.json
```
