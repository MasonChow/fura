// ast构造器
import * as parser from '@babel/parser';
import fs from 'fs';

import { TranslatorSource } from './typing';

const config: parser.ParserOptions = {
  sourceType: 'module',
  attachComment: true,
  plugins: ['dynamicImport', 'jsx', 'typescript'],
};

// 同步方式
export function parseContent(content: string) {
  return parser.parse(content, config);
}

// 异步方式
export function parseAsync(source: TranslatorSource) {
  if (source.content !== undefined) {
    return parseContent(source.content);
  }

  if (source.filePath !== undefined) {
    const content = fs.readFileSync(source.filePath).toString();
    return parseContent(content);
  }

  throw new Error('需要传入content或者filePath');
}
