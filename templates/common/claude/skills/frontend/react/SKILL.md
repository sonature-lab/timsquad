---
name: react
description: React 컴포넌트 개발 가이드라인
user-invocable: false
---

<skill name="react">
  <purpose>유지보수 가능한 React 컴포넌트 개발 가이드라인</purpose>

  <philosophy>
    <principle>컴포넌트는 단일 책임</principle>
    <principle>UI와 로직 분리 (커스텀 훅)</principle>
    <principle>Props로 명시적 데이터 흐름</principle>
    <principle>서버 상태와 클라이언트 상태 분리</principle>
  </philosophy>

  <component-patterns>
    <pattern name="함수형 컴포넌트 기본">
      <example type="good">
        <![CDATA[
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="user-card">
      <Avatar src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      {onEdit && (
        <Button onClick={() => onEdit(user)}>Edit</Button>
      )}
    </div>
  );
}
        ]]>
      </example>
    </pattern>

    <pattern name="컴포넌트 구조 템플릿">
      <template>
        <![CDATA[
// 1. 타입 정의
interface Props { ... }

// 2. 컴포넌트
export function ComponentName({ prop1, prop2 }: Props) {
  // 3. 훅 (순서 중요 - 항상 최상위)
  const [state, setState] = useState();
  const { data } = useQuery();
  const router = useRouter();

  // 4. 파생 값 (계산된 값)
  const derivedValue = useMemo(() => ..., [deps]);

  // 5. 이벤트 핸들러
  const handleClick = useCallback(() => ..., [deps]);

  // 6. 이펙트 (최소화 - 정말 필요한 경우만)
  useEffect(() => ..., [deps]);

  // 7. Early Return (조건부 렌더링)
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  // 8. 메인 렌더링
  return ( ... );
}
        ]]>
      </template>
    </pattern>

    <pattern name="Controlled vs Uncontrolled">
      <description>폼 컴포넌트의 두 가지 패턴</description>
      <example type="controlled">
        <![CDATA[
// Controlled: 부모가 상태 관리 (권장)
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// 사용
function Form() {
  const [name, setName] = useState('');
  return <Input value={name} onChange={setName} />;
}
        ]]>
      </example>
      <example type="uncontrolled">
        <![CDATA[
// Uncontrolled: 내부에서 상태 관리 (간단한 경우)
interface SearchInputProps {
  onSearch: (query: string) => void;
  defaultValue?: string;
}

export function SearchInput({ onSearch, defaultValue = '' }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (inputRef.current) {
      onSearch(inputRef.current.value);
    }
  };

  return (
    <div>
      <input ref={inputRef} defaultValue={defaultValue} />
      <button onClick={handleSubmit}>Search</button>
    </div>
  );
}
        ]]>
      </example>
    </pattern>

    <pattern name="Compound Components (복합 컴포넌트)">
      <description>관련 컴포넌트를 그룹화하여 유연한 API 제공</description>
      <example>
        <![CDATA[
// 사용법 - 직관적이고 유연함
<Card>
  <Card.Header>
    <Card.Title>사용자 정보</Card.Title>
    <Card.Description>프로필을 확인하세요</Card.Description>
  </Card.Header>
  <Card.Content>
    <UserInfo user={user} />
  </Card.Content>
  <Card.Footer>
    <Button variant="outline">취소</Button>
    <Button>저장</Button>
  </Card.Footer>
</Card>

// 구현 - Context로 상태 공유
interface CardContextValue {
  variant?: 'default' | 'outline';
}

const CardContext = createContext<CardContextValue>({});

function Card({ children, variant = 'default' }: PropsWithChildren<{ variant?: 'default' | 'outline' }>) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn('card', `card--${variant}`)}>{children}</div>
    </CardContext.Provider>
  );
}

Card.Header = function CardHeader({ children }: PropsWithChildren) {
  return <div className="card-header">{children}</div>;
};

Card.Title = function CardTitle({ children }: PropsWithChildren) {
  return <h3 className="card-title">{children}</h3>;
};

Card.Description = function CardDescription({ children }: PropsWithChildren) {
  return <p className="card-description">{children}</p>;
};

Card.Content = function CardContent({ children }: PropsWithChildren) {
  return <div className="card-content">{children}</div>;
};

Card.Footer = function CardFooter({ children }: PropsWithChildren) {
  return <div className="card-footer">{children}</div>;
};

