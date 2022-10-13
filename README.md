# fura

文件使用关系分析(File usage relationship analysis)

## @fura/core

核心模块,提供脚本执行的能行内容

父级没被引用，子级只在父级内部相互引用，子级也算没被引用

- 如果父没被引用，**则判断下子是否被非同级内被引用了**

## @fura/parser

ast解析，单个文件import解析能力提供

## TODO

- [ ] 可视化web能力提供
- [ ] 可基于git仓库进行分析
- [ ] 缓存生成
