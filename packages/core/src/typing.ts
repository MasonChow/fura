export type DirFilesType = {
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
};
