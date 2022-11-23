import path from 'path';
import { types as TranslatorTypes, Translator } from '@fura/parser';
import cloneDeep from 'lodash/cloneDeep';
import * as Types from '../typing';
import * as utils from '../utils';

interface Options extends TranslatorTypes.TranslatorOptions {
  exclude?: string[];
}

class AnalysisJS {
  // 解析结果
  private analysisFileReferenceMap: Map<
    string,
    {
      // 引用的
      imports: string[];
      // 使用方
      users: string[];
    }
  > = new Map();

  // 读取的文件夹的内容
  private dir: ReturnType<typeof utils.getDirFiles>;

  // 配置项
  private options?: Options;

  // 执行的文件目录
  private targetDir: string;

  // 实例化
  constructor(targetDir: string, options?: Options) {
    console.info('开始实例化');
    console.info('目标目录:', targetDir);
    console.time('实例化完成');

    // 提前处理一波alias配置
    if (options?.alias) {
      options.alias = Object.entries(options.alias).reduce(
        (pre, [key, value]) => {
          pre[key] = path.join(targetDir, value);
          return pre;
        },
        {} as Required<Options>['alias'],
      );
    }

    // 写入目标文件
    this.targetDir = targetDir;
    // 写入配置
    this.options = options;
    // 目标文件map
    this.dir = utils.getDirFiles(targetDir, options?.exclude);
    // 初始化分析
    this.init();
    console.timeEnd('实例化完成');
  }

  private init() {
    this.dir.files.forEach((key) => {
      // 解析JS
      if (utils.isJsTypeFile(key)) {
        const file = this.dir.filesMap.get(key)!;
        this.analysisFile(file);
      }
    });
  }

  public analysis() {
    console.time('分析内容');
    console.time('分析内容完成');

    const unusedFiles = this.analysisUnusedFiles();
    const { dirTree, filesMap, dirMap, files } = this.dir;
    const fileReferenceMap = this.analysisFileReferenceMap;

    const fileInfo = files.reduce(
      (pre, file) => {
        const info = filesMap.get(file)!;
        const reference = fileReferenceMap.get(file)!;
        const isUnused = unusedFiles.has(file);

        pre[file] = {
          ...info,
          reference,
          isUnused,
        };

        return pre;
      },
      Object.create(null) as Record<
        string,
        {
          reference: Types.GetMapValue<typeof fileReferenceMap>;
          isUnused: boolean;
        } & Types.DirFilesType
      >,
    );

    console.timeEnd('分析内容完成');
    return {
      dirTree,
      fileDetail: fileInfo,
      dirDetail: Object.fromEntries(dirMap),
    };
  }

  // 自动补全index文件
  // xxx/App -> xxx/App.(ts|js|tsx|jsx)
  // xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
  private getDirIndexFile(filePath: string) {
    let realFilePath = filePath;

    if (!utils.isJsTypeFile(filePath) || !this.isDirFile(filePath)) {
      const tryMatchFiles = utils.createDirIndexFilePaths(filePath);

      for (let i = 0; i < tryMatchFiles.length; i++) {
        const dirRootFile = tryMatchFiles[i];

        if (this.isDirFile(dirRootFile)) {
          realFilePath = dirRootFile;
          break;
        }
      }
    }

    return realFilePath;
  }

  private isDirFile(filePath: string) {
    return this.dir.filesMap.has(filePath);
  }

  // 插入数据
  private insert(params: {
    targetPath: string;
    type: 'imports' | 'users';
    insertValue: string;
  }) {
    const { targetPath, type, insertValue } = params;

    // 没查到则初始化
    if (!this.analysisFileReferenceMap.has(targetPath)) {
      this.analysisFileReferenceMap.set(targetPath, {
        imports: [],
        users: [],
      });
    }

    this.analysisFileReferenceMap.get(targetPath)![type].push(insertValue);
  }

  // 分析数据
  public analysisFile(file: Types.DirFilesType) {
    const filePath = file.path;

    const translator = new Translator({ filePath }, this.options);
    const { imports, comments } = translator.translateJS();
    imports.forEach((e) => {
      let { sourcePath } = e;
      // 这证明不是npm包，特殊处理一下
      // 现在暴力处理这个就够了
      // 后续考虑基于package.json识别是否npm包
      if (
        sourcePath.startsWith('./') ||
        sourcePath.startsWith('../') ||
        sourcePath === '.' ||
        sourcePath === '..'
      ) {
        const parent = file.parentPath || '';
        sourcePath = path.join(parent, sourcePath);
      }

      // 如果是非NPM的包，则需要检查处理一下是否存在默认index的方式引用
      if (sourcePath.startsWith(this.targetDir)) {
        // 这种场景证明没找到import的是index下的文件，需要自动补全查找一次
        sourcePath = this.getDirIndexFile(sourcePath);
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

    console.log(comments);
  }

  public analysisUnusedFiles() {
    console.info('分析未使用文件');
    console.time('分析未使用文件完成');

    const rootFile = this.getDirIndexFile(this.targetDir);
    const unUsedFiles = new Set<string>();
    const fileMap = cloneDeep(
      Object.fromEntries(this.analysisFileReferenceMap),
    );

    let hasUnUsedFile = true;

    while (hasUnUsedFile) {
      hasUnUsedFile = false;
      const files = Object.keys(fileMap);

      files.forEach((file) => {
        const item = fileMap[file];
        const isRootFile = file === rootFile;

        // 仅分析项目内部的
        if (isRootFile || !this.isDirFile(file)) {
          return;
        }

        const users = item.users.filter((i) => !unUsedFiles.has(i)) || [];

        if (!users.length) {
          unUsedFiles.add(file);
          delete fileMap[file];
          hasUnUsedFile = true;
        }
      });
    }
    console.timeEnd('分析未使用文件完成');
    return unUsedFiles;
  }
}

export default AnalysisJS;
