import Router from '@system.router';
import { getData, saveData } from '../../common/storage';
import Storage from '@system.storage';
import App from '@system.app';
import File from '@system.file';

let timer_ani;
let timer_msg=null;
let timer_clear=null;
export default {
    data: {
        font:$app.getData().font,
        openIdx:-1,
        openAni:0,
        keepScreen: false,//屏幕常亮
        vibrate: true,//震动反馈
        msg:{
            if:false,
            content:'',
        },
        item:0,
    },
    onInit() {
        //开页面读取各设置
        getData('keepScreen',(v)=>{this.keepScreen=!!v},true);
        getData('vibrate',(v)=>{this.vibrate=!!v},true);
    },
    onShow(){
        if (this.openIdx>=0)this.springTo(1,'openAni',300);
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
        if (this.item) {
            this.$refs.list.scrollTo({
                index:this.item
            })
        }
    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onDestroy(){
        clearTimeout(timer_msg);
        this.saveSettings();
        clearInterval(timer_ani);
    },
    onKeepScreen(e){
        this.keepScreen=e.checked;
    },
    onVibrate(e){
        this.vibrate=e.checked;
    },
    saveSettings(){
        saveData('keepScreen', this.keepScreen);
        saveData('vibrate', this.vibrate);
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/index/index',
                params:{
                    openIdx:9
                }
            })
        };
    },
    setVolume(){
        Router.replace({
            uri:'/pages/setting/adjust/adjust',
            params:{
                target:'volume'
            }
        })
    },
    setLight(){
        Router.replace({
            uri:'/pages/setting/screenSetting/screenSetting',
        })
    },
    setFile(){
        Router.replace({
            uri:'/pages/setting/fileSetting/fileSetting',
        })
    },
    setReader(){
        Router.replace({
            uri:'/pages/setting/readSetting/readSetting',
        })
    },
    setImage(){
        Router.replace({
            uri:'/pages/setting/imageSetting/imageSetting',
        })
    },
    setVideo(){
        Router.replace({
            uri:'/pages/setting/videoSetting/videoSetting',
        })
    },
    setScript(){
        Router.replace({
            uri:'/pages/setting/scriptSetting/scriptSetting',
        })
    },
    tips(){
        Router.replace({
            uri:'/pages/setting/tips/tips'
        })
    },
    about(){
        Router.replace({
            uri:'/pages/about/about'
        })
    },
    keyboardAbout(){
        Router.replace({
            uri:'/pages/setting/keyboard/keyboard'
        })
    },
    clear(){
        let n=5
        clearInterval(timer_clear);
        this.sendMsg(`${n--}s后清除数据，点此取消`);
        timer_clear=setInterval(()=>{
            if (n) {
                this.sendMsg(`${n--}s后清除数据，点此取消`);
            }else {
                Storage.delete({
                    key:'welcome'
                });
                this.closeMsg();
                App.terminate()
            }
        },1000)
    },
    clearWallpaper(){
        let n=5
        clearInterval(timer_clear);
        this.sendMsg(`${n--}s后重置壁纸，点此取消`);
        timer_clear=setInterval(()=>{
            if (n) {
                this.sendMsg(`${n--}s后重置壁纸，点此取消`);
            }else {
                clearInterval(timer_clear);
                File.delete({
                    uri:'internal://app/card2.bin',
                    complete:()=>{
                        this.close()
                    }
                })
            }
        },1000)
    },
    sendMsg(msg,interval=1500){
        clearTimeout(timer_msg);
        this.msg.if=true;
        this.msg.content=msg;
        timer_msg=setTimeout(()=>{this.msg.if=false},interval)
    },
    closeMsg(){
        clearTimeout(timer_msg);
        clearInterval(timer_clear);
        this.msg.if=false;
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
