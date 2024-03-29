/**
 * @name 全局通用方法类
 * @group module
 */

import { fs, path } from './fileReader';
import * as UtilTypes from '../typings/utils';

export * as UtilTypes from '../typings/utils';

// js文件后缀类型
export const jsFileSuffix = ['js', 'jsx', 'ts', 'tsx', 'd.ts'] as const;

export type JSFileSuffixType = (typeof jsFileSuffix)[number];

/**
 * 判断是否js类型的文件
 *
 * @param fileName - 文件名
 *
 * @example
 * a.js/a.jsx/a.ts/a.tsx -> true
 * a.d.ts -> false
 *
 */
export function isJsTypeFile(fileName: string): boolean {
  // 去掉由于路径的影响
  const [testFileName = ''] = fileName.split('/').reverse();

  if (/(.*)\.d\.ts/.test(testFileName)) {
    return false;
  }

  const testJsFileReg = new RegExp(`\\.(${jsFileSuffix.join('|')})$`);

  return testJsFileReg.test(testFileName);
}

/**
 * 获取文件类型
 *
 * @param fileName - 文件名
 *
 * @example
 * a.js/a.jsx -> js
 * a.ts/a.tsx -> ts
 * a.d.ts -> ts
 * a.png -> others
 */
export function getFileType(fileName: string): UtilTypes.FileType {
  if (isJsTypeFile(fileName)) {
    if (/.(js|jsx)$/.test(fileName)) {
      return 'js';
    }
    if (/.(ts|tsx)$/.test(fileName)) {
      return 'ts';
    }
  }

  return 'others';
}

/**
 * 创建匹配index的文件路径
 *
 * @param filePath - 文件路径
 *
 * @example
 * 1. xxx/App -> xxx/App.(ts|js|tsx|jsx)
 * 2. xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
 */
export function createDirIndexFilePaths<T extends string = string>(
  filePath: T,
): Array<`${T}${'/index' | ''}.${JSFileSuffixType}`> {
  return [
    // xxx/App -> xxx/App.(ts|js|tsx|jsx)
    ...jsFileSuffix.map((suffix) => `${filePath}.${suffix}` as const),
    // xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
    ...jsFileSuffix.map((suffix) => `${filePath}/index.${suffix}` as const),
  ];
}

/**
 * 格式化显示文件的大小
 *
 * @param size - 文件的大小
 *
 * @example
 * 1023 -> 1023B
 * 1024 -> 1KB
 * 1024 * 1024 -> 1MB
 * 1024 * 1024 * 1024 -> 1GB
 * 1024 * 1024 * 1024 * 1024 -> 1TB
 * 1024 * 1024 * 1024 * 1024 * 1024 -> 1024TB
 */
export function formatFileSize(
  size: number,
): `${number}${'B' | 'KB' | 'MB' | 'GB' | 'TB'}` {
  const base = 1024; // byte
  if (size < base) {
    return `${Number(size.toFixed(2))}B`;
  }

  if (size < Math.pow(base, 2)) {
    return `${Number(Number(size / base).toFixed(2))}KB`;
  }
  if (size < Math.pow(base, 3)) {
    return `${Number(Number(size / Math.pow(base, 2)).toFixed(2))}MB`;
  }
  if (size < Math.pow(base, 4)) {
    return `${Number(Number(size / Math.pow(base, 3)).toFixed(2))}GB`;
  }
  return `${Number(Number(size / Math.pow(base, 4)).toFixed(2))}TB`;
}

export function getProjectNPMPackages(rootDir: string) {
  const fileName = fs
    .readdirSync(rootDir)
    .find((name) => name === 'package.json');
  const packageMap = new Map<
    string,
    {
      name: string;
      version: string;
      type: 'dependencies' | 'devDependencies';
    }
  >();

  if (fileName) {
    const packagePath = path.join(rootDir, fileName);
    const packageData = JSON.parse(fs.readFileSync(packagePath).toString());

    const { devDependencies = {}, dependencies = {} } = packageData;

    Object.keys(devDependencies).forEach((key) => {
      packageMap.set(key, {
        name: key,
        version: devDependencies[key],
        type: 'devDependencies',
      });
    });

    Object.keys(dependencies).forEach((key) => {
      packageMap.set(key, {
        name: key,
        version: dependencies[key],
        type: 'dependencies',
      });
    });
  }

  return packageMap;
}

