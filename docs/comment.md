# 注释使用建议

> 考虑到生成的关系图更精准有效，fura暂时仅对文件头部注释进行特定字段解析使用，解析字段标准参考[typedoc](https://typedoc.org/)
> 其他代码注释使用标准建议参考[TSDoc](https://tsdoc.org/)、[jsdoc](https://jsdoc.app/)

## 使用建议

- 使用`@name`声明当前文件主要能力，例如(首页/用户头像组件/首页标题)
- 使用`@group`声明分组
  - 页面: `page`
  - 组件: `component`
  - 模块(js方法类等): `module`

> 更适合的是使用`@category`，考虑到更优化的编辑器提示以及编写，所以还是选择`@group`

### Example

`route.js`

```tsx
/**
 * 应用路由声明
 * 
 * @privateRemarks
 * 
 * 这里的注释并不会解析
*/
import Home from './home'

export default () => (
  <Routes>
    <Route path="/" element={<Home />}>
  </Routes>
)
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


`home.js`

```tsx
/**
 * 首页入口文件
 * 
 * @name 首页
 * @group page 
 * 
 * @privateRemarks
 * 
 * 这里会解析，识别出是`首页页面`。
 * 重复文件的相同注释内容会被解析，仅在识别阶段做警告提醒。
 * 
*/

import Layout from './Layout';

export default () => <Layout>hello home page</Layout>
```