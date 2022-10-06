// import parser from '@fura/parser';
import fs from 'fs';
import path from 'path';
import { formatFileSize } from './utils';

const basePath = process.cwd();

export interface Config {
  // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
  // root: string;
  // 执行分析目录
  targetDir: string;
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
    parentPath: string;
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
  const targetDir = path.join(basePath, config.targetDir);
  const targetDirFilesMap = getDirFilesMap(targetDir);
  console.log(targetDirFilesMap);
}

main({
  targetDir: 'packages/core',
});

export default main;
