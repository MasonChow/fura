import { parseAsync } from '../astCreator';
import { AST, TranslatorSource, TranslatorOptions } from '../typing';
import jsTranslator from './js';

export default class Translator {
  public ast: AST;

  private options?: TranslatorOptions;

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

  translateJS(): ReturnType<typeof jsTranslator> {
    return jsTranslator(this.ast, this.options);
  }
}
