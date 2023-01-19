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
  /** 需要排除的文件目录 */
  exclude?: string[];
  /** 项目唯一标识符，默认data */
  project?: string;
} & TranslatorType['options'];

interface DataCacheType {
  file: Record<string, { id: number; parentPath: string }>;
  dir: Record<string, { id: number; parentPath: string }>;
  npmPkg: Record<string, { id: number }>;
}

export interface ProjectTreeNode {
  id: number;
  type: 'dir' | 'file';
  name: string;
  children?: Array<ProjectTreeNode & { type?: 'dir' | 'file' }>;
}

export interface FileAttr {
  type: 'page' | 'module';
  name: string;
  description: string;
  functions: Array<{ name: string; description: string }>;
}

class AnalysisJS {
  /** 配置项 */
  private options?: Options;

  /** 执行的文件目录 */
  private targetDir: string;

  /** 数据库实例 */
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

  public getCacheDataByPath(itemPath: string) {
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
      fileReferences.push({
        file_id: fileId,
        ref_id: refInfo.id,
        type: refInfo.type === 'dir' ? 'unknown' : refInfo.type,
        remark: (refInfo.type === 'unknown' && refInfo.remark) || undefined,
      });
    });

    await this.DB.inserts('file_reference', fileReferences);
  }

  /**
   * @function 设置文件的描述信息
   * @author Mason
   * @private
   */
  private async setFileAttrs(
    filePath: string,
    comments: ReturnType<TranslatorType['translateJS']>['comments'] = [],
  ) {
    const { id: fileId } = this.getCacheDataByPath(filePath);
    // 文件基础属性锁，只允许设置一次
    let lockFileBaseProps = false;

    const attrs: Array<Partial<DatabaseTable['file_attr']>> = [];

    function appendAttrs(
      params: Pick<(typeof attrs)[0], 'type' | 'name' | 'description'>,
    ) {
      attrs.push({ ...params, file_id: fileId });
    }

    comments.forEach((comment) => {
      if (comment.type === 'block') {
        const commentProps = comment.props;

        if ((commentProps.page || commentProps.module) && !lockFileBaseProps) {
          const { page, module, ...others } = commentProps;
          const fileType = page ? 'page' : 'module';
          const fileName = page || module;

          appendAttrs({
            type: fileType,
            name: fileName,
            description: '',
          });

          Object.keys(others).forEach((key) => {
            if (key === 'function') {
              appendAttrs({
                type: 'function',
                name: others[key] || [fileName, 'function'].join('-'),
                description: '',
              });
            }
          });
          lockFileBaseProps = true;
          return;
        }

        if (commentProps.function) {
          appendAttrs({
            type: 'function',
            name: commentProps.function,
            description: '',
          });
        }
      }
    });

    await this.DB.inserts('file_attr', attrs);
  }

  /**
   * @function 分析文件
   * @param filePath 分析文件路径
   */
  private async analysisFile(filePath: string) {
    const translator = new Translator({ filePath }, this.options);
    const { imports, comments } = translator.translateJS();

    await Promise.all([
      this.setFileRelations(filePath, imports),
      this.setFileAttrs(filePath, comments),
    ]);
  }

  // 获取项目文件目录树
  public async getProjectTree() {
    const [dirs, files, dirFiles] = await Promise.all([
      this.getAllDir(),
      this.getAllFile(),
      this.getDirFiles(),
    ]);

    const dirChildMap = new Map<
      string,
      Array<{ type: 'dir' | 'file'; path: string; name: string }>
    >();
    const groupFiles = lodash.groupBy(dirFiles, 'dir_path');
    const fileMapByPath = lodash.keyBy(dirFiles, 'file_path');
    const dirMapByPath = lodash.keyBy(dirs, 'path');
    const fileMapById = lodash.keyBy(files, 'id');
    const dirMapById = lodash.keyBy(dirs, 'id');
    const sortDirByDepth = lodash.orderBy(dirs, 'depth', 'asc');
    const rootDirs: string[] = [];

    // 组合一波文件夹和文件的数据id
    sortDirByDepth.forEach((dir) => {
      const { parent_path: parentPath, name, path: curPath, depth } = dir;

      if (depth === 0) {
        rootDirs.push(curPath);
      }

      if (parentPath) {
        const parentDirChildren = dirChildMap.get(parentPath) || [];
        parentDirChildren.push({ type: 'dir', path: curPath, name });
        dirChildMap.set(parentPath, parentDirChildren);
      }

      dirChildMap.set(
        curPath,
        (groupFiles[curPath] || []).map((e) => ({
          type: 'file',
          path: e.file_path,
          name: e.file_name,
        })),
      );
    });

    /**
     * @function 遍历node节点
     */
    function loopTreeNode(dirPath: string): ProjectTreeNode {
      const children = dirChildMap.get(dirPath)!;
      const dirInfo = dirMapByPath[dirPath]!;

      return {
        id: dirInfo.id,
        type: 'dir',
        name: dirInfo.name,
        children: children?.map((e) => {
          if (e.type === 'file') {
            const fileInfo = fileMapByPath[e.path]!;
            return {
              id: fileInfo.file_id,
              type: 'file',
              name: fileInfo.file_name,
            };
          }

          return loopTreeNode(e.path);
        }),
      };
    }

    return {
      tree: rootDirs.map((id) => {
        return loopTreeNode(id);
      }),
      fileMap: fileMapById,
      dirMap: dirMapById,
    };
  }

  /**
   * @function 获取没被应用的依赖
   * @description 暂时支持ts/js文件引用分析已经npm包中dependencies无被引用分析
   */
  public async getUnusedDeps(params: {
    /** 分析文件夹相对与分析目标的路径路径，例如./src */
    entryDirPath: string;
    /** 分析文件夹的入口文件，例如./index.ts */
    rootFilePath: string;
  }) {
    const [
      // 文件依赖关系
      fileRefs,
      // 项目的js文件
      dirFiles,
      // 项目npm包
      npmPkgs,
    ] = await Promise.all([
      this.getFileReference(),
      this.getDirFiles(),
      this.getNpmPkgs(),
    ]);
    // 分析入口的目录，使用绝对路径 一般就是{project}/src
    const rootDirPath = path.join(this.targetDir, params.entryDirPath);
    // 分析入口的文件 使用绝对路径 一般就是{project}/src/index.ts
    const rootFilePath = path.join(rootDirPath, params.rootFilePath);
    // 过滤掉不需要分析的文件(目标文件策略: 文件路径以分析入口目录开头且js/ts类型的文件)
    const filterFiles = dirFiles.filter((dirFile) => {
      return (
        dirFile.file_path.startsWith(rootDirPath) &&
        ['js', 'ts'].includes(dirFile.file_type)
      );
    });
    // 以文件维度集合引用的内容
    const filesMap = lodash.keyBy(filterFiles, 'file_id');
    // 被使用的文件集合，默认全部文件
    const usedFiles = new Set<number>(filterFiles.map((item) => item.file_id));
    // 通过递归把子都没被引用的父级也收集起来
    function loop(refs: typeof fileRefs) {
      let hasUnUsedFiles = false;
      // 被引用的file集合
      const refsFileMap = lodash.groupBy(refs, 'ref_id');
      // 有效的关系数据
      let usableRefs: typeof refs = [];
      // 循环处理一次文件，添加未被引用的文件
      [...usedFiles].forEach((fileId) => {
        // 如果是入口文件则不处理
        if (filesMap[fileId]?.file_path === rootFilePath) {
          return;
        }

        // 不存在被引用则表明自身已经是没用了
        if (!refsFileMap[fileId]) {
          usedFiles.delete(fileId);
          hasUnUsedFiles = true;
        }
        // 有被引用则记录到被使用的数组里面
        else {
          refsFileMap[fileId].forEach((ref) => {
            usableRefs.push(ref);
          });
        }
      });

      // 循环完成处理后，二次过滤一遍已经无效的文件，如果在循环里面处理可能由于有处理顺序问题导致过滤失败
      usableRefs = usableRefs.filter((e) => usedFiles.has(e.file_id));

      if (hasUnUsedFiles) {
        loop(usableRefs);
      }
    }
    // 递归执行
    loop(fileRefs);
    // 获取未使用的文件信息
    const files = await this.getFilesByIds(
      Object.keys(filesMap)
        .filter((key) => !usedFiles.has(Number(key)))
        .map(Number),
    );
    // 已npmId归组使用关联的文件
    const npmRefsMap = lodash.groupBy(
      fileRefs.filter((refs) => refs.type === 'npm'),
      'ref_id',
    );
    // 未使用的npm包Ids
    const unUsedNpmPkgs = Object.entries(npmRefsMap).reduce(
      (prev, [key, refFiles]) => {
        const npmPkgId = Number(key);

        if (
          !refFiles.length ||
          !refFiles.some((refFile) => usedFiles.has(refFile.file_id))
        ) {
          prev.add(npmPkgId);
        }

        return prev;
      },
      new Set<number>(),
    );

    return {
      files,
      npmPkgs: npmPkgs.filter((npmPkg) => {
        return (
          (unUsedNpmPkgs.has(npmPkg.id) || !npmRefsMap[npmPkg.id]) &&
          npmPkg.type === 'dependencies'
        );
      }),
    };
  }

  /**
   * @function 从DB获取项目内所有文件夹
   */
  public async getAllDir() {
    const res = await this.db.query('dir', ['*']).orderBy('depth', 'asc');
    return res;
  }

  /**
   * @function 从DB获取项目内所有文件
   */
  public async getAllFile() {
    const res = await this.db.query('file', ['*']);
    return res;
  }

  /**
   * @function 批量获取文件的属性
   * @description 传入fileIds则按需获取，否则就全量获取
   */
  public async getFileAttrs(fileIds?: number[]) {
    let dataSource: Array<DatabaseTable['file_attr']> = [];

    if (fileIds) {
      dataSource = await this.db.table('file_attr').whereIn('file_id', fileIds);
    } else {
      dataSource = await this.db.table('file_attr');
    }

    // 以文件为维度，归组所有的属性数据
    const groupByFileId = lodash.groupBy(dataSource, 'file_id');
    const result: Record<string, FileAttr> = {};

    // 遍历处理属性数据，改成对象的形式
    Object.entries(groupByFileId).forEach(([fileId, attrs]) => {
      const res: FileAttr = {
        type: 'module',
        name: '',
        description: '',
        functions: [],
      };

      attrs.forEach((attr) => {
        const { type, name, description } = attr;
        if (type === 'function') {
          res.functions.push({ name, description });
        } else {
          res.type = type;
          res.description = description;
          res.name = name;
        }
      });

      result[fileId] = res;
    });

    return result;
  }

  /**
   * @function 获取项目文件
   * @description 传入fileIds则按需获取，否则就全量获取
   */
  public async getProjectFiles() {
    const [files, fileAttrs] = await Promise.all([
      this.getAllFile(),
      this.getFileAttrs(),
    ]);

    const fileWithAttr = files.map((file) => {
      const attr = fileAttrs[String(file.id)] || null;

      return {
        ...file,
        attr,
      };
    });

    return lodash.keyBy(fileWithAttr, 'id');
  }

  /**
   * @function 获取文件夹与文件内容
   */
  public async getDirFiles() {
    const res = await this.db.useSql<{
      dir_id: DatabaseTable['dir']['id'];
      dir_name: DatabaseTable['dir']['name'];
      dir_path: DatabaseTable['dir']['path'];
      dir_depth: DatabaseTable['dir']['depth'];
      file_name: DatabaseTable['file']['name'];
      file_id: DatabaseTable['file']['id'];
      file_size: DatabaseTable['file']['size'];
      file_path: DatabaseTable['file']['path'];
      file_type: DatabaseTable['file']['type'];
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

  /**
   * @function 根据ids获取项目内文件
   */
  public async getFilesByIds(fileIds: number[] = []) {
    const res = await this.db.table('file').whereIn('id', fileIds);
    return res;
  }

  /**
   * @function 获取所有文件依赖关系
   */
  public async getFileReference() {
    const res = await this.db.query('file_reference', ['*']);
    return res;
  }

  /**
   * @function 获取项目的npm依赖包
   */
  public async getNpmPkgs() {
    const res = await this.db.query('npm_pkg', ['*']);
    return res;
  }
}

export default AnalysisJS;
