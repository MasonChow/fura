// ast构造器
import * as parser from '@babel/parser';
import { fs } from './fileReader';
import logger from './logger';

export interface TranslatorSource {
  // 内容
  content?: string;
  // 文件路径
  filePath?: string;
}

const config: parser.ParserOptions = {
  sourceType: 'module',
  attachComment: true,
  plugins: ['dynamicImport', 'jsx', 'typescript', 'classProperties'],
};

// 同步方式
export function parseContent(content: string) {
  return parser.parse(content, config);
}

// 异步方式
export function parseAsync(source: TranslatorSource) {
  try {
    if (source.content !== undefined) {
      return parseContent(source.content);
    }

    if (source.filePath !== undefined) {
      const content = fs.readFileSync(source.filePath).toString();
      return parseContent(content);
    }

    throw new Error('需要传入content或者filePath');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`解析文件失败 ${JSON.stringify(source)}`, error.message);
    }
    throw new Error('解析文件失败');
  }
}
