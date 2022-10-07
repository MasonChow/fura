import { describe, expect, test } from '@jest/globals';
import { isJsTypeFile, formatFileSize } from '../src/utils';

describe('执行测试 isJsTypeFile 函数', () => {
  test('*.ts/tsx/js/jsx的后缀文件检查为true', () => {
    expect(isJsTypeFile('test.ts.ts')).toBe(true);
    expect(isJsTypeFile('test.tsx')).toBe(true);
    expect(isJsTypeFile('test.js')).toBe(true);
    expect(isJsTypeFile('test.jsx')).toBe(true);
  });

  test('testd.ts的文件检查为true', () => {
    expect(isJsTypeFile('testd.ts')).toBe(true);
  });

  test('*.d.ts的后缀文件返回false', () => {
    expect(isJsTypeFile('index.d.ts')).toBe(false);
    expect(isJsTypeFile('test.d.ts')).toBe(false);
  });

  test('css/less/html/png/jpeg等文件返回false', () => {
    expect(isJsTypeFile('test.css')).toBe(false);
    expect(isJsTypeFile('test.less')).toBe(false);
    expect(isJsTypeFile('test.html')).toBe(false);
    expect(isJsTypeFile('test.png')).toBe(false);
    expect(isJsTypeFile('test.jpeg')).toBe(false);
  });
});

describe('执行测试 formatFileSize 函数', () => {
  test('单位为B校验', () => {
    expect(formatFileSize(600)).toBe('600.00B');
    expect(formatFileSize(1.3)).toBe('1.30B');
    expect(formatFileSize(1.301)).toBe('1.30B');
    expect(formatFileSize(1.3333)).toBe('1.33B');
    expect(formatFileSize(1.3388)).toBe('1.34B');
  });

  test('单位为KB校验', () => {
    const base = 1024;
    expect(formatFileSize(base)).toBe('1.00KB');
    expect(formatFileSize(base * 2)).toBe('2.00KB');
    expect(formatFileSize(base * 1.3)).toBe('1.30KB');
    expect(formatFileSize(base * 1.301)).toBe('1.30KB');
    expect(formatFileSize(base * 1.3333)).toBe('1.33KB');
    expect(formatFileSize(base * 1.3388)).toBe('1.34KB');
  });

  test('单位为MB校验', () => {
    const base = 1024 * 1024;
    expect(formatFileSize(base)).toBe('1.00MB');
    expect(formatFileSize(base * 2)).toBe('2.00MB');
    expect(formatFileSize(base * 1.3)).toBe('1.30MB');
    expect(formatFileSize(base * 1.301)).toBe('1.30MB');
    expect(formatFileSize(base * 1.3333)).toBe('1.33MB');
    expect(formatFileSize(base * 1.3388)).toBe('1.34MB');
  });

  test('单位为GB校验', () => {
    const base = 1024 * 1024 * 1024;
    expect(formatFileSize(base)).toBe('1.00GB');
    expect(formatFileSize(base * 2)).toBe('2.00GB');
    expect(formatFileSize(base * 1.3)).toBe('1.30GB');
    expect(formatFileSize(base * 1.301)).toBe('1.30GB');
    expect(formatFileSize(base * 1.3333)).toBe('1.33GB');
    expect(formatFileSize(base * 1.3388)).toBe('1.34GB');
  });

  test('单位为TB校验', () => {
    const base = 1024 * 1024 * 1024 * 1024;
    expect(formatFileSize(base)).toBe('1.00TB');
    expect(formatFileSize(base * 2)).toBe('2.00TB');
    expect(formatFileSize(base * 1.3)).toBe('1.30TB');
    expect(formatFileSize(base * 1.301)).toBe('1.30TB');
    expect(formatFileSize(base * 1.3333)).toBe('1.33TB');
    expect(formatFileSize(base * 1.3388)).toBe('1.34TB');
  });
});
