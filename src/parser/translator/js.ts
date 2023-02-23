// TODO import modules 解析

/**
 * @name TS/JS文件解析器
 * @group module
 * @description 基于@babel/traverse进行ast解析
 */

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { AST } from '../../typings/babel';
import * as utils from '../../helper/utils';
import { GetArrayUnionType } from '../../typings/utils';

const COMMON_REG = /\* @(.*)/;

const COMMENT_GROUP_TYPE = ['unknown', 'page', 'component', 'module'] as const;

const BASE_COMMENT_PROPS = {
  name: '',
  group: COMMENT_GROUP_TYPE[0],
  description: '',
} as const;

type CommonGroupType = GetArrayUnionType<typeof COMMENT_GROUP_TYPE>;

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

export type CommentType = {
  -readonly [key in keyof typeof BASE_COMMENT_PROPS]: key extends 'group'
    ? CommonGroupType
    : string;
};

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
  commentProps: CommentType;
}

const baseCommentProps: CommentType = {
  name: '',
  group: 'unknown',
  description: '',
};

const commentPropsKeys = Object.keys(baseCommentProps);

function isValidCommentPropsKey(key: string): key is keyof CommentType {
  return commentPropsKeys.includes(key);
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

  const comment = (ast.comments || []).find((c) => c.type === 'CommentBlock');
  const commentProps: CommentType = {
    ...BASE_COMMENT_PROPS,
  };

  if (comment) {
    comment.value.split('\n').forEach((v) => {
      const matchStr = v.match(COMMON_REG)?.[1];

      if (matchStr) {
        const [key, ...value] = matchStr.split(/\s/);
        const content = value.join('').trim();

        if (isValidCommentPropsKey(key)) {
          // 临时隐藏
          // @ts-ignore
          commentProps[key] = content;
        }
      }
    });
  }

  return {
    imports: result,
    commentProps,
  };
}

export type TranslateResult = ReturnType<typeof translator>;

export default translator;
