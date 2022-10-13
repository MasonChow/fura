import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { AST, TranslatorOptions } from '../typing';

export function translatorImports(ast: AST, option?: TranslatorOptions) {
  const aliasMap = new Map<RegExp, string>();

  if (option?.alias) {
    Object.entries(option.alias).forEach(([key, value]) => {
      const reg = new RegExp(`^${key}\/+`);
      aliasMap.set(reg, value);
    });
  }

  const aliasRegArr = [...aliasMap.keys()];

  function replaceAlias(sourcePath: string) {
    for (let i = 0; i < aliasRegArr.length; i++) {
      const reg = aliasRegArr[i];

      if (reg.test(sourcePath) && aliasMap.get(reg) !== undefined) {
        return sourcePath.replace(reg, aliasMap.get(reg)!);
      }
    }

    return sourcePath;
  }

  const result: Array<{
    // 动态引入 | 普通引入
    type: 'dynamicImport' | 'import';
    modules?: string[];
    sourcePath: string;
  }> = [];

  traverse(ast, {
    // 获取导入内容
    ImportDeclaration(path) {
      const modules: string[] = [];

      result.push({
        type: 'import',
        modules,
        sourcePath: replaceAlias(path.node.source.value),
      });
    },
    // 获取动态导入内容
    CallExpression(path) {
      if (path.node.callee.type === 'Import') {
        const node = path.node.arguments[0];

        if (t.isStringLiteral(node)) {
          result.push({
            type: 'dynamicImport',
            sourcePath: replaceAlias(node.value),
          });
        }
      }
    },
  });

  return result;
}

export default translatorImports;
