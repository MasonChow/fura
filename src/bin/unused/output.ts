/**
 * 输出解析结果
 */

import Table from 'easy-table';
// import lodash from 'lodash';

/**
 * 打印日志到控制台
 */
export function printConsole(
  files: Array<{
    name: string;
    path: string;
    size: number;
  }>,
  npmPkgs: Array<{
    name: string;
    version: string;
  }>,
) {
  if (files.length) {
    const fileTable = new Table();
    files.forEach((file) => {
      fileTable.cell('name', file.name);
      fileTable.cell('path', file.path);
      fileTable.cell('size', file.size);
      fileTable.newRow();
    });

    fileTable.total('name', {
      printer: (val) => {
        return `count: ${val}`;
      },
      reduce: (acc, val, idx) => {
        return idx + 1;
      },
    });

    fileTable.total('size', {
      printer: (val) => {
        return `total: ${val}`;
      },
    });
    console.info('----- 检测到存在未使用文件 ------');
    console.info(fileTable.toString());
  } else {
    console.info('🎉🎉🎉未检测到未被引用文件');
  }

  if (npmPkgs.length) {
    const npmPkgsTable = new Table();
    npmPkgs.forEach((npm) => {
      npmPkgsTable.cell('name', npm.name);
      npmPkgsTable.cell('version', npm.version);
      npmPkgsTable.newRow();
    });

    npmPkgsTable.total('name', {
      printer: (val) => {
        return `count: ${val}`;
      },
      reduce: (acc, val, idx) => {
        return idx + 1;
      },
    });
    console.info('----- 检测到存在未使用的npm包(仅检测dependencies) ------');
    console.info(npmPkgsTable.toString());
  } else {
    console.info('🎉🎉🎉未检测到未被引用npm包');
  }
}