/**
 * 获取目标目录下所有文件的Map
 */
export function getDirFiles(rootDir: string, exclude?: string[]) {
  const filesMap: Map<string, UtilTypes.DirFilesType> = new Map();
  const dirMap: Map<string, UtilTypes.DirType> = new Map();
  const [rootDirName, ...parentPaths] = rootDir.split('/').reverse();
  const rootDirParentPath = parentPaths.reverse().join('/');

  function addDirInfo(
    dirPath: string,
    info: {
      dirName: string;
      parentPath: string;
      depth?: number;
    },
  ) {
    const { depth = 0, parentPath, dirName } = info;

    dirMap.set(dirPath, {
      id: dirPath,
      path: dirPath,
      parentPath,
      dirName,
      totalSize: 0,
      fileCount: 0,
      depth,
      totalFormatSize: formatFileSize(0),
      files: [],
    });
  }

  function addDirUsageInfo(
    dirPath: string,
    file: {
      id: string;
      size: number;
    },
  ) {
    const dir = dirMap.get(dirPath);

    if (!dir) {
      return;
    }

    dir.fileCount += 1;
    dir.totalSize += file.size;
    dir.files.push(file.id);
    dir.totalFormatSize = formatFileSize(dir.totalSize);
    dirMap.set(dirPath, dir);
    // addDirUsageInfo(dir.parentPath, file);
  }

  function reader(dir: string, depth = 0) {
    const fileTree: UtilTypes.DirFilesTree = {
      id: dir,
      name: dir.split('/').reverse()[0],
      path: dir,
      type: 'dir',
      children: [],
    };

    fs.readdirSync(dir).forEach((name) => {
      const pathname = path.join(dir, name);
      const fileStat = fs.statSync(pathname);
      const baseInfo = {
        id: pathname,
        path: pathname,
        name,
      } as const;

      const parentInfo = {
        isRootParent: dir === rootDir,
        parentPath: dir,
      };

      if (exclude?.includes(name)) {
        return;
      }

      // 如果是文件夹则继续递归
      if (fileStat.isDirectory() && !name.startsWith('.')) {
        addDirInfo(pathname, {
          dirName: name,
          parentPath: dir,
          depth,
        });

        fileTree.children?.push(reader(pathname, depth + 1));
      } else {
        filesMap.set(pathname, {
          ...baseInfo,
          ...parentInfo,
          fileName: name,
          fileFormatSize: formatFileSize(fileStat.size),
          fileSize: fileStat.size,
        });

        addDirUsageInfo(dir, { id: baseInfo.id, size: fileStat.size });

        fileTree.children?.push({
          ...baseInfo,
          type: 'file',
        });
      }
    });

    return fileTree;
  }

  addDirInfo(rootDir, {
    dirName: rootDirName,
    parentPath: rootDirParentPath,
    depth: 0,
  });
  const dirTree: UtilTypes.DirFilesTree = reader(rootDir, 1);
  const files: string[] = [...filesMap.keys()];

  return {
    filesMap,
    dirMap,
    dirTree,
    files,
  };
}

// alias 路径匹配转换
export function transformAliasPath(
  sourcePath: string,
  alias: Record<string, string>,
) {
  const aliasMap = new Map<RegExp, string>();
  Object.entries(alias).forEach(([key, value]) => {
    const reg = new RegExp(`^${key}(\\/|$)`);
    const targetPath = value.endsWith('/') ? value : `${value}/`;
    aliasMap.set(reg, targetPath);
  });
  const regKeys = [...aliasMap.keys()];

  for (let i = 0; i < regKeys.length; i++) {
    const reg = regKeys[i];

    if (reg.test(sourcePath) && aliasMap.get(reg) !== undefined) {
      return sourcePath.replace(reg, aliasMap.get(reg)!);
    }
  }

  return sourcePath;
}

export function isJsOrTsFileType(
  fileType: UtilTypes.FileType,
): fileType is 'js' | 'ts' {
  return ['js', 'ts'].includes(fileType);
}
