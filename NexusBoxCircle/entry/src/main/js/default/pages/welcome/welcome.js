import Router from '@system.router';
import File from '@system.file';
import { getData, saveData } from '../../common/storage';
import { tutorialText } from '../../common/scriptDoc';
import App from '@system.app';
let timer_ani;
let timer_loop;
let timer_enter;
export default {
    data: {
        font:$app.getData().font,
        arrowX:0,
        c1:{
            x:-400,//340大圆：初始完全屏外（左下）
            y:660,
        },
        c2:{
            x:660,//260小圆：初始完全屏外（右上）
            y:-300,
        },
        privacyIcon:1,
        privacyAni:0,
    },
    onShow(){
        setTimeout(()=>{
            this.springTo(0,'privacyIcon',400,()=>{
                this.springTo(1,'privacyAni',300,()=>{
                    if (this.$refs.list.rotation) {
                        this.$refs.list.rotation()
                    };
                })
            })
        },100);

    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus: false})
        };
        this.stopLoop();
    },
    onDestroy(){
        clearInterval(timer_ani);
        clearInterval(timer_enter);
        this.stopLoop();
    },
    //循环动画：两圆沿椭圆轨迹反向漂移，持续运动（波纹呼吸感）
    startLoop(){
        this.stopLoop();
        const that=this;
        let t=0;
        timer_loop=setInterval(()=>{
            t+=0.08;
            //大圆：正圆轨迹中速（sin/cos同频，周期约3.9s），基准y=222使t=0与入场终点(240)衔接
            that.c1.x=-131+18*Math.sin(t);
            that.c1.y=222+18*Math.cos(t);
            //小圆：横椭圆，节奏与大圆错开但不过快（t=0起点=入场终点，无缝衔接）
            that.c2.x=229+20*Math.sin(t*1.3);
            that.c2.y=-50+7*Math.sin(t*0.9);
        },50);
    },
    stopLoop(){
        if (timer_loop) {
            clearInterval(timer_loop);
            timer_loop=null;
        }
    },
    start(){
        this.springTo(2,'arrowX',800,()=>{
            this.seedTutorial(()=>{
                saveData('welcome',true);
                Router.replace({
                    uri:'/pages/index/index',
                    params:{
                        showAni:true
                    }
                })
            })
        })
    },
    seedTutorial(callback){
        File.get({
            uri:'internal://app/scriptList.json',
            success:()=>callback?.(),
            fail:()=>{
                File.mkdir({
                    uri:'internal://app/script',
                    recursive:true,
                    success:()=>{
                        File.writeText({
                            uri:'internal://app/script/0.js',
                            text:tutorialText,
                            success:()=>{
                                File.writeText({
                                    uri:'internal://app/scriptList.json',
                                    text:',[0,"\\u5c0f\\u7a0b\\u5e8f\\u5f00\\u53d1\\u6587\\u6863"]',
                                    success:()=>{
                                        callback?.();
                                        getData('fileNum',(arr)=>{
                                            arr[3]=(arr[3]||0)+1;
                                            saveData('fileNum',arr);
                                        },[0,0,0,0,0]);
                                    },
                                    fail:()=>callback?.()
                                })
                            },
                            fail:()=>callback?.()
                        })
                    },
                    fail:()=>callback?.()
                })
            }
        })
    },
    //入场动画：两圆从屏幕外进入目标位置，完成后回调启动循环动画
    enterCircles(){
        clearInterval(timer_enter);
        const f1x=-271, f1y=330;//大圆起始：更左下（屏外）
        const f2x=349, f2y=-160;//小圆起始：更右上（屏外）
        const dur=700;
        const t0=Date.now();
        const that=this;
        const anim=()=>{
            const p=Math.min((Date.now()-t0)/dur,1);
            const e=1-Math.pow(1-p,3);
            that.c1.x=f1x+(-131-f1x)*e;
            that.c1.y=f1y+(240-f1y)*e;
            that.c2.x=f2x+(229-f2x)*e;
            that.c2.y=f2y+(-50-f2y)*e;
            if (p>=1) {
                //终点=循环t=0位置，衔接无跳变
                that.c1.x=-131;
                that.c1.y=240;
                that.c2.x=229;
                that.c2.y=-50;
                clearInterval(timer_enter);
                that.startLoop();//入场完成：启动循环动画
            }
        };
        anim();
        timer_enter=setInterval(anim,33);
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
                callback?.();
            }
        }, 33);
    },
    confirm(){
        this.springTo(1,'arrowX',1200);
        this.enterCircles();
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus: false})
        };
    },
    refuse(e={type:'click'}){
        if (e.type=='click'||e.direction=='right') {
            App.terminate()
        }
    },
    grabTouch(){}
}
