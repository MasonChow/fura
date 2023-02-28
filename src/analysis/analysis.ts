/**
 * 主要分析指定文件夹的文件关联
 *
 * @name 文件分析模块
 * @group module
 */

import lodash from 'lodash';
// import cloneDeep from 'lodash/cloneDeep';
import { Translator, TranslatorType } from '../parser';
import { fs, path } from '../helper/fileReader';
import diskCache from '../helper/diskCache';
import * as utils from '../helper/utils';
import logger from '../helper/logger';
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
  type: 'page' | 'module' | 'component' | 'unknown';
  name: string;
  description: string;
}

export type FileWithAttr = DatabaseTable['file'] & {
  attr: DatabaseTable['file_attr'] | null;
};

export type GetCommentRelationResult = FileWithAttr & {
  next: Array<GetCommentRelationResult> | null;
  prev: Array<GetCommentRelationResult> | null;
};

function createRelationUniqKey(from: number, to: number) {
  return `${from}_${to}` as const;
}

export type RelationUniqKeyType = ReturnType<typeof createRelationUniqKey>;

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
    logger.info('开始实例化');
    logger.info('目标目录:', targetDir);
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

    logger.info('实例化完成');
  }

  private initDB(project = this.options?.project || 'data') {
    this.DB = new Database(diskCache.createFilePath(`${project}.db`), true);
  }

  private get db() {
    return this.DB;
  }

  // 把文件基本信息写入数据库
  private async initBaseDataIntoDB() {
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

    logger.info('写入基础数据');
    await Promise.all([
      this.DB.inserts('dir', tableDirs),
      this.DB.inserts('file', tableFiles),
      this.DB.inserts('npm_pkg', tableNpmPkgs),
    ]);
    logger.info('写入基础数据');
    logger.info('查询基础数据完成');
    const [dirs, files, npmPkgs] = await Promise.all([
      this.DB.query('dir', ['id', 'path', 'parent_path']),
      this.DB.query('file', ['id', 'path', 'parent_path']),
      this.DB.query('npm_pkg', ['id', 'name']),
    ]);
    logger.info('查询基础数据完成');
    logger.info('插入文件夹与文件关系数据');
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
    logger.info('插入文件夹与文件关系数据完成');
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
  }

  // 分析
  public async analysis() {
    logger.info('分析内容');
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
    logger.info('分析内容完成');
  }

  /**
   * 根据文件路径获取对应的文件id
   *
   * @param filePath 文件相对路径
   */
  public getFileIdByPath(filePath: string) {
    const fileAbsolutePath = path.join(this.targetDir, filePath);
    // 检查文件是否存在
    fs.statSync(fileAbsolutePath);
    // 转成fileId
    const fileId = this.dataCache?.file[fileAbsolutePath]?.id || 0;

    if (!fileId) {
      console.warn(
        `[warn] 文件并未并被解析成功，绝对路径：${filePath}，传入相对路径：${filePath}`,
      );
    }
    return fileId;
  }

  /**
   * 自动补全index文件
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
   * 设置文件之间的依赖数据
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
   * 设置文件的描述信息
   */
  private async setFileAttrs(
    filePath: string,
    commentProps: ReturnType<TranslatorType['translateJS']>['commentProps'],
  ) {
    const { id: fileId } = this.getCacheDataByPath(filePath);
    await this.DB.insert('file_attr', {
      file_id: fileId,
      name: commentProps.name,
      type: commentProps.group,
      description: commentProps.description,
    });
  }

  /**
   * 分析文件
   * @param filePath 分析文件路径
   */
  private async analysisFile(filePath: string) {
    const translator = new Translator({ filePath }, this.options);
    const { imports, commentProps } = translator.translateJS();

    await Promise.all([
      this.setFileRelations(filePath, imports),
      this.setFileAttrs(filePath, commentProps),
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
     * 遍历node节点
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
   * 获取没被应用的依赖
   * @description 暂时支持ts/js文件引用分析已经npm包中dependencies无被引用分析
   */
  public async getUnusedDeps(
    rootFilePath: string,
    options?: {
      include: string[];
    },
  ) {
    const entryFileAbsolutePath = path.join(this.targetDir, rootFilePath);

    // 检查文件是否存在
    fs.statSync(entryFileAbsolutePath);

    const [
      // 文件依赖关系
      fileRefs,
      // 项目的js文件
      dirFiles,
      // 项目npm包
      npmPkgs,
    ] = await Promise.all([
      this.getFileRefs(),
      this.getDirFiles(),
      this.getNpmPkgs(),
    ]);
    // 分析入口的目录，使用绝对路径 一般就是{project}/src
    const includeDirPaths = options?.include.map((e) => {
      return path.join(this.targetDir, e);
    });
    // 过滤掉不需要分析的文件(目标文件策略: 文件路径以分析入口目录开头且js/ts类型的文件)
    const filterFiles: typeof dirFiles = dirFiles.filter((dirFile) => {
      // 如果指定了include目录，则只识别include里面的
      if (
        includeDirPaths &&
        !includeDirPaths.every((includeDirPath) =>
          dirFile.file_path.startsWith(includeDirPath),
        )
      ) {
        return false;
      }

      return ['js', 'ts'].includes(dirFile.file_type);
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
        if (filesMap[fileId]?.file_path === entryFileAbsolutePath) {
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
   * 获取文件上下游链路数据-平铺格式
   * @param entryFilePath 入口文件相对路径
   */
  public async getFlattenFileFullRelation(entryFilePath: string) {
    const fileId = this.getFileIdByPath(entryFilePath);
    logger.info('通过文件路径换取文件id', entryFilePath, fileId);
    return this.getFlattenFileFullRelationById(fileId);
  }

  /**
   * 获取文件上下游链路数据-平铺格式
   * @param entryFileId 入口文件的id
   */
  public async getFlattenFileFullRelationById(entryFileId: number) {
    const res = await this.getFileFullRelation(entryFileId);
    const infoMap = new Map<
      number,
      Omit<typeof res, 'prev' | 'next'> & {
        isEntry: boolean;
      }
    >();
    const relationMap = new Map<
      RelationUniqKeyType,
      { from: number; to: number; type: 'up' | 'down' }
    >();

    function loop(item: typeof res) {
      const { id, prev, next, ...itemInfo } = item;

      if (!infoMap.get(id)) {
        infoMap.set(id, {
          ...itemInfo,
          id,
          isEntry: id === res.id,
        });
      }

      prev?.forEach((prevItem) => {
        const info = {
          from: prevItem.id,
          to: id,
          type: 'up',
        } as const;
        relationMap.set(createRelationUniqKey(info.from, info.to), info);
        loop(prevItem);
      });

      next?.forEach((nextItem) => {
        const info = {
          from: id,
          to: nextItem.id,
          type: 'down',
        } as const;
        relationMap.set(createRelationUniqKey(info.from, info.to), info);
        loop({
          ...nextItem,
        });
      });
    }

    loop(res);

    return {
      infoMap,
      relations: Object.values(Object.fromEntries(relationMap)),
    };
  }

  /**
   * 获取文件上下游链路数据-树状
   * @param entryFileId 入口文件的id
   *
   * @returns prev 上游数据
   * @returns next 下游数据
   */
  private async getFileFullRelation(entryFileId: number) {
    logger.info('获取完整的文件关系连路', entryFileId);
    const [upRelation, downRelation] = await Promise.all([
      this.getFileRelation(entryFileId, 'up'),
      this.getFileRelation(entryFileId, 'down'),
    ]);

    return {
      ...upRelation,
      ...downRelation,
      prev: upRelation.prev,
      next: downRelation.next,
    };
  }

  /**
   * 获取文件依赖关系
   *
   * @param entryFileId 入口文件的id
   * @param type up-上游 down-下游
   */
  private async getFileRelation(
    entryFileId: number,
    type: 'up' | 'down' = 'down',
  ) {
    logger.info('获取注释文件关系', entryFileId, type);
    const lock = new Set<number>();
    const isUpType = type === 'up';

    const loop = async (fileId: number) => {
      logger.info('递归执行', fileId);
      // 基于文件id查询到关系链
      const [relations, fileWithAttr] = await Promise.all([
        isUpType
          ? this.getFileUpstream(fileId)
          : this.getFileDownstream(fileId),
        this.getFileWithAttr(fileId),
      ]);

      logger.info(
        `查询完成，当期文件(${fileId}) ${fileWithAttr.path}有${relations.length}个关系`,
      );

      const result: GetCommentRelationResult = {
        ...fileWithAttr,
        next: null,
        prev: null,
      };

      if (relations.length && !lock.has(fileId)) {
        lock.add(fileId);

        if (isUpType) {
          result.prev = [];
        } else {
          result.next = [];
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const r of relations.filter((j) => j.type === 'file')) {
          if (isUpType) {
            // eslint-disable-next-line no-await-in-loop
            const res = await loop(r.file_id);
            result.prev!.push(res);
          } else {
            // eslint-disable-next-line no-await-in-loop
            const res = await loop(r.ref_id);
            result.next!.push(res);
          }
        }
      }

      return result;
    };

    const res = await loop(entryFileId);
    return res;
  }

  /**
   * 获取文件信息以及相关属性
   */
  private async getFileWithAttr(fileId: number) {
    const [fileRes, attrsRes] = await Promise.all([
      this.getFilesByIds([fileId]),
      this.getFileAttrs([fileId]),
    ]);

    return {
      ...fileRes[0],
      attr: attrsRes[fileId] || null,
    };
  }

  /**
   * 从DB获取项目内所有文件夹
   */
  private async getAllDir() {
    const res = await this.db.query('dir', ['*']).orderBy('depth', 'asc');
    return res;
  }

  /**
   * 从DB获取项目内所有文件
   */
  private async getAllFile() {
    const res = await this.db.query('file', ['*']);
    return res;
  }

  /**
   * 批量获取文件的属性
   * @description 传入fileIds则按需获取，否则就全量获取
   */
  private async getFileAttrs(fileIds?: number[]) {
    let dataSource: Array<DatabaseTable['file_attr']> = [];

    if (fileIds) {
      dataSource = await this.db.table('file_attr').whereIn('file_id', fileIds);
    } else {
      dataSource = await this.db.table('file_attr');
    }

    // 以文件为维度，归组所有的属性数据
    const groupByFileId = lodash.keyBy(dataSource, 'file_id');
    return groupByFileId;
  }

  /**
   * 获取项目文件
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
   * 获取文件夹与文件内容
   */
  private async getDirFiles() {
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
   * 获取npm包详情依赖
   * @param npmPkgs
   * @returns
   */
  public async getNpmPkgInfoMap(npmPkgs: string[]) {
    const res = await this.getNpmPkgs({ names: npmPkgs });
    const refFiles = await this.getFileRefs({
      type: 'npm',
      refIds: res.map((e) => e.id),
    });
    const groupByNpmId = lodash.groupBy(refFiles, 'ref_id');

    return res.reduce((pre, cur) => {
      pre.set(cur.id, { ...cur, usedFiles: groupByNpmId[cur.id] });
      return pre;
    }, new Map<number, (typeof res)[0] & { usedFiles: typeof refFiles }>());
  }

  /**
   * 根据ids获取项目内文件
   */
  private async getFilesByIds(fileIds: number[] = []) {
    const res = await this.db.table('file').whereIn('id', fileIds);
    return res;
  }

  /**
   * 获取所有文件依赖关系
   */
  private async getFileRefs(
    params?: Partial<{
      type: DatabaseTable['file_reference']['type'];
      fileIds: DatabaseTable['file_reference']['file_id'][];
      refIds: DatabaseTable['file_reference']['ref_id'][];
    }>,
  ) {
    let query = this.db.query('file_reference', ['*']);

    if (params) {
      const { type, fileIds, refIds } = params;

      if (type) {
        query = query.where({ type });
      }

      if (fileIds?.length) {
        query = query.whereIn('file_id', fileIds);
      }

      if (refIds?.length) {
        query = query.whereIn('ref_id', refIds);
      }
    }

    const res = await query;
    return res;
  }

  /**
   * 获取所有文件下游依赖关系
   */
  private async getFileDownstream(fileId: number) {
    const res = await this.db
      .table('file_reference')
      .where('file_id', fileId)
      .select('*');
    return res;
  }

  /**
   * 获取所有文件上游依赖关系
   */
  private async getFileUpstream(fileId: number) {
    const res = await this.db
      .table('file_reference')
      .where('ref_id', fileId)
      .select('*');
    return res;
  }

  /**
   * 获取项目的npm依赖包
   */
  private async getNpmPkgs(params?: { names?: string[] }) {
    let query = this.db.query('npm_pkg', ['*']);

    if (params?.names?.length) {
      query = query.whereIn('name', params.names);
    }

    const res = await query;
    return res;
  }
}

export default AnalysisJS;
