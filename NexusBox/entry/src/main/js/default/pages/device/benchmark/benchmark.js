import File from '@system.file';
import Router from '@system.router';

// ================= 跑分项配置（模块级，hml 不可访问） =================
// 总操作量 = slices * chunk（固定），降低单片量、增加分片数，
// 使每次同步执行更短，低性能老设备也能保持界面响应。
const TOTAL_SCORE_BASE = 700000000;
const TURN_DELAY = 30;         // 单片间让出延迟(ms)：让 UI 在片间恢复，低性能老设备更从容

const benchItems = [
    {name: '整数运算', slices: 40, chunk: 150,
        fn: function (ops) {
            var i, a = 0x1234567;
            for (i = 0; i < ops; i++) {
                a = (a * 31 + 7) ^ i;
                a = ((a << 3) | (a >>> 29));
            }
            return a;
        }},
    {name: '浮点运算', slices: 60, chunk: 100,
        fn: function (ops) {
            var i, s = 0;
            for (i = 1; i <= ops; i++) {
                s += Math.sqrt(i);
                s += Math.sin(i * 0.01);
            }
            return s;
        }},
    {name: '字符串处理', slices: 75, chunk: 80,
        fn: function (ops) {
            var i, s = '';
            for (i = 0; i < ops; i++) {
                s += 'ab';
                s = s.slice(-64);
            }
            return s.length;
        }},
    {name: '数组操作', slices: 100, chunk: 60,
        fn: function (ops) {
            var i, arr = [], s = 0;
            for (i = 0; i < ops; i++) {
                arr.push(i);
                s += arr[arr.length - 1];
                if (i % 128 === 0) {
                    arr.sort(function (a, b) { return a - b; });
                }
            }
            return s;
        }},
    {name: '对象访问', slices: 60, chunk: 100,
        fn: function (ops) {
            var i, o = {}, s = 0;
            for (i = 0; i < ops; i++) {
                o['k' + (i % 64)] = i;
                s += o['k' + (i % 64)];
            }
            return s;
        }},
    {name: '逻辑分支', slices: 24, chunk: 250,
        fn: function (ops) {
            var i, x = 0, a = 7, b = 3;
            for (i = 0; i < ops; i++) {
                if ((i & 3) === 0) {
                    x += a & b;
                } else if ((i & 3) === 1) {
                    x += a | b;
                } else if ((i & 3) === 2) {
                    x += (i % 2 === 0 ? a : b);
                } else {
                    x += (i > 0 ? i % 5 : 0);
                }
            }
            return x;
        }},
    {name: 'JSON序列化', slices: 300, chunk: 20,
        fn: function (ops) {
            var i, s = 0, o;
            for (i = 0; i < ops; i++) {
                o = {a: i, b: 'str' + (i % 10), c: [i, i + 1, i + 2]};
                s += JSON.parse(JSON.stringify(o)).a;
            }
            return s;
        }},
    {name: '函数调用', slices: 40, chunk: 150,
        fn: function (ops) {
            var i, s = 0;
            function addOne(x) {
                return x + 1;
            }
            function inc(x) {
                return addOne(x);
            }
            for (i = 0; i < ops; i++) {
                s += inc(i);
            }
            return s;
        }},
    {name: '位运算', slices: 40, chunk: 150,
        fn: function (ops) {
            var i, a = 0xDEADBEEF;
            for (i = 0; i < ops; i++) {
                a ^= i;
                a = (a << 5) ^ (a >>> 2);
                a |= (i << 1) & 0xFF;
            }
            return a;
        }},
    {name: '高阶数学', slices: 80, chunk: 75,
        fn: function (ops) {
            var i, s = 0;
            for (i = 1; i <= ops; i++) {
                s += Math.sin(i * 0.01) + Math.cos(i * 0.013) + Math.atan2(i % 97, i % 31);
                s += Math.pow(1.0001, i % 1000);
                if ((i % 10) === 0) {
                    s += Math.log(i) + Math.exp(i % 7 * 0.01);
                }
            }
            return s;
        }}
];
// ================= 调度器内部状态（模块级，hml 不可访问） =================
let benchIdx = 0;       // 当前项目序号
let benchSlice = 0;     // 当前片序号
let sliceAcc = 0;       // 当前项目累计用时(ms)
let totalFinishedMs = 0;
let benchTimer = null;  // 分段调度定时器

