---
name: security
description: 보안 검토 및 취약점 탐지 가이드라인
user-invocable: false
---

<skill name="security">
  <purpose>OWASP Top 10 기반 보안 취약점 탐지 및 방지 가이드라인</purpose>

  <owasp-top-10>
    <vulnerability id="1" name="Injection">
      <description>SQL, NoSQL, OS, LDAP Injection</description>
      <example type="bad">
        <![CDATA[
const query = `SELECT * FROM users WHERE email = '${email}'`;
        ]]>
      </example>
      <example type="good">
        <![CDATA[
// Parameterized Query
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);

// ORM 사용
await userRepository.findOne({ where: { email } });
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="2" name="Broken Authentication">
      <description>취약한 인증 메커니즘</description>
      <example type="bad">
        <![CDATA[
if (password.length >= 4) { ... }
        ]]>
      </example>
      <example type="good">
        <![CDATA[
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

const hash = await bcrypt.hash(password, 12);
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="3" name="Sensitive Data Exposure">
      <description>민감 정보 노출</description>
      <example type="bad">
        <![CDATA[
logger.info('User login', { email, password });
return { ...user }; // passwordHash 포함
        ]]>
      </example>
      <example type="good">
        <![CDATA[
logger.info('User login', { email, password: '***' });
return userToDto(user); // passwordHash 제외
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="5" name="Broken Access Control">
      <description>부적절한 접근 제어</description>
      <example type="bad">
        <![CDATA[
app.get('/api/users/:id', async (req, res) => {
  const user = await userService.getUser(req.params.id);
  return res.json(user);
});
        ]]>
      </example>
      <example type="good">
        <![CDATA[
app.get('/api/users/:id', authenticate, authorize('user:read'), async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    throw new ForbiddenError();
  }
  const user = await userService.getUser(req.params.id);
  return res.json(user);
});
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="6" name="Security Misconfiguration">
      <description>보안 설정 오류</description>
      <example type="good">
        <![CDATA[
// 보안 헤더 설정
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
  },
}));

// CORS 제한
app.use(cors({
  origin: ['https://allowed-domain.com'],
  credentials: true,
}));
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="7" name="Cross-Site Scripting (XSS)">
      <description>XSS 공격</description>
      <example type="bad">
        <![CDATA[
element.innerHTML = userInput;
        ]]>
      </example>
      <example type="good">
        <![CDATA[
element.textContent = userInput;

// 또는 이스케이프 처리
import { escape } from 'lodash';
element.innerHTML = escape(userInput);
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="8" name="Insecure Deserialization">
      <description>안전하지 않은 역직렬화</description>
      <example type="bad">
        <![CDATA[
const data = JSON.parse(userInput);
processData(data);
        ]]>
      </example>
      <example type="good">
        <![CDATA[
import { z } from 'zod';
const schema = z.object({
  name: z.string().max(100),
  age: z.number().min(0).max(150),
});
const data = schema.parse(JSON.parse(userInput));
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="9" name="Using Components with Known Vulnerabilities">
      <description>취약한 컴포넌트 사용</description>
      <example type="good">
        <![CDATA[
# 정기적 취약점 스캔
npm audit
npm audit fix

# 의존성 업데이트
npm outdated
npm update
        ]]>
      </example>
    </vulnerability>

    <vulnerability id="10" name="Insufficient Logging">
      <description>불충분한 로깅 및 모니터링</description>
      <example type="good">
        <![CDATA[
logger.warn('Login failed', {
  email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

if (failedAttempts >= 5) {
  logger.error('Possible brute force attack', { email, ip: req.ip });
  await lockAccount(email);
}
        ]]>
      </example>
    </vulnerability>
  </owasp-top-10>

  <additional-checks>
    <check name="시크릿 관리">
      <must-not>하드코딩: const apiKey = 'sk-1234567890';</must-not>
      <must>환경변수: const apiKey = process.env.API_KEY;</must>
      <must>시크릿 매니저: await secretManager.getSecret('api-key');</must>
    </check>

    <check name="Rate Limiting">
      <example>
        <![CDATA[
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: 'Too many requests',
});

app.use('/api/', limiter);
        ]]>
      </example>
    </check>

    <check name="CSRF 방지">
      <example>
        <![CDATA[
import csrf from 'csurf';
app.use(csrf({ cookie: true }));

// 폼에 토큰 포함
<input type="hidden" name="_csrf" value="{{csrfToken}}">
        ]]>
      </example>
    </check>
  </additional-checks>

  <checklist>
    <item priority="critical">SQL/NoSQL Injection 방지</item>
    <item priority="critical">강력한 인증 구현</item>
    <item priority="critical">민감 정보 보호</item>
    <item priority="critical">접근 제어 구현</item>
    <item priority="high">XSS 방지</item>
    <item priority="high">입력 검증</item>
    <item priority="high">의존성 취약점 확인</item>
    <item priority="medium">보안 로깅 구현</item>
    <item priority="medium">시크릿 안전하게 관리</item>
    <item priority="medium">Rate Limiting 적용</item>
  </checklist>
</skill>