export { Card };
        ]]>
      </example>
    </pattern>

    <pattern name="Render Props">
      <description>렌더링 로직을 외부에서 주입</description>
      <example>
        <![CDATA[
// 마우스 위치 추적 컴포넌트
interface MouseTrackerProps {
  children: (position: { x: number; y: number }) => ReactNode;
}

export function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return <>{children(position)}</>;
}

// 사용
<MouseTracker>
  {({ x, y }) => (
    <div>마우스 위치: {x}, {y}</div>
  )}
</MouseTracker>

// 실전: 데이터 페칭 렌더 프롭
interface DataFetcherProps<T> {
  url: string;
  children: (state: {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }) => ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery<T>({
    queryKey: [url],
    queryFn: () => fetch(url).then(res => res.json()),
  });

  return <>{children({ data: data ?? null, isLoading, error })}</>;
}
        ]]>
      </example>
    </pattern>

    <pattern name="Forwarding Refs">
      <description>ref를 내부 DOM 요소로 전달</description>
      <example>
        <![CDATA[
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

// forwardRef로 ref 전달 가능하게
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', size = 'md', className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          'button',
          `button--${variant}`,
          `button--${size}`,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

// 사용 - 부모에서 ref로 DOM 직접 접근 가능
function Form() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const focusButton = () => {
    buttonRef.current?.focus();
  };

  return (
    <>
      <Button ref={buttonRef}>Submit</Button>
      <button onClick={focusButton}>Focus Submit</button>
    </>
  );
}
        ]]>
      </example>
    </pattern>
  </component-patterns>

  <hooks-patterns>
    <pattern name="커스텀 훅으로 로직 분리">
      <example type="bad">
        <![CDATA[
// Bad: 컴포넌트에 로직이 섞임
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  // 200줄의 복잡한 렌더링 로직...
}
        ]]>
      </example>
      <example type="good">
        <![CDATA[
// Good: 훅으로 데이터 페칭 분리
// hooks/use-user.ts
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}

// components/user-profile.tsx - 깔끔한 UI 로직만
function UserProfile({ userId }: Props) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <ProfileCard user={user} />;
}
        ]]>
      </example>
    </pattern>

    <pattern name="useReducer (복잡한 상태)">
      <description>상태 변경 로직이 복잡할 때 reducer로 관리</description>
      <example>
        <![CDATA[
// 장바구니 상태 - 여러 액션이 있는 복잡한 상태
type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'APPLY_COUPON'; coupon: Coupon };

interface CartState {
  items: CartItem[];
  coupon: Coupon | null;
  total: number;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, quantity: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.itemId),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.itemId
            ? { ...i, quantity: action.quantity }
            : i
        ),
      };
    case 'CLEAR':
      return { ...state, items: [], coupon: null };
    case 'APPLY_COUPON':
      return { ...state, coupon: action.coupon };
    default:
      return state;
  }
}

// 커스텀 훅으로 래핑
export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    coupon: null,
    total: 0,
  });

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', item });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  // 파생 값
  const total = useMemo(() => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (state.coupon) {
      return subtotal * (1 - state.coupon.discount);
    }
    return subtotal;
  }, [state.items, state.coupon]);

  return {
    items: state.items,
    coupon: state.coupon,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };
}
        ]]>
      </example>
    </pattern>

    <pattern name="useImperativeHandle (명령형 API 노출)">
      <description>부모가 자식의 메서드를 호출해야 할 때</description>
      <example>
        <![CDATA[
// 모달 컴포넌트 - 부모가 열고 닫기를 제어
interface ModalHandle {
  open: () => void;
  close: () => void;
}

interface ModalProps {
  title: string;
  children: ReactNode;
}

export const Modal = forwardRef<ModalHandle, ModalProps>(
  function Modal({ title, children }, ref) {
    const [isOpen, setIsOpen] = useState(false);

    // 부모에게 노출할 메서드 정의
    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }), []);

    if (!isOpen) return null;

    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>{title}</h2>
          {children}
          <button onClick={() => setIsOpen(false)}>닫기</button>
        </div>
      </div>
    );
  }
);

