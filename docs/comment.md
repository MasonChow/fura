# 注释规范

文件顶部

```javascript
/** 
* @page xxx页面(一般是Router下的第一个组件)
* @module xxx模块和xxx模块
* @description 补充的详细描述(可选)
*/
```

函数(function/hook)

```javascript
/**
* @function xxxx功能
* @description 补充的详细描述(可选)
*/
function func(){

}
```


组件(Component)

```javascript
/**
* @component Demo组件
* @description 补充的详细描述(可选)
*/
export default Demo = () => {
  return <div>demo</div>
}
```

组件Props

```javascript
export interface Props {
  /** 禁用 */
  disabled: boolean;
}
```

请求

```javascript
/** 
* @api 获取用户信息
* @description 补充的详细描述(可选)
*/
async function getUser(){
  
}
```