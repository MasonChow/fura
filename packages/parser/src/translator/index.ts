import { parseAsync } from '../astCreator';
import { AST, TranslatorSource, TranslatorOptions } from '../typing';
import jsTranslator from './js';
import fs from 'fs';
export default class Translator {
  private ast: AST;

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

  translateJS() {
    return jsTranslator(this.ast, this.options);
  }
}

const res = new Translator({
  filePath:
    '/Users/zhoushunming/Documents/sc/shopline-post-center/src/pages/SaleCreation/Products/components/ReProductPicker/index.ts',
}).translateJS();

fs.writeFileSync('./debug/test.json', JSON.stringify(res));
// console.log(res.translateJS());