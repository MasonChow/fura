import path from 'path';
import { types as TranslatorTypes, Translator } from '@fura/parser';
import * as Types from '../typing';

class AnalysisJS {
  private resultMap: Map<
    string,
    {
      // 引用的
      imports: string[];
      // 使用方
      users: string[];
    }
  > = new Map();

  constructor() {}

  get analysisResultMap() {
    return this.resultMap;
  }

  get analysisResultData() {
    return Object.fromEntries(this.resultMap);
  }

  // 插入数据
  private insert(params: {
    targetPath: string;
    type: 'imports' | 'users';
    insertValue: string;
  }) {
    const { targetPath, type, insertValue } = params;

    // 没查到则初始化
    if (!this.resultMap.has(targetPath)) {
      this.resultMap.set(targetPath, {
        imports: [],
        users: [],
      });
    }

    this.resultMap.get(targetPath)![type].push(insertValue);
  }

  // 分析数据
  public analysis(
    file: Types.DirFilesType,
    options?: TranslatorTypes.TranslatorOptions,
  ) {
    const filePath = file.path;
    const translator = new Translator({ filePath }, options);
    translator.translateJS().forEach((e) => {
      let { sourcePath } = e;
      // 这证明不是npm包，特殊处理一下
      // 现在暴力处理这个就够了
      // 后续考虑基于package.json识别是否npm包
      if (sourcePath.startsWith('./') || sourcePath.startsWith('../')) {
        const parent = file.parentPath || '';
        sourcePath = path.join(parent, sourcePath);
      }

      // 写入使用的
      this.insert({
        targetPath: filePath,
        type: 'imports',
        insertValue: sourcePath,
      });

      // 写入被使用的
      this.insert({
        targetPath: sourcePath,
        type: 'users',
        insertValue: filePath,
      });
    });
  }
}

export default AnalysisJS;
