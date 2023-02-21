/**
 * mermaid-flowChats模块
 */

import { replaceSpecialSymbolStr } from '../utils';
import { GetObjectEntries } from '../../typings/utils';

export const NODE_LINK_MAP = {
  normal: '-->',
  dot: '-.->',
} as const;

/** 基于NODE_LINK_MAP配置生成相关的类型 */
export type NodeLinkMapTypes = GetObjectEntries<typeof NODE_LINK_MAP>;

/** flowChats流程图节点类型定义 */
export interface FlowChartsNodeShape {
  /** 节点渲染的名称 */
  name: string;
  /** 创建的节点类型 */
  type?: 'round-edges' | 'stadium' | 'circle' | 'rhombus';
}

export type FlowChartNodeLinkType =
  | [string, string]
  | [string, string, { text: string; type?: NodeLinkMapTypes['keys'] }];

/** 渲染flowCharts流程图数据类型定义 */
export interface CreateFlowchartsData {
  /**
   * 链接关系
   * @example [A, B] => A-->B
   * @example [A, B, {text: 'text', type: 'dot'}] => A-. text .-> B
   * */
  links: FlowChartNodeLinkType[];
  /**
   * 对应关系的数据map
   * @example { keyA: { name: 'Node', type: 'stadium' } } -> keyA([Node])
   */
  itemMap: Record<string, FlowChartsNodeShape>;
}

/** 渲染flowCharts流程图数据类型配置 */
export interface CreateFlowchartsOptions {
  /**
   * 流程图方向,默认TB
   *
   * @defaultValue LR
   * @enum
   * - TB(top to bottom)
   * - TD(top-down/ same as top to bottom)
   * - BT(bottom to top)
   * - RL(right to left)
   * - LR(left to right)
   * @see {@link https://mermaid.js.org/syntax/flowchart.html#flowchart-orientation}
   *
   */
  type: 'TB' | 'TD' | 'BT' | 'RL' | 'LR';
}

/**
 * 构建Flow流程图node节点
 *
 * @param params.key 节点id
 * @param params.name 节点名
 * @param params.type 节点类型, 默认值为:round-edges
 * @returns 符合Mermaid语法的节点字符
 *
 * @see {@link https://mermaid.js.org/syntax/flowchart.html#flowcharts-basic-syntax}
 */
export function createFlowChartsNodeShape(params: {
  key: string;
  name: FlowChartsNodeShape['name'];
  type?: FlowChartsNodeShape['type'];
}) {
  const { key, name, type = 'round-edges' } = params;
  const nodeName = replaceSpecialSymbolStr(name);

  switch (type) {
    case 'round-edges':
      return `${key}[${nodeName}];` as const;
    case 'stadium':
      return `${key}([${nodeName}]);` as const;
    case 'circle':
      return `${key}((${nodeName}));` as const;
    case 'rhombus':
      return `${key}{${nodeName}};` as const;
    default:
      throw new Error('unknown node type');
  }
}

/**
 * 构建Flow流程图node节点
 *
 * @param start 发起端节点id
 * @param end 结束端节点id
 * @param options 链接线相关配置
 * @param options.text 渲染在连接线上的文本
 * @param options.type 连接线的样式，默认normal(-->)
 *
 * @returns 符合Mermaid语法的节点字符
 *
 * @see {@link https://mermaid.js.org/syntax/flowchart.html#flowcharts-basic-syntax}
 */
export function createFlowChartsLinkNode(
  start: string,
  end: string,
  options?: FlowChartNodeLinkType[2],
) {
  let link: NodeLinkMapTypes['values'] = NODE_LINK_MAP.normal;
  let linkText: string = '';

  if (options) {
    const { text, type } = options;

    if (type) {
      link = NODE_LINK_MAP[type];
    }

    if (text) {
      linkText = `|${text}|`;
    }
  }

  return `${start}${link}${linkText || ''}${end};` as const;
}

/**
 * 创建flowChats图例
 *
 * @param data 生成图例关系链数据
 * @param options 生成图例相关配置
 * @returns mermaid语法内容
 *
 */
export function createFlowcharts(
  data: CreateFlowchartsData,
  options?: Partial<CreateFlowchartsOptions>,
) {
  const type = options?.type || 'LR';

  const keys = Object.entries(data.itemMap).map(([key, info]) => {
    return createFlowChartsNodeShape({ key, ...info });
  });

  const notes = data.links.map((link) => {
    const [prev, next, opts] = link;
    return createFlowChartsLinkNode(prev, next, opts);
  });

  return ([`graph ${type};`, ...keys, ...notes] as const).join('\n');
}

export default createFlowcharts;
