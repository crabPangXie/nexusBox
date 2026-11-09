const tutorialText = `《腕连工具箱小程序开发文档》
为了提供方便新锐的腕上编程体验，工具箱开放了设备部分硬件能力、Canvas 与 WebAPI，可实现高度自定义的跑马灯、编程手电筒、代码动画等效果。
*说明：应用提供了 Canvas + 3 种 WebAPI + 14 种系统接口。它们由运行环境直接注入，无需声明或 import，像全局变量一样使用：canvas 是画布对象，alert/confirm/prompt 直接调用，系统接口通过 File、Storage 等对象调用。
例：
canvas.rect(100,100,0,0)
运行环境：
- console.log('日志') // 输出到运行日志
- setTimeout(fn,1000) // 延时执行
- setInterval(fn,1000) // 循环执行
- clearTimeout(id)
- clearInterval(id)
一、Canvas
应用提供了一个 Canvas 画板。为便于多设备适配，采用以屏幕中心为原点，向右、向上为 x/y 轴方向的数学坐标系。
- canvas.fillStyle('#000000') // 定义填充色
- canvas.strokeStyle('#000000') // 定义画线色
- canvas.lineWidth(2) // 定义画线宽度
- canvas.font('24px sans-serif') // 设置字体，支持HarmonyOSHans-Medium、sans-serif、HarmonyOS_Sans_SCGB2312-Bold、HarmonyOSCondensedClockTabular
- canvas.textAlign('center') // 设置对齐方式
- canvas.fillText('文字',x,y) // 填充文字
- canvas.moveTo(x,y) // 移动到
- canvas.lineTo(x,y) // 画线到
- canvas.arc(x,y,r,start,end,anticlockwise) // 圆弧
- canvas.fillRect(x,y,w,h) // 填充矩形
- canvas.strokeRect(x,y,w,h) // 描边矩形
- canvas.rect(x,y,w,h) // 矩形路径
- canvas.beginPath() // 开始路径
- canvas.closePath() // 闭合路径
- canvas.stroke() // 描边
- canvas.clear() // 清空画布
注：clear() 清空画布，仅 fillRect、fillText 操作支持。其余操作（路径、圆弧、stroke 等）绘制后调用 clear 会导致应用进程终止，推荐用全屏黑色 fillRect 覆盖清除。
二、WebAPI
受系统引擎限制，WebAPI 接口为异步函数，后续业务逻辑应放在回调函数中。
- alert('消息内容',() => {
// 关闭弹窗后回调
})
- confirm('消息内容',(data) => {
// data: true / false
})
- prompt('提示词，如：请输入文字',(data) => {
// data: 用户输入内容
})
三、系统接口
以下接口在模拟器内直接可用；真机受权限或硬件限制时，fail 会返回错误。
1. File
本地文件读写，路径使用 /，不要使用 \\，最长 128 个字符。
- File.readText({
uri: 'internal://app/a.txt',
success: (data) => {
console.log(data.text)
},
fail: (data,code) => {},
complete: () => {}
})
- File.writeText({
uri: 'internal://app/a.txt',
text: 'hello',
append: false,
success: () => {},
fail: (data,code) => {},
complete: () => {}
})
其他常用方法：
- File.list({uri,success: (data) => {data.fileList}})
- File.get({uri,success: (file) => {file.uri,file.length,file.type,file.lastModifiedTime}})
- File.delete({uri,success})
- File.mkdir({uri,success})
- File.access({uri,success})
- File.move({srcUri,dstUri,success})
- File.copy({srcUri,dstUri,success})
- File.readArrayBuffer({uri,success: (data) => {data.buffer}})
- File.writeArrayBuffer({uri,buffer: new Uint8Array([]),success})
2. Storage
键值存储，键最多 32 个字符，值必须是字符串。
- Storage.get({
key: 'name',
default: '',
success: (data) => {
console.log(data)
}
})
- Storage.set({
key: 'name',
value: 'example',
success: () => {}
})
- Storage.delete({key: 'name',success})
- Storage.clear({success})
注：value 设为空字符串会删除该项。
3. Sensor
传感器回调会重复触发，不用时记得取消订阅。
- Sensor.subscribeAccelerometer({
interval: 'normal', // game / ui / normal
success: (data) => {
console.log(data.x,data.y,data.z)
}
})
- Sensor.unsubscribeAccelerometer()
其他传感器及返回字段：
- Sensor.subscribeCompass({success: (data) => {data.direction}})
- Sensor.subscribeProximity({success: (data) => {data.distance}})
- Sensor.subscribeLight({success: (data) => {data.intensity}})
- Sensor.subscribeStepCounter({success: (data) => {data.steps}})
- Sensor.subscribeBarometer({success: (data) => {data.pressure}})
- Sensor.subscribeHeartRate({success: (data) => {data.heartRate}}) // 255 表示无效
- Sensor.subscribeOnBodyState({success: (data) => {data.value}})
- Sensor.subscribeGyroscope({
interval: 'normal',
success: (data) => {data.x,data.y,data.z}
})
- Sensor.subscribeDeviceOrientation({
interval: 'normal',
success: (data) => {data.alpha,data.beta,data.gamma}
})
取消订阅：Sensor.unsubscribeCompass()、unsubscribeHeartRate() 等，名字与订阅方法对应。
4. Brightness
亮度范围 1～255，超出会自动修正。
- Brightness.getValue({
success: (data) => {
console.log(data.value)
}
})
- Brightness.setValue({value: 128,success})
- Brightness.getMode({success: (data) => {data.mode}}) // 0 手动，1 自动
- Brightness.setMode({mode: 0,success})
- Brightness.setKeepScreenOn({keepScreenOn: true,success})
5. Device
- Device.getInfo({
success: (data) => {
// data.brand 品牌
// data.manufacturer 厂商
// data.model 型号
// data.product 产品
// data.language 语言
// data.region 地区
// data.windowWidth 屏宽
// data.windowHeight 屏高
// data.screenDensity 屏幕密度
// data.screenShape 屏幕形状：rect / circle
// data.apiVersion API 版本
// data.deviceType 设备类型
}
})
6. App
- App.getInfo() // {appName,versionName,versionCode}
- App.terminate() // 退出应用
- App.screenOnVisible({
visible: true,
success: () => {}
})
7. Battery
- Battery.getStatus({
success: (data) => {
// data.charging 是否充电
// data.level 电量，0.00～1.00
}
})
8. Configuration
- Configuration.getLocale() // {language,countryOrRegion,dir}
9. Router
- Router.replace({
uri: 'pages/index/index',
params: {
key: 'value'
}
})
10. Vibrator
- Vibrator.vibrate({
mode: 'short', // short / long
success: () => {},
fail: (data,code) => {},
complete: () => {}
})
11. Audio
- Audio.src = 'internal://app/music/song.mp3'
- Audio.autoplay = true
- Audio.loop = true
- Audio.volume = 0.5 // 0.0～1.0
- Audio.muted = false
- Audio.play()
- Audio.pause()
- Audio.stop()
- Audio.getPlayState({
success: (data) => {
// data.state play / pause / stop
// data.currentTime 当前进度，秒
}
})
- Audio.currentTime // 当前进度，秒
- Audio.duration // 总时长，秒
播放事件：
- Audio.onplay = () => {}
- Audio.onpause = () => {}
- Audio.onstop = () => {}
- Audio.onended = () => {}
- Audio.onerror = () => {}
- Audio.ontimeupdate = () => {}
12. Geolocation
- Geolocation.getLocation({
timeout: 30000,
coordType: 'wgs84',
success: (data) => {
// data.longitude 经度
// data.latitude 纬度
// data.accuracy 精度
// data.time 时间
},
fail: (data,code) => {},
complete: () => {}
})
- Geolocation.getLocationType({success: (data) => {data.types}})
- Geolocation.subscribe({success: (data) => {data.longitude,data.latitude}})
- Geolocation.unsubscribe()
- Geolocation.getSupportedCoordTypes()
注：timeout 默认 180000 毫秒，coordType 默认 wgs84。
13. Fetch
- Fetch.fetch({
url: string,
data: string | object,
header: Object,
method: string, // GET / POST / PUT / DELETE 等
responseType: string, // text / json
success: (data) => {
// data.code 状态码
// data.data 返回内容
// data.headers 响应头
},
fail: (data,code) => {},
complete: () => {}
})
14. screenLock
- screenLock.isScreenLocked((err,data) => {console.log(data)})
- screenLock.isSecureMode((err,data) => {console.log(data)})
- screenLock.unlockScreen((err) => {})
注：回调格式是 (err,data)，不是 success / fail。
`;
export {tutorialText};
