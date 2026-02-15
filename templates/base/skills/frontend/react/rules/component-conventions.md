---
title: Component Conventions
impact: HIGH
tags: component, structure, naming
---

## Component Conventions

프로젝트 전체에서 일관된 컴포넌트 구조를 유지하기 위한 규칙.

### Structure Template

```tsx
// 1. 타입 정의
interface Props { ... }

// 2. 컴포넌트
export function ComponentName({ prop1, prop2 }: Props) {
  // 3. 훅 (순서 중요 - 항상 최상위)
  const [state, setState] = useState();
  const { data } = useQuery();
  const router = useRouter();

  // 4. 파생 값
  const derivedValue = useMemo(() => ..., [deps]);

  // 5. 이벤트 핸들러
  const handleClick = useCallback(() => ..., [deps]);

  // 6. 이펙트 (최소화)
  useEffect(() => ..., [deps]);

  // 7. Early Return
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  // 8. 메인 렌더링
  return ( ... );
}
```

### Rules

**Incorrect:**
```tsx
// default export, 타입 미정의
export default function UserCard({ user, onEdit }) {
  return <div>{user.name}</div>;
}
```

**Correct:**
```tsx
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="user-card">
      <Avatar src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      {onEdit && <Button onClick={() => onEdit(user)}>Edit</Button>}
    </div>
  );
}
```

### Limits

- 컴포넌트: **200줄 이하** (초과 시 분리)
- **named export**: `export function` (default export 금지)
- **forwardRef**: ref 전달이 필요한 컴포넌트는 필수
