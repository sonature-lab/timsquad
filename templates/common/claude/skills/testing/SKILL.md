---
name: testing
description: 테스트 작성 규칙 및 패턴 가이드라인
user-invocable: false
---

<skill name="testing">
  <purpose>품질 보장을 위한 테스트 작성 가이드라인</purpose>

  <tdd-cycle>
    <step order="1" name="Red">실패하는 테스트 작성</step>
    <step order="2" name="Green">테스트를 통과하는 최소 코드 작성</step>
    <step order="3" name="Refactor">코드 정리 (테스트는 계속 통과)</step>
  </tdd-cycle>

  <test-pyramid>
    <level name="Unit" quantity="다수">빠름, 격리됨, 저비용</level>
    <level name="Integration" quantity="중간">컴포넌트 간 연동</level>
    <level name="E2E" quantity="소수">전체 흐름, 고비용</level>
  </test-pyramid>

  <given-when-then>
    <example>
      <![CDATA[
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user when email is unique', async () => {
      // Given: 테스트 조건 설정
      const userRepository = createMockRepository();
      userRepository.findByEmail.mockResolvedValue(null);
      const service = new UserService(userRepository);

      // When: 테스트 대상 실행
      const result = await service.createUser({
        email: 'test@example.com',
        password: 'password123',
      });

      // Then: 결과 검증
      expect(result.email).toBe('test@example.com');
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw error when email already exists', async () => {
      // Given
      const userRepository = createMockRepository();
      userRepository.findByEmail.mockResolvedValue({ id: '1', email: 'test@example.com' });
      const service = new UserService(userRepository);

      // When & Then
      await expect(
        service.createUser({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });
});
      ]]>
    </example>
  </given-when-then>

  <test-categories>
    <category name="Happy Path">
      <description>정상적인 흐름 테스트</description>
      <example>
        <![CDATA[
it('should return user when valid id is provided', async () => {
  const user = await userService.getUser('valid-id');
  expect(user).toBeDefined();
  expect(user.id).toBe('valid-id');
});
        ]]>
      </example>
    </category>
    <category name="Edge Cases">
      <description>경계 조건 테스트</description>
      <cases>
        <case>빈 문자열</case>
        <case>최대 길이 입력</case>
        <case>0 값</case>
        <case>null 입력</case>
      </cases>
    </category>
    <category name="Error Cases">
      <description>오류 상황 테스트</description>
      <example>
        <![CDATA[
it('should throw NotFoundError when user does not exist', async () => {
  await expect(userService.getUser('non-existent-id'))
    .rejects
    .toThrow(NotFoundError);
});
        ]]>
      </example>
    </category>
  </test-categories>

  <coverage-standards>
    <metric name="Line Coverage" minimum="80%" recommended="90%"/>
    <metric name="Branch Coverage" minimum="70%" recommended="80%"/>
    <metric name="Function Coverage" minimum="80%" recommended="90%"/>
  </coverage-standards>

  <naming-pattern>
    <format>should {expected behavior} when {condition}</format>
    <examples>
      <example type="good">should return null when user is not found</example>
      <example type="good">should throw ValidationError when email is invalid</example>
      <example type="good">should increment retry count when request fails</example>
      <example type="bad">test getUser</example>
      <example type="bad">user not found</example>
      <example type="bad">works correctly</example>
    </examples>
  </naming-pattern>

  <mock-guidelines>
    <when-to-mock>
      <case>외부 서비스 (DB, API, 파일시스템)</case>
      <case>비결정적 요소 (시간, 랜덤)</case>
      <case>느린 작업</case>
    </when-to-mock>
    <example>
      <![CDATA[
// Repository Mock
const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

// 시간 Mock
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));
      ]]>
    </example>
  </mock-guidelines>

  <checklist>
    <item>Given-When-Then 패턴을 따르는가</item>
    <item>Happy path, Edge case, Error case가 있는가</item>
    <item>테스트 이름이 명확한가</item>
    <item>커버리지 기준을 충족하는가</item>
    <item>Mock이 적절히 사용되었는가</item>
    <item>테스트가 독립적인가 (순서 무관)</item>
  </checklist>
</skill>
