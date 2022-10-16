// TODO import modules 解析

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { AST, TranslatorOptions } from '../typing';
import * as utils from '../utils';

export function translatorImports(ast: AST, option: TranslatorOptions = {}) {
  const { alias = {} } = option;

  const result: Array<{
    // 动态引入 | 普通引入
    type: 'dynamicImport' | 'import';
    modules?: string[];
    sourcePath: string;
  }> = [];

  traverse(ast, {
    // 获取导入内容 import * from 'xxx'
    ImportDeclaration(path) {
      const modules: string[] = [];

      result.push({
        type: 'import',
        modules,
        sourcePath: utils.transformAliasPath(path.node.source.value, alias),
      });
    },
    // 获取动态导入内容 import('xxx')
    CallExpression(path) {
      if (path.node.callee.type === 'Import') {
        const node = path.node.arguments[0];

        if (t.isStringLiteral(node)) {
          result.push({
            type: 'dynamicImport',
            sourcePath: utils.transformAliasPath(node.value, alias),
          });
        }
      }
    },
    // 获取export * from ’xxx‘的内容
    ExportNamedDeclaration(path) {
      if (path.node.source?.value) {
        const modules: string[] = [];

        result.push({
          type: 'import',
          modules,
          sourcePath: utils.transformAliasPath(path.node.source.value, alias),
        });
      }
    },
  });

  return result;
}

export default translatorImports;
