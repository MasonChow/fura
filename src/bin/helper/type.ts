import type { Config as CoreConfig } from '../../core';
import { GetObjectType } from '../../typings/common';

type CoreConfigOptions = GetObjectType<CoreConfig, 'options'>;

export type Config = Partial<Pick<CoreConfigOptions, 'alias' | 'exclude'>> &
  Required<Pick<CoreConfigOptions, 'include'>> & {
    /** 入口文件,需要指定到具体文件，例如src/index.ts */
    entry: string[];
  };
