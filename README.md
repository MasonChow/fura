# fura

文件使用关系分析(File usage relationship analysis)

## 背景

秉着学习进步的基础原则，自己造一次轮子来实现需求

## 能力

核心模块,提供脚本执行的能行内容

父级没被引用，子级只在父级内部相互引用，子级也算没被引用

- 如果父没被引用，**则判断下子是否被非同级内被引用了**

## TODO

- [ ] 可视化web能力提供
- [ ] 可基于git仓库进行分析
- [ ] 缓存生成
- [ ] 识别函数对应的注释

## 其他

### 参考

- 在ts中寻找出未使用的导出模块 [github](https://github.com/pzavolinsky/ts-unused-exports)
- 在您JS/TS项目中查找未使用的文件、依赖项和导出 [github](https://github.com/webpro/knip)
- 读取tsconfig，并在项目中找出未使用的ts导出 [github](https://github.com/nadeesha/ts-prune)
- 检查代码中未使用模块，`eslint/no-unused-vars`
- 自动修复代码中异常代码块，`eslint --fix`
- umi检查未使用代码导出配置 [文档](https://umijs.org/docs/api/config#deadcode)