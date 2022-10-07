// ast构造器
import * as swc from '@swc/core';
import { AST } from './typing';

// 来源内容
export interface Source {
  // 内容
  content?: string;
  // 文件路径
  filePath?: string;
}

const config = {
  // js文件都可以通过这样获取到ast，保障兼容
  syntax: 'typescript',
  tsx: true,
  dynamicImport: true,
} as const;

// 同步方式
export function parseAsync(source: Source): AST {
  if (source.content !== undefined) {
    return swc.parseSync(source.content, config);
  }

  if (source.filePath !== undefined) {
    return swc.parseFileSync(source.filePath, config);
  }

  throw new Error('需要传入content或者filePath');
}

// 异步方式
export function parse(source: Source): Promise<AST> {
  if (source.content !== undefined) {
    return swc.parse(source.content, config);
  }

  if (source.filePath !== undefined) {
    return swc.parseFile(source.filePath, config);
  }

  throw new Error('需要传入content或者filePath');
}
