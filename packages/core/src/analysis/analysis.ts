/**
 * @module 文件夹分析模块
 * @description 主要分析指定文件夹的文件关联
 */

import lodash from 'lodash';
// import cloneDeep from 'lodash/cloneDeep';
import { Translator, TranslatorType } from '../parser';
import { path } from '../helper/fileReader';
import diskCache from '../helper/diskCache';
import * as utils from '../helper/utils';
import { DatabaseTable, Database } from '../helper/database';

type Options = {
  exclude?: string[];
  // 项目唯一标识符，默认data
  project?: string;
} & TranslatorType['options'];

interface DataCacheType {
  file: Record<string, { id: number; parentPath: string }>;
  dir: Record<string, { id: number; parentPath: string }>;
  npmPkg: Record<string, { id: number }>;
}

// interface AnalysisFileInfo {
//   // 引用的
//   imports: string[];
//   // 使用方
//   users: string[];
//   // 描述信息
//   description: {
//     type: 'page' | 'module';
//     name: string;
//     props: Record<string, string>;
//     functions: Array<{ name: string; props: Record<string, string> }>;
//   };
// }

class AnalysisJS {
  // 配置项
  private options?: Options;

  // 执行的文件目录
  private targetDir: string;

  // 储存
  private DB!: Database;

  // DB里面储存的文件map
  private dataCache: DataCacheType | undefined = undefined;

