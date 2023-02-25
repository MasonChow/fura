# fura

文件使用关系分析(File usage relationship analysis)

## 背景

秉着学习进步的基础原则，自己造一次轮子来实现需求

## 能力

- 生成项目目录树
- 分析项目未使用的npm包

## TODO

### MVP

- [x] 解析js文件并分析依赖
- [ ] cli工具能力提供
- [x] 识别函数对应的注释
- [x] 日志统一/输出

### P1

- [ ] 循环依赖识别警告
- [ ] 可基于git仓库进行分析
- [x] 支持多入口识别未使用文件分析
- [ ] 支持全局命令执行
- [ ] 使用ora做loading优化
- [ ] 生成svg节点可跳转对应仓库/本地文件

### P2

- [x] 缓存生成
- [ ] package.json使用type=module
- [ ] 完善代码注释

## 如何使用

- 使用`@name`声明当前文件主要能力，例如(首页/用户头像组件/首页标题)
- 使用`@group`声明分组
  - 页面: `page`
  - 组件: `component`
  - 模块(js方法类等): `module`

> 更适合的是使用`@category`，考虑到更优化的编辑器提示以及编写，所以还是选择`@group`

### 落地效果

![./.fura/comment-relation.svg](https://kroki.io/mermaid/svg/eNpNkM9OwkAQxu88hUc4kNB2A01IfADjSbxtPBBjkIREwhNwKaARwYCIVlSChMYQlPgHa9P6Mjvb9i3ccbuJt1--b2a-mak0yvXjrd29YkozKR-1mfcJnRa_73NnCpPrg2JKz9Fw-MA7_XjqhvZK1PDpDFoWrFx0dXpYq8JmDtYmXHuoGOk0Spc-855g9srHF5mMkAnljy7vrpKQ3pjb71EwgPY3-GsYdONBEG1ecECeSj0JvHtm_k84dMLlkn2dwrnFvDn0zuQcFkyijxF2mTS2W2LNcr3KRy5_u-K9PgtsYRmExs1bMaF2UqkcNaSLeoGC5cC6KV2pyyOIRvdLOyWZES1m4iFw4_xdl81u67qCvIKcAoI_QTBxJwGaib8VYJAEiKaUAiYloOdVV-4_YJcErCHKIsoi0voFahbNxQ==)


### 使用介绍

`home.js`

```tsx
/**
 * 首页入口文件
 * 
 * @name 项目首页
 * @group page 
 * 
*/

import Layout from './Layout';

export default () => <Layout>hello home page</Layout>
```

`layout.js`

```tsx
/**
 * 首页Layout
 * 
 * @name 首页layout
 * @group component 
 * 
 * @privateRemarks
 * 
 * 这里会解析，识别出是`首页layout组件`
*/
export default ({children}) => {
  return <div>{children}</div>
}

```


`route.js`

```tsx
/**
 * 应用路由声明
*/
import Home from './home'

export default () => (
  <Routes>
    <Route path="/" element={<Home />}>
  </Routes>
)
```

### 其他说明

- 考虑到生成的关系图更精准有效，fura暂时仅对文件头部注释进行特定字段解析使用，解析字段标准参考[typedoc](https://typedoc.org/)
- 其他代码注释使用标准建议参考[TSDoc](https://tsdoc.org/)、[jsdoc](https://jsdoc.app/)

### 参考

- 在ts中寻找出未使用的导出模块 [github](https://github.com/pzavolinsky/ts-unused-exports)
- 在您JS/TS项目中查找未使用的文件、依赖项和导出 [github](https://github.com/webpro/knip)
- 读取tsconfig，并在项目中找出未使用的ts导出 [github](https://github.com/nadeesha/ts-prune)
- 检查代码中未使用模块，`eslint/no-unused-vars`
- 自动修复代码中异常代码块，`eslint --fix`
- umi检查未使用代码导出配置 [文档](https://umijs.org/docs/api/config#deadcode)
- Madge 是一个开发人员工具，用于生成模块依赖关系的可视化图表、查找循环依赖关系并为您提供其他有用的信息。[github](https://github.com/pahen/madge)
