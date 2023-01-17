// TODO import modules 解析

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { AST } from '../../typings/babel';
import * as utils from '../../helper/utils';

const COMMON_REG = /\* @(.*)/;

export interface TranslatorOptions {
  // 路径别名 例如 {'@/*': 'src/*'}
  alias?: Record<string, string>;
}

export interface ImportType {
  /** 类型，dynamicImport(import(x).then) | import(import x from x)  */
  type: 'dynamicImport' | 'import';
  /** 引入的模块 */
  modules?: string[] | undefined;
  /** 引入的路径 */
  sourcePath: string;
}

export interface CommentBlockType {
  /** 块状注释类型 */
  type: 'block';
  /** 解析内容 */
  content: string;
  /** 属性值 @xxx 222 => {xxx: 222} */
  props: Record<string, string>;
}

export interface CommentLineType {
  /** 行内内注释类型 例如 // */
  type: 'line';
  /** 解析内容 */
  content: string;
}

export interface TranslatorReturnType {
  /** 文件导入内容 */
  imports: Array<ImportType>;
  /** 文件评论 */
  comments: Array<CommentBlockType | CommentLineType>;
}

export function translator(
  ast: AST,
  option: TranslatorOptions = {},
): TranslatorReturnType {
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

  const comments = (ast.comments || []).map((comment) => {
    // const base = {
    //   startLine: comment.start,
    //   endLine: comment.end,
    // };

    if (comment.type === 'CommentBlock') {
      const props = comment.value.split('\n').reduce((pre, cur) => {
        const matchStr = cur.match(COMMON_REG)?.[1];

        if (matchStr) {
          const [key, ...value] = matchStr.split(/\s/);

          pre[key] = value.join('');
        }

        return pre;
      }, {} as Record<string, string>);

      return {
        type: 'block',
        content: comment.value.trim(),
        props,
      } as const;
    }

    return {
      type: 'line',
      content: comment.value.trim(),
    } as const;
  });

  return {
    imports: result,
    comments,
  };
}

export type TranslateResult = ReturnType<typeof translator>;

export default translator;
