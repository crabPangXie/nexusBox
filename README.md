视频介绍：[点击观看 Bilibili 演示](https://www.bilibili.com/video/BV14PHb6UE7Q/?share_source=copy_web&vd_source=fa63736410918e80c8ca9301b0e421d4)

# 腕连工具箱 NexusBox

腕连工具箱是面向 LiteWearable 手表的本地工具箱，使用 HML + CSS + JavaScript 开发。项目包含方表版 `NexusBox` 和圆表版 `NexusBoxCircle`，重点提供完整的文件管理器、全面的文件查看工具，以及可以直接在手表上编写并运行代码的 JS 模拟器。

> 本项目是 LiteWearable 轻量级应用工程，不是手机端 ArkTS/ArkUI 应用。

## 核心能力

### 完整的文件管理器

- 浏览应用沙箱及可访问目录，支持路径跳转和目录返回
- 文件与文件夹的新建、重命名、复制、移动、删除
- 文件搜索、批量选择和长按操作
- 将文件分享至手机端
- 管理收藏目录和最近使用路径
- 针对视频、音频等文件提供配套的清理逻辑

### 全面的文件查看工具

- 普通文本与长文本阅读，支持分页、字号和背景调整
- 图片查看与缩放
- 视频播放、暂停和进度控制
- 音频播放与播放状态读取
- JS 脚本、配置文件和普通文本的快速预览
- 文本编辑器和脚本编辑器，可直接修改表端文件

### 表端 JS 模拟器与即时测试

无需连接手机或电脑，直接在手表上编写、运行和调试 JavaScript：

- 内置代码编辑器，支持常用代码片段和中文输入
- 在表上即时运行脚本并查看运行日志
- 内置 Canvas 画板，可绘制文字、矩形、路径和圆弧
- 直接使用 `alert`、`confirm`、`prompt` 等 WebAPI
- 可直接调用 `File`、`Storage`、`Sensor`、`Brightness`、`Device`、`App`、`Battery`、`Configuration`、`Router`、`Vibrator`、`Audio`、`Geolocation`、`Fetch`、`screenLock` 等系统接口
- 适合制作跑马灯、编程手电筒、代码动画等腕上实验

接口说明和示例见 [腕连工具箱小程序开发文档](docs/腕连工具箱小程序开发文档.txt)。

### JS 引擎测试

- 内置 10 项 JS 负载测试：整数、浮点、字符串、数组、对象、分支、JSON、函数调用、位运算和高阶数学
- 每项只记录实际运算用时，不包含分片等待时间
- 结果列表展示各项目用时和总用时
- 最终分数按总用时计算，7 秒基准为 100000 分
- 测试过程分片调度，尽量保持界面响应

### 其他功能

- 加速度、陀螺仪、心率、计步、气压、指南针、佩戴状态等传感器面板
- 屏幕投射与触控板
- 腕上中文输入法
- 亮度、音量、显示、文件、视频、阅读等设置
- 方表与圆表两套独立布局

### 更新日志

- **当前版本号 v1.0.0-patch01**（2026-11-10）
- 补丁内容：修复键盘输入框偶发性跳跃 bug。

## 双版本

| 版本 | 目录 | 屏幕规格 |
| --- | --- | --- |
| 方表版 | `NexusBox/` | 408 × 480 |
| 圆表版 | `NexusBoxCircle/` | 466 × 466 |

两个工程需要分别用 DevEco Studio 打开和构建。

## 项目结构

```text
nexusBox/
├─ NexusBox/                 # 方表工程
│  └─ entry/src/main/
│     ├─ config.json
│     ├─ js/default/         # 页面、组件和公共逻辑
│     └─ resources/          # 图片、字符串和 rawfile
├─ NexusBoxCircle/           # 圆表工程
│  └─ entry/src/main/
├─ docs/
│  └─ 腕连工具箱小程序开发文档.txt
└─ LICENSE
```

## 构建与运行

1. 使用 DevEco Studio 打开 `NexusBox` 或 `NexusBoxCircle`。
2. 本开源版本已移除签名配置，请在 DevEco Studio 中配置自己的签名。
3. `entry/src/main/config.json` 中的 `bundleName` 当前为占位值 `com.example.example`，请改为自己的包名。
4. 连接手表或启动对应设备后，构建并安装 HAP。
5. 部分功能需要传感器、健康数据或跨设备权限，请按设备提示授权。

### 跨设备功能配置

屏幕投射、触控板、文件分享等功能需要与手机端应用配合。开源版本已将手机端包名和证书指纹清空，使用前请在以下文件中填入自己的对端包名和指纹：

- `entry/src/main/js/default/pages/index/index.js`
- `entry/src/main/js/default/pages/screenCast/screenCast.js`
- `entry/src/main/js/default/pages/file/fileShare/fileShare.js`
- `entry/src/main/js/default/pages/trackpad/trackpad.js`

### 权限

工程声明了以下权限：

- `ohos.permission.ACCELEROMETER`
- `ohos.permission.GYROSCOPE`
- `ohos.permission.READ_HEALTH_DATA`
- `ohos.permission.ACTIVITY_MOTION`

## 说明

- 文件、图片、视频和音频功能受设备解码能力、存储空间和系统权限限制。
- 跨设备功能需要手机端应用使用相同的对端包名和证书指纹。
- 输入法模块基于 [CrabKeyboard](https://github.com/crabPangXie/crabKeyboard)（MIT License）。
- 请遵守所在地区法律法规、华为开发者协议以及第三方组件许可。

## License

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
