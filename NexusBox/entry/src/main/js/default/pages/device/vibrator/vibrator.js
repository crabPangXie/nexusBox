import Router from '@system.router';
import Vibrator from '@system.vibrator';
import { vibrate } from '../../../common/vibrate';

let timer_pulse;
let timer_ani;
let timer_operate;
let startTime=0;
let shakeStart=-1000;
let pulsed=0;
let generation=0;

function formatInterval(interval){
    return interval>=1000?(interval/1000).toFixed(1)+'s':interval+'ms';
}

export default {
    data: {
        font:$app.getData().font,
        running:false,
        interval:1000,
        intervalText:'1.0s',
        duration:10,
        count:0,
        shakeX:0,
        shakeY:0,
        pageIndex:0
    },
    onShow(){
        this.focusPage();
    },
    onHide(){
        this.stop();
        this.releaseFocus();
    },
    onDestroy(){
        this.stop();
    },
    toggle(){
        if (this.running) {
            this.stop();
            return;
        }
        this.running=true;
        pulsed=0;
        startTime=Date.now();
        const current=++generation;
        timer_pulse=setInterval(()=>this.pulse(current),this.interval);
        timer_ani=setInterval(()=>this.animateShake(),33);
        this.pulse(current);
    },
    pulse(current){
        if (!this.running||current!==generation) return;
        if (this.duration>0&&Date.now()-startTime>=this.duration*1000) {
            this.stop();
            return;
        }
        try {
            Vibrator.vibrate({
                mode:'short'
            });
        } catch (e) {
            this.stop();
            return;
        }
        pulsed++;
        this.shake();
        if (this.count>0&&pulsed>=this.count) {
            this.stop();
        }
    },
    shake(){
        if (Date.now()-shakeStart>=128) {
            shakeStart=Date.now();
            this.shakeX=0;
            this.shakeY=0;
        }
    },
    animateShake(){
        const elapsed=Date.now()-shakeStart;
        if (elapsed>=128) {
            if (this.shakeX!==0||this.shakeY!==0) {
                this.shakeX=0;
                this.shakeY=0;
            }
            return;
        }
        const progress=elapsed/128;
        const envelope=(1-progress)*(1-progress);
        this.shakeX=Math.sin(progress*Math.PI*4)*envelope*28;
        this.shakeY=Math.sin(progress*Math.PI*3)*envelope*20;
    },
    stop(){
        generation++;
        clearInterval(timer_pulse);
        clearInterval(timer_ani);
        clearInterval(timer_operate);
        timer_pulse=null;
        timer_ani=null;
        timer_operate=null;
        this.running=false;
        this.shakeX=0;
        this.shakeY=0;
    },
    changeCount(step){
        this.stop();
        this.duration=0;
        this.count=Math.max(0,this.count+step);
    },
    pressCount(step){
        this.stop();
        vibrate();
        this.duration=0;
        timer_operate=setInterval(()=>{
            this.count=Math.max(0,this.count+step);
        },20);
    },
    intervalStep(){
        if (this.interval<10) return 1;
        if (this.interval<50) return 10;
        if (this.interval<=1000) return 50;
        return 500;
    },
    stepInterval(direction){
        if (direction>0) {
            this.interval=this.interval===1000?1500:this.interval+this.intervalStep();
        } else if (this.interval>1000) this.interval-=500;
        else if (this.interval>50) this.interval-=50;
        else if (this.interval>10) this.interval-=10;
        else if (this.interval>1) this.interval-=1;
        this.intervalText=formatInterval(this.interval);
    },
    changeInterval(direction){
        this.stop();
        this.stepInterval(direction);
    },
    pressInterval(direction){
        this.stop();
        vibrate();
        timer_operate=setInterval(()=>{
            this.stepInterval(direction);
        },20);
    },
    changeDuration(step){
        this.stop();
        this.count=0;
        this.duration=Math.max(0,this.duration+step);
    },
    pressDuration(step){
        this.stop();
        vibrate();
        this.count=0;
        timer_operate=setInterval(()=>{
            this.duration=Math.max(0,this.duration+step);
        },20);
    },
    operateRelease(){
        clearInterval(timer_operate);
        timer_operate=null;
    },
    listenSwiper(e){
        this.pageIndex=e.index;
        this.releaseFocus();
        this.focusPage();
    },
    focusPage(){
        const target=this.pageIndex===0?this.$refs.swiper:this.$refs.list;
        if (target&&target.rotation) target.rotation();
    },
    releaseFocus(){
        if (this.$refs.swiper&&this.$refs.swiper.rotation) {
            this.$refs.swiper.rotation({focus:false});
        }
        if (this.$refs.list&&this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false});
        }
    },
    turnPage(){
        if (this.$refs.swiper&&this.$refs.swiper.swipeTo) {
            this.$refs.swiper.swipeTo({index:0});
        }
    },
    close(e){
        if (e.direction==='right'||e.type==='click') {
            this.stop();
            Router.replace({uri:'/pages/device/index/index'});
        }
    }
};
