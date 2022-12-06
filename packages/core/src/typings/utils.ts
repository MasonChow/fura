/**
 * @module utils.ts内用到的类型
 */

export interface DirType {
  // 文件夹名称
  dirName: string;
  // 文件夹名字
  path: string;
  // 文件夹id
  id: string;
  // 父级路径
  parentPath: null | string;
  // 父级是否根目录
  isRootParent: boolean;
  // 文件数量
  fileCount: number;
  // 总大小
  totalSize: number;
  // 总大小(格式化)
  totalFormatSize: string;
  // 目录下文件内容
  files: string[];
  // 深度
  depth: number;
}

export interface DirFilesType {
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
  fileFormatSize: string;
  // 文件大小 单位byte
  fileSize: number;
}

export interface DirFilesTree {
  name: string;
  path: string;
  id: string;
  type: 'dir' | 'file';
  children?: DirFilesTree[];
}

export type GetMapValue<V> = V extends Map<any, infer E> ? E : never;

export type FileType = 'js' | 'css' | 'ts' | 'less' | 'others';