export default {
    data: {        // ================= 跑分预留变量（供 hml 绑定显示） =================
        font:$app.getData().font,
        bench: [
            {name: '整数运算', elapsedMs: -1},
            {name: '浮点运算', elapsedMs: -1},
            {name: '字符串处理', elapsedMs: -1},
            {name: '数组操作', elapsedMs: -1},
            {name: '对象访问', elapsedMs: -1},
            {name: '逻辑分支', elapsedMs: -1},
            {name: 'JSON序列化', elapsedMs: -1},
            {name: '函数调用', elapsedMs: -1},
            {name: '位运算', elapsedMs: -1},
            {name: '高阶数学', elapsedMs: -1}
        ],
        totalScore: 0,
        totalTimeMs: 0,
        totalTime: '',
        progress: 100,      // 跑分进度 0-100
        running: false    // 是否正在跑分
    },
    onInit() {
        // 打开页面时读取上次跑分结果
        this.loadResult();
    },
    // 读取本地 bench.json 并赋值（结果列表/总分/总用时）
    loadResult() {
        File.get({
            uri: 'internal://app/bench.json',
            success: (info) => {
                if (this.running) {
                    return;
                }
                const fileLen = info.length;
                if (fileLen === 0) {
                    return;
                }
                File.readText({
                    uri: 'internal://app/bench.json',
                    position: 0,
                    length: fileLen,
                    success: (data) => {
                        if (this.running) {
                            return;
                        }
                        try {
                            const result = parseTimingResult(JSON.parse(data.text));
                            if (!result) {
                                return;
                            }
                            this.bench = result.bench;
                            this.totalScore = result.totalScore;
                            this.totalTimeMs = result.totalTimeMs;
                            this.totalTime = fmtTime(result.totalTimeMs);
                        } catch (e) {}
                    },
                    fail: () => {}
                });
            },
            fail: () => {}
        });
    },
    // 跑分结束：结果列表/总分/总用时 写入本地 bench.json
    saveResult() {
        File.writeText({
            uri: 'internal://app/bench.json',
            text: JSON.stringify({
                version: 2,
                bench: this.bench,
                totalTimeMs: this.totalTimeMs,
                totalScore: this.totalScore,
                totalTime: this.totalTime
            })
        });
    },
    onShow() {
        // 表冠绑定：进入页面获得表冠焦点
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    onHide() {
        // 页面离开停止跑分，避免后台空转
        this.stopBench();
        // 表冠失焦
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onDestroy() {
        // 页面销毁清理定时器
        this.stopBench();
    },
    // ================= 开始跑分 =================
    // hml 按钮绑定示例：<text class="btn" onclick="startBench">开始跑分</text>
    startBench() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.progress = 0;
        this.bench=[
            {name: '整数运算', elapsedMs: -1},
            {name: '浮点运算', elapsedMs: -1},
            {name: '字符串处理', elapsedMs: -1},
            {name: '数组操作', elapsedMs: -1},
            {name: '对象访问', elapsedMs: -1},
            {name: '逻辑分支', elapsedMs: -1},
            {name: 'JSON序列化', elapsedMs: -1},
            {name: '函数调用', elapsedMs: -1},
            {name: '位运算', elapsedMs: -1},
            {name: '高阶数学', elapsedMs: -1}
        ];
        this.totalScore = 0;
        this.totalTimeMs = 0;
        this.totalTime = fmtTime(0);
        benchIdx = 0;
        benchSlice = 0;
        sliceAcc = 0;
        totalFinishedMs = 0;
        this.runSlice();
    },
    // ================= 分段调度核心 =================
    // 每片执行 chunk 次操作后用 setTimeout(TURN_DELAY) 让出 UI 线程，
    // 表冠滚动/渲染在片间恢复，避免全程阻塞。慢设备借助加倍延迟从容恢复。
    runSlice() {
        var item = benchItems[benchIdx];
        var t0 = new Date().getTime();
        item.fn(item.chunk);
        sliceAcc += new Date().getTime() - t0;
        benchSlice++;
        if (benchSlice < item.slices) {
            this.updateProgress();
            benchTimer = setTimeout(() => this.runSlice(), TURN_DELAY);
        } else {
            this.finishItem(item);
        }
    },
    finishItem(item) {
        var list = [];
        for (var i = 0; i < this.bench.length; i++) {
            list.push({name: this.bench[i].name, elapsedMs: this.bench[i].elapsedMs});
        }
        list[benchIdx] = {name: item.name, elapsedMs: sliceAcc};
        this.bench = list;
        totalFinishedMs += sliceAcc;
        this.totalTimeMs = totalFinishedMs;
        this.totalTime = fmtTime(this.totalTimeMs);
        benchIdx++;
        benchSlice = 0;
        sliceAcc = 0;
        if (benchIdx < benchItems.length) {
            this.updateProgress();
            benchTimer = setTimeout(() => this.runSlice(), TURN_DELAY);
        } else {
            this.finishBench();
        }
    },
    // 全部完成：记录总用时并落盘
    finishBench() {
        var sum = 0;
        for (var i = 0; i < this.bench.length; i++) {
            sum += this.bench[i].elapsedMs;
        }
        totalFinishedMs = sum;
        this.totalTimeMs = sum;
        this.totalTime = fmtTime(sum);
        this.totalScore = Math.round(TOTAL_SCORE_BASE / Math.max(sum, 1));
        this.progress = 100;
        this.running = false;
        benchTimer = null;
        this.saveResult();
    },
    // 进度 = (已完项目 + 当前项目片进度) / 总项目数 * 100；用时随进度同步刷新
    updateProgress() {
        var item = benchItems[benchIdx];
        this.progress = Math.round((benchIdx + benchSlice / item.slices) / benchItems.length * 100);
        this.totalTimeMs = totalFinishedMs + sliceAcc;
        this.totalTime = fmtTime(this.totalTimeMs);
    },
    // 手动停止（预留，可绑"取消"按钮）
    stopBench() {
        if (benchTimer) {
            clearTimeout(benchTimer);
            benchTimer = null;
        }
        this.running = false;
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            if (this.running){
                this.stopBench();
                return;
            }
            Router.replace({
                uri:'/pages/device/index/index'
            })
        };
    },
}
function parseTimingResult(obj) {
    if (!obj || obj.version !== 2 || !Array.isArray(obj.bench) || obj.bench.length !== benchItems.length) {
        return null;
    }
    var sum = 0;
    var rows = [];
    for (var i = 0; i < benchItems.length; i++) {
        var row = obj.bench[i];
        if (!row || row.name !== benchItems[i].name) {
            return null;
        }
        if (typeof row.elapsedMs !== 'number' || !isFinite(row.elapsedMs) || row.elapsedMs < 0) {
            return null;
        }
        sum += row.elapsedMs;
        rows.push({name: row.name, elapsedMs: row.elapsedMs});
    }
    if (typeof obj.totalTimeMs !== 'number' || !isFinite(obj.totalTimeMs) || obj.totalTimeMs < 0 || obj.totalTimeMs !== sum) {
        return null;
    }
    return {
        bench: rows,
        totalTimeMs: sum,
        totalScore: Math.round(TOTAL_SCORE_BASE / Math.max(sum, 1))
    };
}
// 用时格式化：ms -> 1m1s123（分钟为0时省略；毫秒3位补零）
const fmtTime = (t) => {
    const m = Math.floor(t % 3600000 / 60000);
    const s = Math.floor(t % 60000 / 1000);
    let milli = t % 1000;
    let msStr = milli + '';
    while (msStr.length < 3) {
        msStr = '0' + msStr;
    }
    let res = s + 's' + msStr + 'ms';
    if (m > 0) {
        res = m + 'm' + res;
    }
    return res;
};