  // 实例化
  constructor(targetDir: string, options?: Options) {
    console.info('开始实例化');
    console.info('目标目录:', targetDir);
    console.time('实例化完成');

    // 提前处理一波alias配置
    if (options?.alias) {
      // eslint-disable-next-line no-param-reassign
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
    this.initDB(options?.project);

    console.timeEnd('实例化完成');
  }

  private initDB(project = this.options?.project || 'data') {
    this.DB = new Database(diskCache.createFilePath(`${project}.db`), true);
  }

  get db() {
    return this.DB;
  }

  // 把文件基本信息写入数据库
  public async initBaseDataIntoDB() {
    // 如果有缓存则清除
    if (this.dataCache) {
      this.initDB();
      this.dataCache = undefined;
    }
    // 目标文件map
    const dir = utils.getDirFiles(this.targetDir, [
      'node_modules',
      ...(this.options?.exclude || []),
    ]);

    const pkg = utils.getProjectNPMPackages(this.targetDir || '.');

    const tableDirs: Array<Partial<DatabaseTable['dir']>> = [];
    const tableFiles: Array<Partial<DatabaseTable['file']>> = [];
    const tableNpmPkgs: Array<Partial<DatabaseTable['npm_pkg']>> =
      Object.entries(Object.fromEntries(pkg)).map(([, value]) => value);
    const dirFileRelations: Record<string, string[]> = Object.create(null);

    // 循环处理
    function loopNode(node: utils.UtilTypes.DirFilesTree) {
      if (node.type === 'dir') {
        const dirInfo = dir.dirMap.get(node.id);

        if (dirInfo) {
          const { dirName, path: dirPath, files, depth, parentPath } = dirInfo;

          tableDirs.push({
            name: dirName,
            path: dirPath,
            parent_path: parentPath,
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
          parentPath,
        } = dir.filesMap.get(node.id)!;
        tableFiles.push({
          name: fileName,
          path: filePath,
          parent_path: parentPath,
          size: fileSize,
          type: utils.getFileType(node.id),
        });
      }
    }

    loopNode(dir.dirTree);

    console.time('写入基础数据');
    await Promise.all([
      this.DB.inserts('dir', tableDirs),
      this.DB.inserts('file', tableFiles),
      this.DB.inserts('npm_pkg', tableNpmPkgs),
    ]);
    console.timeEnd('写入基础数据');

    console.time('查询基础数据');
    const [dirs, files, npmPkgs] = await Promise.all([
      this.DB.query('dir', ['id', 'path', 'parent_path']),
      this.DB.query('file', ['id', 'path', 'parent_path']),
      this.DB.query('npm_pkg', ['id', 'name']),
    ]);
    console.timeEnd('查询基础数据');

    console.time('插入文件夹与文件关系数据');
    const dirMap = dirs.reduce((pre, cur) => {
      // eslint-disable-next-line no-param-reassign
      pre[cur.path] = { id: cur.id, parentPath: cur.parent_path };
      return pre;
    }, {} as DataCacheType['dir']);

    const fileMap = files.reduce((pre, cur) => {
      // eslint-disable-next-line no-param-reassign
      pre[cur.path] = { id: cur.id, parentPath: cur.parent_path };
      return pre;
    }, {} as DataCacheType['file']);

    const npmPkgMap = npmPkgs.reduce((pre, cur) => {
      // eslint-disable-next-line no-param-reassign
      pre[cur.name] = { id: cur.id };
      return pre;
    }, {} as DataCacheType['npmPkg']);

    this.dataCache = {
      file: fileMap,
      dir: dirMap,
      npmPkg: npmPkgMap,
    };

    await Promise.all(
      Object.keys(dirFileRelations).map((dirPath) => {
        const dirFiles = dirFileRelations[dirPath];
        const relations: Array<Partial<DatabaseTable['dir_file_relation']>> =
          [];

        dirFiles.forEach((filePath) => {
          relations.push({
            dir_id: dirMap[dirPath].id || 0,
            file_id: fileMap[filePath].id || 0,
          });
        });

        return this.DB.inserts('dir_file_relation', relations);
      }),
    );
    console.timeEnd('插入文件夹与文件关系数据');

    return this.dataCache;
  }

  private getNpmPackageId(itemPath: string) {
    const { dataCache } = this;

    if (!dataCache) {
      throw new Error('请先调用analysis进行基础数据录入');
    }

    const { npmPkg } = dataCache;

    let id = 0;
    const splitPath = itemPath.split('/');
    let testPath = splitPath[0];

    for (let index = 1; index <= splitPath.length; index++) {
      if (npmPkg[testPath]) {
        id = npmPkg[testPath].id;
        break;
      }
      testPath = [testPath, splitPath[index]].join('/');
    }

    if (id) {
      return {
        id,
        type: 'npm',
      } as const;
    }

    return null;
  }

  private getCacheDataByPath(itemPath: string) {
    const { dataCache } = this;

    if (!dataCache) {
      throw new Error('请先调用analysis进行基础数据录入');
    }

    if (dataCache.file[itemPath]) {
      return {
        id: dataCache.file[itemPath].id,
        parentPath: dataCache.file[itemPath].parentPath,
        type: 'file',
      } as const;
    }

    if (dataCache.dir[itemPath]) {
      return {
        id: dataCache.dir[itemPath].id,
        parentPath: dataCache.dir[itemPath].parentPath,
        type: 'dir',
      } as const;
    }

    const npmPackage = this.getNpmPackageId(itemPath);

    if (npmPackage) {
      return npmPackage;
    }

    return {
      id: 0,
      type: 'unknown',
      remark: itemPath,
    } as const;

    // throw new Error(`查不到路径对应的id => ${itemPath}`);
  }

  // 分析
  public async analysis() {
    console.time('分析内容完成');
    // 目标文件map
    const { file } = await this.initBaseDataIntoDB();

    await Promise.all(
      Object.keys(file).map((filePath: string) => {
        // 解析JS
        if (utils.isJsTypeFile(filePath)) {
          // const file = this.dir.filesMap.get(key)!;
          return this.analysisFile(filePath);
        }

        return null;
      }),
    );
    console.timeEnd('分析内容完成');
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
    return Boolean(this.dataCache?.file[filePath]);
  }

  /**
   * @function 设置文件之间的依赖数据
   * @author Mason
   * @private
   */
  private async setFileRelations(
    filePath: string,
    relations: ReturnType<TranslatorType['translateJS']>['imports'] = [],
  ) {
    const dataInfo = this.getCacheDataByPath(filePath);

    if (dataInfo.type !== 'file') {
      return;
    }

    const { id: fileId, parentPath } = dataInfo;

    const fileReferences: Array<Partial<DatabaseTable['file_reference']>> = [];
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
        const parent = parentPath;
        sourcePath = path.join(parent, sourcePath);
      }

      // 如果是非NPM的包，则需要检查处理一下是否存在默认index的方式引用
      if (sourcePath.startsWith(this.targetDir)) {
        // 这种场景证明没找到import的是index下的文件，需要自动补全查找一次
        sourcePath = this.getDirIndexFile(sourcePath);
      }

      const refInfo = this.getCacheDataByPath(sourcePath);
      // const fileId = this.getCacheDataByPath(filePath).id;

      const isFilePkg = refInfo.type === 'file';

      fileReferences.push({
        file_id: fileId,
        ref_id: refInfo.id,
        type: refInfo.type === 'dir' ? 'unknown' : refInfo.type,
        remark: (refInfo.type === 'unknown' && refInfo.remark) || undefined,
      });

      if (isFilePkg) {
        fileReferences.push({
          file_id: refInfo.id,
          ref_id: fileId,
          type: 'file',
        });
      }
    });

    await this.DB.inserts('file_reference', fileReferences);
  }

