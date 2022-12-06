/**
 * @module 文件夹分析模块
 * @description 主要分析指定文件夹的文件关联
 */

import cloneDeep from 'lodash/cloneDeep';
import keyBy from 'lodash/keyBy';
import { Translator, TranslatorType } from '../parser';
import { path } from '../helper/fileReader';
import diskCache from '../helper/diskCache';
import * as utils from '../helper/utils';
import { DatabaseTable, Database } from '../helper/database';

type Options = {
  exclude?: string[];
  // 项目唯一标识符，默认local
  project?: string;
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

  // 储存
  private DB: Database;

  public unUsedFiles: Set<string> = new Set();

  public result: ReturnType<typeof this.analysis> = Object.create(null);

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
    // 初始化DB
    this.DB = new Database(
      diskCache.createFilePath(`${options?.project || 'local'}.db`),
      true,
    );

    this.dir = utils.getDirFiles(this.targetDir, this.options?.exclude);

    console.timeEnd('实例化完成');
  }

  // 写入基本信息
  public async insertBaseData() {
    // 目标文件map
    const dir = utils.getDirFiles(this.targetDir, this.options?.exclude);

    const tableDirs: Array<Partial<DatabaseTable['dir']>> = [];
    const tableFiles: Array<Partial<DatabaseTable['file']>> = [];
    const dirFileRelations: Record<string, string[]> = Object.create(null);

    // 循环处理
    function loopNode(node: utils.UtilTypes.DirFilesTree) {
      if (node.type === 'dir') {
        const dirInfo = dir.dirMap.get(node.id);

        if (dirInfo) {
          const { dirName, path: dirPath, files, depth } = dirInfo;

          tableDirs.push({
            name: dirName,
            path: dirPath,
            depth,
          });

          dirFileRelations[dirPath] = files;
        }

        node.children?.forEach(loopNode);
      }

      if (node.type === 'file') {
        const {
          path: filePath,
          fileName,
          fileSize,
        } = dir.filesMap.get(node.id)!;
        tableFiles.push({
          name: fileName,
          path: filePath,
          size: fileSize,
          type: utils.getFileType(node.id),
        });
      }
    }

    loopNode(dir.dirTree);

    await Promise.all([
      this.DB.inserts('dir', tableDirs),
      this.DB.inserts('file', tableFiles),
    ]);

    const [dirs, files] = await Promise.all([
      this.DB.query('dir', ['*']),
      this.DB.query('file', ['*']),
    ]);

    const dirMap = keyBy(dirs, 'path');
    const fileMap = keyBy(files, 'path');

    await Promise.all(
      Object.keys(dirFileRelations).map((dirPath) => {
        const dirFiles = dirFileRelations[dirPath];
        const relations: Array<Partial<DatabaseTable['dir_file_relation']>> =
          [];

        dirFiles.forEach((filePath) => {
          relations.push({
            dir_id: dirMap[dirPath]?.id || 0,
            file_id: fileMap[filePath]?.id || 0,
          });
        });

        return this.DB.inserts('dir_file_relation', relations);
      }),
    );
  }

  // 分析
  public async analysis() {
    console.time('分析内容');
    console.time('分析内容完成');
    // 目标文件map
    await this.insertBaseData();
    // 初始化分析
    this.dir.files.forEach((key) => {
      // 解析JS
      if (utils.isJsTypeFile(key)) {
        const file = this.dir.filesMap.get(key)!;
        this.analysisFile(file);
      }
    });

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

    const result = {
      dirTree,
      fileDetail: fileInfo,
      dirDetail: Object.fromEntries(dirMap),
    };

    return result;
  }

  /**
   * @function 自动补全index文件
   * @author Mason
   * @private
   * @param filePath
   *
   * xxx/App -> xxx/App.(ts|js|tsx|jsx)
   * xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
   */
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
  private analysisFile(file: FileType) {
    const filePath = file.path;

    const translator = new Translator({ filePath }, this.options);
    const { imports, comments } = translator.translateJS();

    this.setFileRelations(file, imports);
    this.setFileDescription(file, comments);
  }

  private analysisUnusedFiles() {
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

    this.unUsedFiles = unUsedFiles;

    return unUsedFiles;
  }
}

export type AnalysisJSResultType = AnalysisJS['result'];

export default AnalysisJS;
