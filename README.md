# fura

文件使用关系分析(File usage relationship analysis)

> alpha测试阶段，api不稳定

## 背景

秉着学习进步的基础原则，自己造一次轮子来实现需求

## 能力

- 生成项目目录树
- 分析项目未使用的npm包

### MVP

- [x] 解析js文件并分析依赖
- [x] cli工具能力提供
- [x] 识别函数对应的注释
- [x] 日志统一/输出

### P1

- [ ] 完整使用文档提供
- [ ] 循环依赖识别警告
- [ ] 可基于git仓库进行分析
- [x] 支持多入口识别未使用文件分析
- [x] 支持多入口文件关系识别分析
- [x] 使用ora做loading优化
- [ ] 生成svg节点可跳转对应仓库/本地文件
- [ ] cli命令行可视化交互

### P2

- [x] 缓存生成
- [ ] package.json使用type=module
- [ ] 支持自建mermaid服务
- [ ] 完善代码注释

## 如何使用

**1.安装**

`npm i fura --save-dev`

**2.项目根目录增加`.furarc`配置**

example

```json
{
  "alias": {
    "@": "./src"
  },
  // 识别的入口文件(必须)
  "entry": [
    "./src/index.ts",
    "./src/bin/index.ts"
  ],
  // 包含的目录(可选,无则根目录)
  "include": [
    "./src"
  ],
  // 忽略的目录名(可选)
  "exclude": [
    "dist"
  ]
}
```

**3.运行命令 fura \<action\>**

`fura unused` 分析项目内未使用的文件以及npm依赖

- npm依赖仅分析`dependencies`内部依赖
  - 注意会识别出仅开发需要使用的依赖却安装到`dependencies`上的，例如`eslint`

`fura schema`

基于`.furarc`配置的`entry`内容进行依赖分析输出`svg`内容

`fura diff influence <target branch>`

指定目标分支进行代码diff关系链路识别，不指定`target branch`则分析本地变更与当前分支远端变更的差异

### cli

### 代码注释建议

- 使用`@name`声明当前文件主要能力，例如(首页/用户头像组件/首页标题)
- 使用`@group`声明分组
  - 页面: `page`
  - 组件: `component`
  - 模块(js方法类等): `module`

> 更适合的是使用`@category`，考虑到更优化的编辑器提示以及编写，所以还是选择`@group`

### 落地效果

![./.fura/comment-relation.svg](https://kroki.io/mermaid/svg/eNpVkM1Kw0AURvc-hct0UWhpw2QQfABxZd0NLopILFQNfYK6SFpFtGKNP7VqSItBSm0RrTG2vszcSfIW3jGJ4O5w7uW734zeqBq7y-sbK0ukxITd4sE7tC1x3xGeA_2rLfQqC7sPot2JHT_sjXFHOC5YJox9OSVsu16D2RDMWTgNpNEURarzOQ8G4E7E9Wkuh5qyaHEBrc805u6Zz7_DrheORvzjCE5MHgzh7DipwBf96M3GMK3I4p6Fx2FyGLlm1agJ2xevl3JEWNy8xYT6ga7vNP48LTAwPZg2k2nik2q0qCj7xh4eE48-vHxhG1mNltlmZa2SnI6eXHw93Hi_-_n8qlaUNRBISX6SNCQFWs6gIFNSIJpcJhnQDFT5W2kgoRmo_4CkgDk_uIC5FQ==)


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
