import fs from 'fs';
import path from 'path';
import * as Types from './typing';

// js文件后缀类型
export const jsFileSuffix = ['js', 'jsx', 'ts', 'tsx'] as const;

/**
 * 是否js类型的文件
 *
 * 1. 文件名js/jsx/ts/tsx结尾
 * 2. 非*.d.ts文件
 */
export function isJsTypeFile(fileName: string): boolean {
  if (/(.*)\.d\.ts/.test(fileName)) {
    return false;
  }

  const testJsFileReg = new RegExp(`.(${jsFileSuffix.join('|')})$`);

  return testJsFileReg.test(fileName);
}

/**
 * 创建匹配index的文件路径
 *
 * 1. xxx/App -> xxx/App.(ts|js|tsx|jsx)
 * 2. xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
 */
export function createDirIndexFilePaths(filePath: string) {
  return [
    // xxx/App -> xxx/App.(ts|js|tsx|jsx)
    ...jsFileSuffix.map((suffix) => `${filePath}.${suffix}`),
    // xxx/App -> xxx/App/index.(ts|js|tsx|jsx)
    ...jsFileSuffix.map((suffix) => `${filePath}/index.${suffix}`),
  ];
}

/**
 * 格式化文件的大小
 * B/KB/MB/GB/TB
 */
export function formatFileSize(size: number): string {
  const base = 1024; // byte
  if (size < base) {
    return `${size.toFixed(2)}B`;
  }

  if (size < Math.pow(base, 2)) {
    return `${(size / base).toFixed(2)}KB`;
  }
  if (size < Math.pow(base, 3)) {
    return `${(size / Math.pow(base, 2)).toFixed(2)}MB`;
  }
  if (size < Math.pow(base, 4)) {
    return `${(size / Math.pow(base, 3)).toFixed(2)}GB`;
  }
  return `${(size / Math.pow(base, 4)).toFixed(2)}TB`;
}

/**
 * 获取目标目录下所有文件的Map
 */
export function getDirFiles(rootDir: string, exclude?: string[]) {
  const filesMap: Map<string, Types.DirFilesType> = new Map();
  const dirMap: Map<string, Types.DirType> = new Map();

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

    if (dir.parentPath) {
      addDirUsageInfo(dir.parentPath, file);
    }
  }

  function reader(dir: string) {
    const fileTree: Types.DirFilesTree = {
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
      // 不解析排除的文件夹
      if (exclude?.includes(name)) {
        return;
      }

      // 如果是文件夹则继续递归
      if (fileStat.isDirectory()) {
        dirMap.set(pathname, {
          ...baseInfo,
          ...parentInfo,
          dirName: name,
          totalSize: 0,
          fileCount: 0,
          totalFormatSize: formatFileSize(0),
          files: [],
        });

        fileTree.children?.push(reader(pathname));
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

  const dirTree: Types.DirFilesTree = reader(rootDir);
  const files: string[] = [...filesMap.keys()];

  return {
    filesMap,
    dirMap,
    dirTree,
    files,
  };
}
