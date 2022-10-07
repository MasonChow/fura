// import parser from '@fura/parser';
import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import { formatFileSize } from './utils';

export interface Config {
  // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
  // root: string;
  // 执行分析目录
  targetDir: string;
  // 分析入口目录 默认 .
  rootPath?: string;
}

/**
 * 获取目标目录下所有文件的Map
 */
export function getDirFilesMap(rootDir: string): Map<
  string,
  {
    // 文件名
    fileName: string;
    // 文件路径
    path: string;
    // 文件id
    id: string;
    // 父级路径
    parentPath: null | string;
    // 父级是否根目录
    isRootParent: boolean;
    // 格式化后文件大小 *B/*KB/*MB/*GB/*TB
    fileSize: string;
    // 文件大小 单位byte
    size: number;
  }
> {
  const filesMap: ReturnType<typeof getDirFilesMap> = new Map();

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

function main(config: Config) {
  let targetDir = config.targetDir;

  if (config.rootPath) {
    targetDir = path.join(config.rootPath || '.', config.targetDir);
  }

  const targetDirFilesMap = getDirFilesMap(targetDir);

  fs.writeFileSync(
    './core.json',
    JSON.stringify(Object.fromEntries(targetDirFilesMap)),
  );
}

main({
  targetDir: '/Users/zhoushunming/Documents/sc/shopline-post-center/src',
});

export default main;
