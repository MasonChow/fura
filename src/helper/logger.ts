/**
 * @module 配置logger相关
 */

import debug from 'debug';

const info = debug('fura:info');
const error = debug('fura:error');

info.log = console.info.bind(console);
error.log = console.error.bind(console);

export default {
  info,
  error,
  module(module: string, type: 'info' | 'error') {
    return this[type].extend(module);
  },
};
