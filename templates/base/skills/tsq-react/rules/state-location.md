---
title: State Location
impact: HIGH
tags: state, zustand, react-query
---

## State Location

상태의 종류에 따라 적절한 위치를 선택한다.

| 상태 종류 | 위치 | 예시 |
|-----------|------|------|
| 단일 컴포넌트 | `useState` | 토글, 입력값 |
| 부모-자식 공유 | Props 전달 | 선택된 아이템 |
| 깊은 트리 공유 | Context | 테마, 인증, i18n |
| 여러 페이지 공유 | Zustand | UI 상태, 사이드바, 선택 항목 |
| API 데이터 | React Query | 서버 데이터 (캐싱, 동기화) |
| 복잡한 로직 | `useReducer` | 장바구니, 폼 위저드 |

### Key: 서버 상태 vs 클라이언트 상태 분리

**Incorrect:**
```tsx
// 서버 데이터를 전역 store에 저장
const useStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await api.getUsers();
    set({ users });
  },
}));
```

**Correct:**
```tsx
// 서버 데이터는 React Query, UI 상태는 Zustand
function ItemList() {
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: fetchItems });
  const { selectedItems, selectItem } = useUIStore();

  return (
    <ul>
      {items?.map(item => (
        <li
          key={item.id}
          className={selectedItems.includes(item.id) ? 'selected' : ''}
          onClick={() => selectItem(item.id)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```
