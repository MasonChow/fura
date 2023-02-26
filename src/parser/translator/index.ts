/**
 * @description test
 */

import { parseAsync, TranslatorSource } from '../../helper/ast_creator';
import { AST } from '../../typings/babel';
import jsTranslator, { TranslatorOptions, TranslateResult } from './js';

export default class Translator {
  public readonly ast: AST;

  public readonly options?: TranslatorOptions;

  constructor(
    source: TranslatorSource & { ast?: AST },
    options?: TranslatorOptions,
  ) {
    const { ast, filePath, content } = source;

    this.options = options;

    if (ast) {
      this.ast = ast;
    } else if (filePath || content) {
      this.ast = parseAsync({ filePath, content });
    } else {
      throw new Error('必须传入ast,filePath,content的其中一种');
    }
  }

  translateJS(): TranslateResult {
    if (!this.ast) {
      throw new Error('解析失败');
    }

    return jsTranslator(this.ast, this.options);
  }
}

export interface TranslatorType extends Translator {}
