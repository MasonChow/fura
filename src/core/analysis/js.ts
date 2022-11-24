import path from 'path';
import cloneDeep from 'lodash/cloneDeep';
import { Translator, TranslatorType } from '../../parser';
import * as utils from '../../helper/utils';

type Options = {
  exclude?: string[];
} & TranslatorType['options'];

interface AnalysisFileInfo {
  // 引用的
  imports: string[];
  // 使用方
  users: string[];
  // 描述信息
  description: {
    type: 'page' | 'module';
    name: string;
    props: Record<string, string>;
    functions: Array<{ name: string; props: Record<string, string> }>;
  };
}

type FileType = utils.UtilTypes.DirFilesType;

class AnalysisJS {
  // 解析结果
  private analysisFileReferenceMap: Map<string, Partial<AnalysisFileInfo>> =
    new Map();

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
          reference: utils.UtilTypes.GetMapValue<typeof fileReferenceMap>;
          isUnused: boolean;
        } & utils.UtilTypes.DirFilesType
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

  private getAnalysisFile(filePath: string) {
    const target: Partial<AnalysisFileInfo> =
      this.analysisFileReferenceMap.get(filePath) || Object.create(null);

    return target;
  }

  private setAnalysisFile(filePath: string, data: Partial<AnalysisFileInfo>) {
    const target = this.getAnalysisFile(filePath);

    this.analysisFileReferenceMap.set(filePath, {
      ...target,
      ...data,
    });
  }

  // 插入关系链数据
  private insertRelationVal(params: {
    targetPath: string;
    type: keyof Pick<AnalysisFileInfo, 'imports' | 'users'>;
    insertValue: string;
  }) {
    const { targetPath, type, insertValue } = params;
    const target = this.getAnalysisFile(targetPath);
    const prevData = target[type] || [];

    prevData.push(insertValue);

    this.setAnalysisFile(targetPath, {
      [type]: prevData,
    });
  }

  /**
   * @function 设置文件之间的依赖数据
   * @author Mason
   * @private
   */
  private setFileRelations(
    file: FileType,
    relations: ReturnType<TranslatorType['translateJS']>['imports'] = [],
  ) {
    const filePath = file.path;
    // 记录使用的数据
    relations.forEach((e) => {
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
      this.insertRelationVal({
        targetPath: filePath,
        type: 'imports',
        insertValue: sourcePath,
      });

      // 写入被使用的
      this.insertRelationVal({
        targetPath: sourcePath,
        type: 'users',
        insertValue: filePath,
      });
    });
  }

  /**
   * @function 设置文件的描述信息
   * @author Mason
   * @private
   */
  private setFileDescription(
    file: FileType,
    comments: ReturnType<TranslatorType['translateJS']>['comments'] = [],
  ) {
    const filePath = file.path;
    const functions: AnalysisFileInfo['description']['functions'] = [];
    let props: AnalysisFileInfo['description']['props'] = Object.create(null);
    let name = '';
    let type: AnalysisFileInfo['description']['type'] = 'module';

    comments.forEach((comment) => {
      if (comment.type === 'block') {
        const commentProps = comment.props;

        if (commentProps.page && !name) {
          const { page, ...others } = commentProps;
          type = 'page';
          name = page;
          props = others;
          return;
        }

        if (type !== 'page' && commentProps.module && !name) {
          const { module, ...others } = commentProps;
          name = module;
          props = others;
          return;
        }

        if (commentProps.function) {
          const { function: functionName, ...othersProps } = commentProps;

          functions.push({
            name: functionName,
            props: othersProps,
          });
        }
      }
    });

    if (name) {
      this.setAnalysisFile(filePath, {
        description: {
          type,
          name,
          props,
          functions,
        },
      });
    }
  }

  // 分析数据
  public analysisFile(file: FileType) {
    const filePath = file.path;

    const translator = new Translator({ filePath }, this.options);
    const { imports, comments } = translator.translateJS();

    this.setFileRelations(file, imports);
    this.setFileDescription(file, comments);
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

        const users = item.users?.filter((i) => !unUsedFiles.has(i)) || [];

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
