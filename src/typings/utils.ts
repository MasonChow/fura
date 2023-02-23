/**
 * @module utils.ts内用到的类型
 */

export interface DirType {
  /** 文件夹名称 */
  dirName: string;
  /** 文件夹名字 */
  path: string;
  /** 文件夹id */
  id: string;
  /** 父级路径 */
  parentPath: string;
  /** 文件数量 */
  fileCount: number;
  /** 总大小 */
  totalSize: number;
  /** 总大小(格式化) */
  totalFormatSize: string;
  /** 目录下文件内容 */
  files: string[];
  /** 深度 */
  depth: number;
}

export interface DirFilesType {
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  path: string;
  /** 文件id */
  id: string;
  /** 父级路径 */
  parentPath: string;
  /** 父级是否根目录 */
  isRootParent: boolean;
  /** 格式化后文件大小 *B/*KB/*MB/*GB/*TB */
  fileFormatSize: string;
  /** 文件大小 单位byte */
  fileSize: number;
}

export interface DirFilesTree {
  name: string;
  path: string;
  id: string;
  type: 'dir' | 'file';
  children?: DirFilesTree[];
}

export type GetArrayUnionType<V extends Readonly<Array<string | number>>> =
  V[number];

export type GetMapValue<V> = V extends Map<any, infer E> ? E : never;

export interface GetObjectEntries<V, K = keyof V> {
  keys: K;
  values: V extends { [key in keyof V]: infer E } ? E : never;
}

export type FileType = 'js' | 'css' | 'ts' | 'less' | 'others';

// copy from https://github.com/total-typescript/ts-reset/blob/main/src/entrypoints/utils.d.ts
export type WidenLiteral<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T extends bigint
  ? bigint
  : T extends symbol
  ? symbol
  : T;
