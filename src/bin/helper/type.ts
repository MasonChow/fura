import type { Config as CoreConfig } from '../../core';
import { GetObjectType } from '../../typings/common';

type CoreConfigOptions = GetObjectType<CoreConfig, 'options'>;

export type Config = Partial<{
  alias: CoreConfigOptions['alias'];
  exclude: CoreConfigOptions['exclude'];
  /** 检测未使用的文件和导出, 后续api实现参考 https://umijs.org/docs/api/config#deadcode */
  deadCode: {
    /** 入口文件夹，默认src */
    entry: string[];
    /** 指定包含的目录 */
    include: string[];
  };
}>;
