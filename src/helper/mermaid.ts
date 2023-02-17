/**
 * @module mermaid操作方法模块
 */

import axios from 'axios';

// 这个服务不保障稳定性，如果有需要可自建服务
// https://docs.kroki.io/kroki/setup/use-docker-or-podman/
const fetchFromKroki = axios.create({
  baseURL: 'https://kroki.io',
});

// TB - top to bottom
// TD - top-down/ same as top to bottom
// BT - bottom to top
// RL - right to left
// LR - left to right

export async function createFlowcharts<T extends any>(
  data: {
    /**
     * @name 链接关系
     * @description [id(a), id(b)] = a -> b
     * */
    links: [string, string];
    itemMap: Record<string, T>;
  },
  options?: Partial<{
    /**
     * @name 流程图方向,默认TB
     * @defaultValue `
     * @enum
     * @TB top to bottom: ;
     * TD - top-down/ same as top to bottom
     * BT - bottom to top
     * RL - right to left
     * LR - left to right
     */
    type: /**  top to bottom: */
    'TB' | 'TD' | 'BT' | 'RL' | 'LR';
  }>,
) {
  console.log(data, options);
}

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