// 사용
function App() {
  const modalRef = useRef<ModalHandle>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.open()}>
        모달 열기
      </button>
      <Modal ref={modalRef} title="확인">
        <p>정말 삭제하시겠습니까?</p>
      </Modal>
    </>
  );
}
        ]]>
      </example>
    </pattern>

    <pattern name="커스텀 훅 패턴 모음">
      <example name="useToggle">
        <![CDATA[
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}

// 사용
const { value: isOpen, toggle, setFalse: close } = useToggle();
        ]]>
      </example>
      <example name="useDebounce">
        <![CDATA[
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 사용 - 검색 입력
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  // debouncedQuery가 변경될 때만 API 호출
  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });
}
        ]]>
      </example>
      <example name="useLocalStorage">
        <![CDATA[
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}

// 사용
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
        ]]>
      </example>
      <example name="usePrevious">
        <![CDATA[
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// 사용 - 이전 값과 비교
function Counter({ count }: { count: number }) {
  const prevCount = usePrevious(count);

  return (
    <div>
      현재: {count}, 이전: {prevCount ?? 'N/A'}
      {prevCount !== undefined && count > prevCount && ' ↑'}
      {prevCount !== undefined && count < prevCount && ' ↓'}
    </div>
  );
}
        ]]>
      </example>
    </pattern>
  </hooks-patterns>

  <state-management>
    <guideline name="상태 위치 결정">
      <case location="로컬 (useState)">단일 컴포넌트에서만 사용</case>
      <case location="상위 전달 (Props)">부모-자식 간 공유</case>
      <case location="Context">깊은 트리에서 공유 (테마, 인증, i18n)</case>
      <case location="전역 (Zustand)">여러 페이지에서 공유, 복잡한 상태</case>
      <case location="서버 상태 (React Query)">API 데이터 - 캐싱, 동기화</case>
    </guideline>

    <example name="Zustand 기본">
      <![CDATA[
// store/use-auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),

      updateUser: (updates) => set({
        user: get().user ? { ...get().user!, ...updates } : null,
      }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ token: state.token }), // token만 저장
    }
  )
);

// 사용
function Profile() {
  const { user, logout } = useAuthStore();

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
}
      ]]>
    </example>

    <example name="Zustand + React Query 조합">
      <![CDATA[
// 서버 상태는 React Query, UI 상태는 Zustand

// store/use-ui-store.ts
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  selectedItems: string[];
  selectItem: (id: string) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  selectedItems: [],
  selectItem: (id) => set((state) => ({
    selectedItems: state.selectedItems.includes(id)
      ? state.selectedItems.filter(i => i !== id)
      : [...state.selectedItems, id]
  })),
  clearSelection: () => set({ selectedItems: [] }),
}));

// 컴포넌트에서 조합
function ItemList() {
  // 서버 상태 (React Query)
  const { data: items, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  // UI 상태 (Zustand)
  const { selectedItems, selectItem } = useUIStore();

  if (isLoading) return <Skeleton />;

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
      ]]>
    </example>
  </state-management>

  <vercel-best-practices>
    <section name="Eliminating Waterfalls" priority="CRITICAL">
      <description>Waterfalls are the #1 performance killer. Each sequential await adds full network latency.</description>
      <pattern name="Promise.all for Independent Operations">
        <example type="bad">
          <![CDATA[
// Bad: sequential execution, 3 round trips
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: parallel execution, 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);
          ]]>
        </example>
      </pattern>
      <pattern name="Strategic Suspense Boundaries">
        <example type="bad">
          <![CDATA[
// Bad: entire layout waits for data
async function Page() {
  const data = await fetchData(); // Blocks entire page

  return (
    <div>
      <Sidebar />
      <Header />
      <DataDisplay data={data} />
      <Footer />
    </div>
  );
}
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: wrapper shows immediately, data streams in
function Page() {
  return (
    <div>
      <Sidebar />
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  );
}

async function DataDisplay() {
  const data = await fetchData(); // Only blocks this component
  return <div>{data.content}</div>;
}
          ]]>
        </example>
      </pattern>
    </section>

    <section name="Bundle Size Optimization" priority="CRITICAL">
      <pattern name="Avoid Barrel File Imports">
        <description>Import directly from source files to avoid loading thousands of unused modules</description>
        <example type="bad">
          <![CDATA[
// Bad: imports entire library (200-800ms extra on cold start)
import { Check, X, Menu } from 'lucide-react';
import { Button, TextField } from '@mui/material';
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: imports only what you need
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '@mui/material/Button';

// Or use Next.js config:
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/material']
  }
};
          ]]>
        </example>
      </pattern>
      <pattern name="Dynamic Imports for Heavy Components">
        <example type="bad">
          <![CDATA[
// Bad: Monaco bundles with main chunk ~300KB
import { MonacoEditor } from './monaco-editor';

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />;
}
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: Monaco loads on demand
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
);

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />;
}
          ]]>
        </example>
      </pattern>
      <pattern name="Preload Based on User Intent">
        <example>
          <![CDATA[
// Preload on hover/focus for perceived speed
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    if (typeof window !== 'undefined') {
      void import('./monaco-editor');
    }
  };

  return (
    <button
      onMouseEnter={preload}
      onFocus={preload}
      onClick={onClick}
    >
      Open Editor
    </button>
  );
}
          ]]>
        </example>
      </pattern>
    </section>

    <section name="Server-Side Performance" priority="HIGH">
      <pattern name="Minimize Serialization at RSC Boundaries">
        <description>Only pass fields that the client actually uses</description>
        <example type="bad">
          <![CDATA[
// Bad: serializes all 50 fields
async function Page() {
  const user = await fetchUser();  // 50 fields
  return <Profile user={user} />;
}

'use client'
function Profile({ user }: { user: User }) {
  return <div>{user.name}</div>;  // uses 1 field
}
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: serializes only 1 field
async function Page() {
  const user = await fetchUser();
  return <Profile name={user.name} />;
}

'use client'
function Profile({ name }: { name: string }) {
  return <div>{name}</div>;
}
          ]]>
        </example>
      </pattern>
      <pattern name="React.cache() for Per-Request Deduplication">
        <example>
          <![CDATA[
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await db.user.findUnique({
    where: { id: session.user.id }
  });
});

