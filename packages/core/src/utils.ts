import fs from 'fs';
import path from 'path';
import * as types from './typing';

/**
 * 是否js类型的文件
 * 规则
 * 1. 文件名js/jsx/ts/tsx结尾
 * 2. 非*.d.ts文件
 */
export function isJsTypeFile(fileName: string): boolean {
  if (/(.*)\.d\.ts/.test(fileName)) {
    return false;
  }

  return /.(jsx|tsx|js|ts)$/.test(fileName);
}

/**
 * 格式化文件的大小
 * B/KB/MB/GB/TB
 */
export function formatFileSize(size: number): string {
  const base = 1024; //byte
  if (size < base) {
    return size.toFixed(2) + 'B';
  }
  if (size < Math.pow(base, 2)) {
    return (size / base).toFixed(2) + 'KB';
  }
  if (size < Math.pow(base, 3)) {
    return (size / Math.pow(base, 2)).toFixed(2) + 'MB';
  }
  if (size < Math.pow(base, 4)) {
    return (size / Math.pow(base, 3)).toFixed(2) + 'GB';
  }
  return (size / Math.pow(base, 4)).toFixed(2) + 'TB';
}

/**
 * 获取目标目录下所有文件的Map
 */
export function getDirFilesMap(rootDir: string) {
  const filesMap: Map<string, types.DirFilesType> = new Map();

  function reader(dir: string) {
    fs.readdirSync(dir).forEach((file) => {
      const pathname = path.join(dir, file);
      const fileStat = fs.statSync(pathname);

      // 如果是文件夹则继续递归
      if (fileStat.isDirectory()) {
        reader(pathname);
      } else {
        filesMap.set(pathname, {
          id: pathname,
          path: pathname,
          fileName: file,
          parentPath: dir,
          isRootParent: dir === rootDir,
          fileSize: formatFileSize(fileStat.size),
          size: fileStat.size,
        });
      }
    });
  }

  reader(rootDir);

  return filesMap;
}
