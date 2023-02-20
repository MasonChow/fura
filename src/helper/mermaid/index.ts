/**
 * mermaid操作方法模块
 */

import axios from 'axios';

// 导出流程图所有模块内容
export * as flowChats from './flowChats';

// 这个服务不保障稳定性，如果有需要可自建服务
// https://docs.kroki.io/kroki/setup/use-docker-or-podman/
const fetchFromKroki = axios.create({
  baseURL: 'https://kroki.io',
});

/**
 * @function mermaid内容转成媒体资源
 */
export async function conversionToMedia(
  content: string,
  type: 'svg' | 'png' = 'svg',
) {
  const res = await fetchFromKroki.post<ArrayBuffer>(
    '/',
    {
      diagram_source: content,
      diagram_type: 'mermaid',
      output_format: type,
    },
    { responseType: 'arraybuffer' },
  );

  return res.data;
}