// Multiple calls execute query only once within a single request
          ]]>
        </example>
      </pattern>
    </section>

    <section name="Re-render Optimization" priority="MEDIUM">
      <pattern name="Functional setState Updates">
        <description>Prevents stale closures and creates stable callback references</description>
        <example type="bad">
          <![CDATA[
// Bad: requires state as dependency, risk of stale closure
const [items, setItems] = useState(initialItems);

const addItems = useCallback((newItems: Item[]) => {
  setItems([...items, ...newItems]);
}, [items]);  // ❌ recreated on every items change
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: stable callback, no stale closures
const [items, setItems] = useState(initialItems);

const addItems = useCallback((newItems: Item[]) => {
  setItems(curr => [...curr, ...newItems]);
}, []);  // ✅ No dependencies needed, never recreated
          ]]>
        </example>
      </pattern>
      <pattern name="Lazy State Initialization">
        <example type="bad">
          <![CDATA[
// Bad: buildSearchIndex() runs on EVERY render
const [searchIndex, setSearchIndex] = useState(buildSearchIndex(items));
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: buildSearchIndex() runs ONLY on initial render
const [searchIndex, setSearchIndex] = useState(() => buildSearchIndex(items));
          ]]>
        </example>
      </pattern>
      <pattern name="startTransition for Non-Urgent Updates">
        <example>
          <![CDATA[
import { startTransition } from 'react';

function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => {
      startTransition(() => setScrollY(window.scrollY));
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
}
          ]]>
        </example>
      </pattern>
    </section>

    <section name="Rendering Performance" priority="MEDIUM">
      <pattern name="CSS content-visibility for Long Lists">
        <example>
          <![CDATA[
// CSS - defers off-screen rendering
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}

// 1000 messages: browser skips layout/paint for ~990 off-screen items
// Result: 10× faster initial render
          ]]>
        </example>
      </pattern>
      <pattern name="Explicit Conditional Rendering">
        <example type="bad">
          <![CDATA[
// Bad: renders "0" when count is 0
{count && <span className="badge">{count}</span>}
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: renders nothing when count is 0
{count > 0 ? <span className="badge">{count}</span> : null}
          ]]>
        </example>
      </pattern>
      <pattern name="Use toSorted() for Immutability">
        <example type="bad">
          <![CDATA[
// Bad: mutates the users prop array!
const sorted = useMemo(
  () => users.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
);
          ]]>
        </example>
        <example type="good">
          <![CDATA[
// Good: creates new sorted array, original unchanged
const sorted = useMemo(
  () => users.toSorted((a, b) => a.name.localeCompare(b.name)),
  [users]
);
          ]]>
        </example>
      </pattern>
    </section>
  </vercel-best-practices>

  <performance-patterns>
    <pattern name="React.memo (리렌더링 방지)">
      <description>props가 변경되지 않으면 리렌더링 스킵</description>
      <example>
        <![CDATA[
// 무거운 컴포넌트 - memo로 감싸기
interface ExpensiveListProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export const ExpensiveList = memo(function ExpensiveList({
  items,
  onItemClick,
}: ExpensiveListProps) {
  console.log('ExpensiveList rendered'); // props 변경 시만 출력

  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

// 부모에서 사용 시 주의: onItemClick도 안정적이어야 함
function Parent() {
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState(0);

  // useCallback으로 함수 참조 안정화
  const handleItemClick = useCallback((item: Item) => {
    console.log('clicked', item);
  }, []); // 의존성 없으면 함수 참조 유지

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      {/* count가 변해도 ExpensiveList는 리렌더링 안 됨 */}
      <ExpensiveList items={items} onItemClick={handleItemClick} />
    </>
  );
}
        ]]>
      </example>
    </pattern>

    <pattern name="useMemo (계산 캐싱)">
      <example>
        <![CDATA[
function Dashboard({ transactions }: { transactions: Transaction[] }) {
  // 무거운 계산 - 의존성 변경 시만 재계산
  const statistics = useMemo(() => {
    console.log('Calculating statistics...');
    return {
      total: transactions.reduce((sum, t) => sum + t.amount, 0),
      average: transactions.length
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0,
      max: Math.max(...transactions.map(t => t.amount)),
      byCategory: transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [transactions]); // transactions 변경 시만 재계산

  return (
    <div>
      <StatCard title="총액" value={statistics.total} />
      <StatCard title="평균" value={statistics.average} />
      <CategoryChart data={statistics.byCategory} />
    </div>
  );
}
        ]]>
      </example>
    </pattern>

    <pattern name="가상화 (Virtualization)">
      <description>대량 리스트 렌더링 최적화</description>
      <example>
        <![CDATA[
// @tanstack/react-virtual 사용
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export function VirtualList({ items, onItemClick }: VirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 각 아이템 높이 추정
    overscan: 5, // 뷰포트 밖에 미리 렌더링할 개수
  });

  return (
    <div
      ref={parentRef}
      className="virtual-list-container"
      style={{ height: '400px', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={item.id}
              className="virtual-list-item"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onClick={() => onItemClick(item)}
            >
              {item.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 10,000개 아이템도 부드럽게 렌더링
<VirtualList items={tenThousandItems} onItemClick={handleClick} />
        ]]>
      </example>
    </pattern>

    <pattern name="Code Splitting (지연 로딩)">
      <example>
        <![CDATA[
import { lazy, Suspense } from 'react';

// 무거운 컴포넌트 지연 로딩
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  const { isAdmin } = useAuth();

  return (
    <div>
      {/* 차트가 필요할 때만 로딩 */}
      <Suspense fallback={<ChartSkeleton />}>
        <HeavyChart data={data} />
      </Suspense>

      {/* 관리자만 접근하는 패널 */}
      {isAdmin && (
        <Suspense fallback={<Loading />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}

// 라우터에서 페이지 단위 분할
const routes = [
  {
    path: '/dashboard',
    element: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    element: lazy(() => import('./pages/Settings')),
  },
];
        ]]>
      </example>
    </pattern>
  </performance-patterns>

  <error-handling>
    <pattern name="Error Boundary">
      <example>
        <![CDATA[
// components/error-boundary.tsx
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 서비스로 전송
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-fallback">
          <h2>문제가 발생했습니다</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 사용
<ErrorBoundary
  fallback={<ErrorPage />}
  onError={(error) => sendToSentry(error)}
>
  <App />
</ErrorBoundary>

// 섹션별로 격리
<Layout>
  <ErrorBoundary fallback={<SidebarError />}>
    <Sidebar />
  </ErrorBoundary>
  <ErrorBoundary fallback={<ContentError />}>
    <MainContent />
  </ErrorBoundary>
</Layout>
        ]]>
      </example>
    </pattern>
  </error-handling>

  <form-patterns>
    <pattern name="React Hook Form + Zod">
      <description>타입 안전한 폼 처리</description>
      <example>
        <![CDATA[
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 스키마 정의
const signupSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string()
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다'),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: '약관에 동의해야 합니다' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      await signupApi(data);
      reset();
      toast.success('회원가입 완료!');
    } catch (error) {
      toast.error('회원가입 실패');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>이메일</label>
        <input {...register('email')} type="email" />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label>비밀번호</label>
        <input {...register('password')} type="password" />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      <div>
        <label>비밀번호 확인</label>
        <input {...register('confirmPassword')} type="password" />
        {errors.confirmPassword && (
          <span className="error">{errors.confirmPassword.message}</span>
        )}
      </div>

      <div>
        <label>이름</label>
        <input {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label>
          <input {...register('agreeToTerms')} type="checkbox" />
          약관에 동의합니다
        </label>
        {errors.agreeToTerms && (
          <span className="error">{errors.agreeToTerms.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '처리 중...' : '회원가입'}
      </button>
    </form>
  );
}
        ]]>
      </example>
    </pattern>
  </form-patterns>

  <testing-patterns>
    <pattern name="컴포넌트 테스트 (Testing Library)">
      <example>
        <![CDATA[
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfile } from './UserProfile';

// 테스트용 래퍼
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('UserProfile', () => {
  it('로딩 상태를 표시한다', () => {
    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('사용자 정보를 표시한다', async () => {
    // API Mock
    server.use(
      rest.get('/api/users/1', (req, res, ctx) => {
        return res(ctx.json({ id: '1', name: 'John', email: 'john@test.com' }));
      })
    );

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
    });
  });

  it('에러 상태를 표시한다', async () => {
    server.use(
      rest.get('/api/users/1', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument();
    });
  });

  it('수정 버튼 클릭 시 모달이 열린다', async () => {
    const user = userEvent.setup();

    server.use(
      rest.get('/api/users/1', (req, res, ctx) => {
        return res(ctx.json({ id: '1', name: 'John', email: 'john@test.com' }));
      })
    );

    render(<UserProfile userId="1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '수정' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
        ]]>
      </example>
    </pattern>

    <pattern name="커스텀 훅 테스트">
      <example>
        <![CDATA[
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';
import { useDebounce } from './useDebounce';

describe('useCounter', () => {
  it('초기값을 설정한다', () => {
    const { result } = renderHook(() => useCounter(10));

    expect(result.current.count).toBe(10);
  });

  it('increment가 값을 증가시킨다', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrement가 값을 감소시킨다', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(9);
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('지정된 시간 후에 값을 업데이트한다', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // 값 변경
    rerender({ value: 'updated', delay: 500 });

    // 아직 변경 안 됨
    expect(result.current).toBe('initial');

    // 시간 경과
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 이제 변경됨
    expect(result.current).toBe('updated');
  });
});
        ]]>
      </example>
    </pattern>
  </testing-patterns>

  <file-structure>
    <structure>
      <![CDATA[
src/
├── components/          # 재사용 UI 컴포넌트
│   ├── ui/             # 기본 UI (Button, Input, Card)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── index.ts    # barrel export
│   └── common/         # 공통 컴포넌트 (Header, Footer)
│
├── features/           # 기능별 모듈 (Feature-Sliced Design)
│   ├── auth/
│   │   ├── components/ # 기능 전용 컴포넌트
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── hooks/      # 기능 전용 훅
│   │   │   └── useAuth.ts
│   │   ├── api/        # API 호출
│   │   │   └── auth.api.ts
│   │   └── types.ts    # 타입 정의
│   └── users/
│       ├── components/
│       ├── hooks/
│       └── api/
│
├── hooks/              # 공통 커스텀 훅
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── index.ts
│
├── lib/                # 유틸리티, 설정
│   ├── utils.ts
│   └── api-client.ts
│
├── stores/             # 전역 상태 (Zustand)
│   ├── useAuthStore.ts
│   └── useUIStore.ts
│
└── types/              # 공통 타입 정의
    └── index.ts
      ]]>
    </structure>
  </file-structure>

  <rules>
    <category name="컴포넌트">
      <must>함수형 컴포넌트 사용</must>
      <must>Props 타입 명시 (interface)</must>
      <must>단일 책임 원칙 - 한 가지 일만</must>
      <must>named export 사용 (export function)</must>
      <must>forwardRef로 ref 전달 지원</must>
      <must-not>클래스 컴포넌트</must-not>
      <must-not>default export (컴포넌트)</must-not>
      <must-not>200줄 넘는 컴포넌트</must-not>
    </category>
    <category name="훅">
      <must>커스텀 훅으로 로직 분리</must>
      <must>훅 이름은 use로 시작</must>
      <must>의존성 배열 정확히 관리</must>
      <must>useCallback으로 자식에 전달하는 함수 안정화</must>
      <must>함수형 setState로 stale closure 방지</must>
      <must-not>조건문/반복문 안에서 훅 호출</must-not>
      <must-not>useEffect 남용 (대부분 필요 없음)</must-not>
    </category>
    <category name="상태 관리">
      <must>서버 상태는 React Query</must>
      <must>전역 UI 상태는 Zustand</must>
      <must>로컬 상태는 useState</must>
      <must>복잡한 로직은 useReducer</must>
      <must>비싼 초기값은 lazy initialization</must>
      <must-not>모든 상태를 전역으로</must-not>
      <must-not>props drilling (3단계 이상)</must-not>
    </category>
    <category name="성능 (Vercel Best Practices)">
      <must>리스트에 고유한 key (index 사용 금지)</must>
      <must>무거운 계산은 useMemo</must>
      <must>무거운 컴포넌트는 memo</must>
      <must>대량 리스트는 가상화 또는 content-visibility</must>
      <must>barrel import 피하기 (직접 import)</must>
      <must>무거운 컴포넌트는 dynamic import</must>
      <must>Promise.all()로 병렬 fetch</must>
      <must>toSorted()로 배열 불변성 유지</must>
      <must-not>렌더링마다 새 객체/배열 생성</must-not>
      <must-not>Sequential await (Waterfall)</must-not>
      <must-not>RSC 경계에서 불필요한 데이터 직렬화</must-not>
    </category>
  </rules>

  <anti-patterns>
    <anti-pattern name="Props Drilling">
      <problem>여러 레벨 거쳐 props 전달 (3단계 이상)</problem>
      <solution>Context 또는 Zustand로 상태 관리</solution>
    </anti-pattern>
    <anti-pattern name="useEffect for derived state">
      <problem>useEffect로 파생 상태 계산</problem>
      <example type="bad">
        <![CDATA[
// Bad
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price, 0));
}, [items]);
        ]]>
      </example>
      <solution>렌더링 중 계산 또는 useMemo</solution>
      <example type="good">
        <![CDATA[
// Good
const total = useMemo(
  () => items.reduce((sum, i) => sum + i.price, 0),
  [items]
);
        ]]>
      </example>
    </anti-pattern>
    <anti-pattern name="God Component">
      <problem>하나의 거대한 컴포넌트 (500줄+)</problem>
      <solution>작은 단위로 분리, 훅으로 로직 추출</solution>
    </anti-pattern>
    <anti-pattern name="Inline Object/Array in JSX">
      <problem>렌더링마다 새 참조 생성</problem>
      <example type="bad">
        <![CDATA[
// Bad - 매 렌더링마다 새 객체
<Child style={{ color: 'red' }} items={[1, 2, 3]} />
        ]]>
      </example>
      <solution>상수로 추출 또는 useMemo</solution>
      <example type="good">
        <![CDATA[
// Good
const style = useMemo(() => ({ color: 'red' }), []);
const items = useMemo(() => [1, 2, 3], []);
<Child style={style} items={items} />
        ]]>
      </example>
    </anti-pattern>
  </anti-patterns>

  <checklist>
    <item priority="critical">함수형 컴포넌트 + Props 타입 정의</item>
    <item priority="critical">커스텀 훅으로 로직 분리</item>
    <item priority="critical">서버 상태는 React Query 사용</item>
    <item priority="critical">Error Boundary로 에러 격리</item>
    <item priority="critical">Waterfall 제거 (Promise.all)</item>
    <item priority="critical">Barrel import 피하기</item>
    <item priority="high">의존성 배열 정확히 관리</item>
    <item priority="high">리스트에 고유 key (index 금지)</item>
    <item priority="high">폼은 React Hook Form + Zod</item>
    <item priority="high">함수형 setState 사용</item>
    <item priority="high">Dynamic import로 무거운 컴포넌트 분리</item>
    <item priority="medium">대량 리스트 가상화 / content-visibility</item>
    <item priority="medium">Code Splitting 적용</item>
    <item priority="medium">불필요한 useEffect 제거</item>
    <item priority="medium">RSC 경계에서 필요한 데이터만 전달</item>
  </checklist>
</skill>
