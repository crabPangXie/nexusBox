import Device from '@system.device';
import Battery from '@system.battery';
import Brightness from '@system.brightness';
import Router from '@system.router';
import File from '@system.file';
import { vibrate } from '../../../common/vibrate';

let timer_refresh;
let timer_timestamp;
let timer_ani;

export default {
    data: {
        font:$app.getData().font,
        openIdx:-1,
        openAni:0,
        list: [
            {name: '品牌', value: '--'},
            {name: '生产商', value: '--'},
            {name: '型号', value: '--'},
            {name: '代号', value: '--'},
            {name: '系统语言', value: '--'},
            {name: '系统地区', value: '--'},
            {name: '分辨率', value: '--'},
            {name: '屏幕密度', value: '--'},
            {name: '屏幕形状', value: '--'},
            {name: '系统版本', value: '--'},
            {name: '设备类型', value: '--'},
            {name: '电量', value: '--'},
            {name: '充电状态', value: '--'},
            {name: '自动亮度', value: '--'},
            {name: '当前亮度', value: '--'},
            {name: '当前时间', value: '--'},
            {name: '系统时间戳', value: '--'}
        ],
        shearList:[],
        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {
        File.readText({
            uri:'internal://app/shear.json',
            success:(data)=>{
                if (data.text) {
                    this.shearList=JSON.parse(data.text)
                }
            }
        });
        // 设备静态信息（只读一次）
        Device.getInfo({
            success: (data) => {
                this.list[0].value = data.brand;
                this.list[1].value = data.manufacturer;
                this.list[2].value = data.model;
                this.list[3].value = data.product;
                this.list[4].value = data.language;
                this.list[5].value = data.region;
                this.list[6].value = data.windowWidth + '×' + data.windowHeight;
                this.list[7].value = data.screenDensity + 'dpi';
                this.list[8].value = data.screenShape;
                this.list[9].value = 'API ' + data.apiVersion;
                this.list[10].value = data.deviceType;
                    },
            fail: () => {}
        });
    },
    onShow() {
        if (this.openIdx>=0)this.springTo(1,'openAni',300);
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
        this.startRefresh();
    },
    onHide() {
        this.stopRefresh();
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus: false})
        };
    },
    onDestroy() {
        this.stopRefresh();
        clearInterval(timer_ani);
        clearTimeout(this.msg.timer);
        if (this.shearList.length) {
            File.writeText({
                uri:'internal://app/shear.json',
                text:JSON.stringify(this.shearList)
            })
        }
    },
    copyInfo(idx){
        this.shearList.unshift(this.list[idx].value);
        if (this.shearList.length>15) {
            this.shearList.length=15
        };
        this.sendMsg(this.list[idx].name+'已复制');
        vibrate()
    },
    sendMsg(msg,interval=1000){
        clearTimeout(this.msg.timer);
        this.msg.content=msg;
        this.msg.timer=setTimeout(this.closeMsg,interval)
    },
    closeMsg(){
        clearTimeout(this.msg.timer);
        this.msg.content='';
        this.msg.timer=null
    },
    // 实时刷新：时间/电量/亮度每秒，时间戳16ms
    startRefresh() {
        if (timer_refresh) {
            return;
        }
        this.refreshTimestamp();
        this.refreshInfo();
        timer_refresh = setInterval(() => {
            this.refreshInfo();
        }, 1000);
        timer_timestamp = setInterval(() => {
            this.refreshTimestamp();
        }, $app.getData().apiVersion>=12?32:100);
    },
    stopRefresh() {
        if (timer_refresh) {
            clearInterval(timer_refresh);
            timer_refresh = null;
        }
        if (timer_timestamp) {
            clearInterval(timer_timestamp);
            timer_timestamp = null;
        }
    },
    refreshTimestamp() {
        this.list[16].value = new Date().getTime() + '';
        Brightness.getValue({
            success: (data) => {
                this.list[14].value = Math.round(data.value / 255 * 100) + '%';
            },
            fail: () => {}
        });
        Brightness.getMode({
            success: (data) => {
                this.list[13].value = data.mode === 1 ? '自动' : '手动';
            },
            fail: () => {}
        });
    },
    refreshInfo() {
        const d = new Date();
        const p = (n) => n < 10 ? '0' + n : '' + n;
        this.list[15].value = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
            ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        Battery.getStatus({
            success: (data) => {
                this.list[11].value = Math.round(data.level * 100) + '%';
                this.list[12].value = data.charging ? '充电中' : '未充电';
            },
            fail: () => {}
        });
    },
    jumpToBench(){
        Router.replace({
            uri:'/pages/device/benchmark/benchmark'
        })
    },
    jumpToSensor(){
        Router.replace({
            uri:'/pages/device/sensor/sensor'
        })
    },
    close(e) {
        if (e.direction == 'right' || e.type == 'click') {
            Router.replace({
                uri: '/pages/index/index',
                params: {
                    openIdx: 1
                }
            })
        };
    },
    springTo(target, prop, time = 200, callback) {
        clearInterval(timer_ani);
        const startValue = this[prop];
        const delta = target - startValue;
        if (delta === 0) {
            callback?.();
            return;
        }
        const startTime = Date.now();
        const that = this;
        timer_ani = setInterval(() => {
            const progress = Math.min((Date.now() - startTime) / time, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            that[prop] = startValue + delta * eased;
            if (progress >= 1) {
                that[prop] = target;
                clearInterval(timer_ani);
                timer_ani=null;
                callback?.();
            }
        }, 33);
    },
    grabTouch(){}
}
