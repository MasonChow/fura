import types from '@babel/types';

// 生成的ast类型
export type AST = types.File;

export type Import = types.Import;

export interface TranslatorSource {
  // 内容
  content?: string;
  // 文件路径
  filePath?: string;
}

export interface TranslatorOptions {
  // 路径别名 例如 {'@/*': 'src/*'}
  alias?: Record<string, string>;
}
