# fura

文件使用关系分析(File usage relationship analysis)

## 背景

秉着学习进步的基础原则，自己造一次轮子来实现需求

## 能力

- 生成项目目录树
- 分析项目未使用的npm包

## TODO

- [ ] 可视化web能力提供
  - [ ] 可基于git仓库进行分析
- [x] 缓存生成
- [x] 识别函数对应的注释
- [ ] 循环依赖识别警告
- [ ] 支持多入口识别

## 其他

### 参考

- 在ts中寻找出未使用的导出模块 [github](https://github.com/pzavolinsky/ts-unused-exports)
- 在您JS/TS项目中查找未使用的文件、依赖项和导出 [github](https://github.com/webpro/knip)
- 读取tsconfig，并在项目中找出未使用的ts导出 [github](https://github.com/nadeesha/ts-prune)
- 检查代码中未使用模块，`eslint/no-unused-vars`
- 自动修复代码中异常代码块，`eslint --fix`
- umi检查未使用代码导出配置 [文档](https://umijs.org/docs/api/config#deadcode)
- Madge 是一个开发人员工具，用于生成模块依赖关系的可视化图表、查找循环依赖关系并为您提供其他有用的信息。[github](https://github.com/pahen/madge)