/**
 * 简单单元测试验证
 */

describe('简单单元测试', () => {
  test('应该能够运行基础测试', () => {
    expect(1 + 1).toBe(2);
  });

  test('应该能够测试字符串', () => {
    expect('hello').toBe('hello');
    expect('hello world').toContain('world');
  });

  test('应该能够测试数组', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test('应该能够测试对象', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
    expect(obj.value).toBeGreaterThan(40);
  });

  test('应该能够测试Promise', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  test('应该能够测试异常', () => {
    expect(() => {
      throw new Error('测试错误');
    }).toThrow('测试错误');
  });
});