  /**
   * @function 设置文件的描述信息
   * @author Mason
   * @private
   */
  private async setFileDescription(
    filePath: string,
    comments: ReturnType<TranslatorType['translateJS']>['comments'] = [],
  ) {
    const { id: fileId } = this.getCacheDataByPath(filePath);
    // 文件基础属性锁，只允许设置一次
    let lockFileBaseProps = false;

    const attrs: Array<Partial<DatabaseTable['file_attr']>> = [];

    function appendAttrs(
      key: string,
      value: string,
      parentKey?: 'props' | 'functions',
    ) {
      attrs.push({ key, value, parent_key: parentKey, file_id: fileId });
    }

    comments.forEach((comment) => {
      if (comment.type === 'block') {
        const commentProps = comment.props;

        if ((commentProps.page || commentProps.module) && !lockFileBaseProps) {
          const { page, module, ...others } = commentProps;
          appendAttrs('type', page ? 'page' : 'module');
          appendAttrs('name', page || module);
          Object.keys(others).forEach((key) => {
            appendAttrs(key, others[key], 'props');
          });
          lockFileBaseProps = true;
          return;
        }

        if (commentProps.function) {
          Object.keys(commentProps).forEach((key) => {
            let attrKey = key;

            if (key === 'function') {
              attrKey = 'name';
            }

            appendAttrs(attrKey, commentProps[key], 'functions');
          });
        }
      }
    });

    await this.DB.inserts('file_attr', attrs);
  }

  // 分析数据
  private async analysisFile(filePath: string) {
    const translator = new Translator({ filePath }, this.options);
    const { imports, comments } = translator.translateJS();

    await this.setFileRelations(filePath, imports);
    await this.setFileDescription(filePath, comments);
  }

  public async getProjectTree() {
    const dirFiles = await this.getDirFiles();
    const dirMap = new Map<number, { id: number; children: number[] }>();

    const orderDir = lodash.orderBy(dirFiles, ['dir_depth'], 'desc');

    orderDir.forEach((item) => {
      const { dir_id: dirId, file_id: fileId } = item;
      let dir = dirMap.get(dirId);

      if (!dir) {
        dir = {
          id: dirId,
          children: [],
        };
      }

      dir.children.push(fileId);
    });
  }

  /**
   * @function 获取文件夹与文件内容
   */
  public async getDirFiles() {
    const res = await this.db.useSql<{
      dir_id: number;
      dir_name: string;
      dir_path: string;
      dir_depth: number;
      file_name: string;
      file_id: number;
      file_size: number;
      file_path: string;
      file_type: string;
    }>(`
      SELECT
        d.id AS dir_id,
        d.name AS dir_name,
        d.path as dir_path,
        d.depth as dir_depth,
        f.name AS file_name,
        f.id AS file_id,
        f.size AS file_size,
        f.path AS file_path,
        f.type AS file_type
      FROM
        dir_file_relation dfr
        JOIN dir d ON d.id = dfr.dir_id
        JOIN file f ON f.id = dfr.file_id;
    `);

    return res;
  }
}

export default AnalysisJS;
