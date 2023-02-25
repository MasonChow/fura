/**
 * mermaid操作方法模块
 */

import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';
import pako from 'pako';
import logger from '../logger';

// 导出流程图所有模块内容
export * as flowChats from './flowChats';

// 这个服务不保障稳定性，如果有需要可自建服务
const baseURL = 'https://kroki.mason.pub';
const officialBaseUrl = 'https://kroki.io';
// https://docs.kroki.io/kroki/setup/use-docker-or-podman/
const fetchFromKroki = axios.create({
  baseURL,
});

// 添加请求拦截器
fetchFromKroki.interceptors.request.use(function beforeSend(config) {
  logger.info(
    `执行请求kroki服务获取内容,method=${config.method},url=${
      config.url
    },body=${JSON.stringify(config.data)}`,
  );
  return { ...config, requestId: uuidV4() };
});

// 添加响应拦截器
fetchFromKroki.interceptors.response.use(
  function onResponse(response) {
    logger.info(
      `请求kroki成功, response:${JSON.stringify(
        response.headers,
      )}, requestData:${JSON.stringify(response.config)}`,
    );
    return response;
  },
  function onError(error) {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    logger.info(`请求kroki异常, error`, error.message);
    return Promise.reject(error);
  },
);

/**
 * @function mermaid内容转成媒体资源
 */
export async function conversionToMedia(
  content: string,
  type: 'svg' | 'png' = 'svg',
) {
  const requestBody = {
    diagram_source: content,
    diagram_type: 'mermaid',
    output_format: type,
  } as const;

  const res = await fetchFromKroki.post<ArrayBuffer>('/', requestBody, {
    responseType: 'arraybuffer',
  });
  logger.info('执行请求kroki服务获取内容完成');

  return res.data;
}

export function conversionOriginUrl(
  content: string,
  type: 'svg' | 'png' = 'svg',
) {
  const data = Buffer.from(content, 'utf8');
  const compressed = pako.deflate(data, { level: 9 });
  const result = Buffer.from(compressed)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${officialBaseUrl}/mermaid/${type}/${result}`;
}
