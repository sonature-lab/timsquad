---
title: Anti-Patterns
impact: MEDIUM
tags: anti-pattern, performance, useEffect
---

## Anti-Patterns

### 1. useEffect for Derived State

**Incorrect:**
```tsx
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price, 0));
}, [items]);
```

**Correct:**
```tsx
const total = useMemo(
  () => items.reduce((sum, i) => sum + i.price, 0),
  [items]
);
```

### 2. Inline Object/Array in JSX

**Incorrect:**
```tsx
// 매 렌더링마다 새 참조 → memo 무효화
<Child style={{ color: 'red' }} items={[1, 2, 3]} />
```

**Correct:**
```tsx
const style = useMemo(() => ({ color: 'red' }), []);
const items = useMemo(() => [1, 2, 3], []);
<Child style={style} items={items} />
```

### 3. Props Drilling (3+ levels)

3단계 이상 Props 전달 → Context 또는 Zustand 사용.

### 4. God Component (500+ lines)

하나의 거대한 컴포넌트 → 작은 단위로 분리, 훅으로 로직 추출.

### 5. Stale Closure in Callbacks

**Incorrect:**
```tsx
const [items, setItems] = useState(initialItems);
const addItems = useCallback((newItems: Item[]) => {
  setItems([...items, ...newItems]); // items 참조 고정됨
}, [items]); // items 변경마다 재생성
```

**Correct:**
```tsx
const addItems = useCallback((newItems: Item[]) => {
  setItems(curr => [...curr, ...newItems]); // 함수형 setState
}, []); // 의존성 없음, 안정적
```
