import { describe, expect, test } from '@jest/globals';
import { transformAliasPath } from '../src/utils';

describe('执行测试 transformAliasPath 函数', () => {
  const alias = {
    '@': './src',
    'a/b': 'ab',
    a: 'b',
  };

  test('@ -> ./src', () => {
    expect(transformAliasPath('@/test/', alias)).toBe('./src/test/');
    expect(transformAliasPath('@src/test/', alias)).toBe('@src/test/');
    expect(transformAliasPath('@@/test/', alias)).toBe('@@/test/');
    expect(transformAliasPath('@test/', alias)).toBe('@test/');
    expect(transformAliasPath('@/', alias)).toBe('./src/');
  });

  test('a -> b', () => {
    expect(transformAliasPath('a/test/', alias)).toBe('b/test/');
    expect(transformAliasPath('ac/test/', alias)).toBe('ac/test/');
    expect(transformAliasPath('aa/test/', alias)).toBe('aa/test/');
    expect(transformAliasPath('atest/', alias)).toBe('atest/');
    expect(transformAliasPath('a/', alias)).toBe('b/');
  });

  test('a/b -> ab', () => {
    expect(transformAliasPath('a/b/test/', alias)).toBe('ab/test/');
    expect(transformAliasPath('a/bd/test/', alias)).toBe('b/bd/test/');
    expect(transformAliasPath('a/ba/b/test/', alias)).toBe('b/ba/b/test/');
    expect(transformAliasPath('a/btest/', alias)).toBe('b/btest/');
    expect(transformAliasPath('a/b/', alias)).toBe('ab/');
  });
});
