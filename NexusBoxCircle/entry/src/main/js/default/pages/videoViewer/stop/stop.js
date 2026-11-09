import Audio from '@system.audio';
import Router from '@system.router';
import Brightness from '@system.brightness';
import { getData, saveData } from '../../../common/storage';
let volumeSetTime=0, timer_volumeSet;
const now=Date.now();
export default {
    data: {
        target:0,
        //回传数据
        uri:'',
        realUri:'',
        frames:1,
        duration:1,
        interval:0,
        title:'',
        startTime:0,
        //设置数据
        setArr:[0,0,0],//播放进度，亮度，音量
        lightLock:false,//亮度锁定是否开启
        focusValue:0,
        autoPlay:false,
        showPopup:false,
    },
    onInit() {
        const elapsed=Math.max(0,Math.min(now-this.startTime,this.duration));
        const frame=Math.min(this.frames,Math.floor(elapsed/this.duration*this.frames)+1);
        const group=Math.floor((frame-1)/200);
        const frameInGroup=(frame-1)%200+1;
        this.realUri=this.uri+group+'/'+frameInGroup+'.bin';
        Brightness.getValue({success:(light)=>{
            this.setArr[1]=Math.round(light.value/255*100);
            getData('lightLock',(arr)=>{this.lightLock=!!arr[2]},[false,false,false]);
        }});
        this.setArr[0]=Math.round(elapsed/this.duration*100);
        //Audio.volume范围为0-1，内部setArr统一0-100，接口边界换算
        this.setArr[2]=Math.round(Audio.volume*100);
    },
    onShow(){
        getData('tips_video',(shown)=>{
            if (!shown) {
                this.showPopup=true;
            }else {
                this.bindCrown()
            }
        },false);
    },
    onHide(){
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation({focus:false})
        };
    },
    onDestroy(){
        if (this.lightLock) saveData('light',Math.round(this.setArr[1]));
        clearTimeout(timer_volumeSet);
    },
    confirmPopup(){
        this.showPopup=false;
        saveData('tips_video',true);
        this.bindCrown()
    },
    bindCrown(){
        if (this.target==0) {
            if (this.$refs.slider.rotation) {
                this.$refs.slider.rotation({focus:false})
            };
        }else {
            if (this.$refs.slider.rotation) {
                this.$refs.slider.rotation()
            };
        }
    },
    changTarget(){
        this.target=(this.target+1)%3;
        this.focusValue=this.setArr[this.target];
        this.bindCrown()
    },
    listenSlider(e){
        if (this.target==0)return;//播放进度条仅显示，不支持拖动跳转
        this.focusValue=e.value;
        if (this.target==1) {
            Brightness.setValue({
                value:Math.round(1+e.value*254/50),
                success:()=>Brightness.setMode({mode:0})
            });
            this.setArr[1]=e.value*2
        }else if (this.target==2) {
            this.setArr[2]=e.value*2;
            this.setVolume()
        }
    },
    setVolume(){
        const interval=200;
        const gap=Date.now()-volumeSetTime;
        const vol=this.setArr[2]/100;//0-100换算为0-1
        if (gap>interval) {
            Audio.volume=vol;
            volumeSetTime=Date.now()
        }else {
            clearTimeout(timer_volumeSet);
            timer_volumeSet=setTimeout(()=>{
                Audio.volume=vol;
                volumeSetTime=Date.now()
            },interval-gap)
        }
    },
    play(){
        const playTime=Date.now();
        if ((playTime-this.startTime)>=this.duration) {this.startTime=playTime;};
        Audio.loop = false;
        Audio.play();
        Router.replace({
            uri:'/pages/videoViewer/play/play',
            params:{
                uri:this.uri,
                duration:this.duration,
                frames:this.frames,
                interval:this.interval,
                startTime:this.startTime,
                lastTime:playTime,
                title:this.title,
                autoPlay:this.autoPlay
            }
        })
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            getData('video_brightness',(data)=>{
                if (data) {
                    Brightness.setValue({
                        value:data.light,
                        success:()=>{
                            if (data.mode==0) Brightness.setMode({mode:0});
                        }
                    });
                }
                Audio.stop();
                Router.replace({
                    uri:'/pages/cardList/cardList',
                    params:{
                        type:'video',
                        backRecord:true
                    }
                });
            },null);
        }
    },
    grabTouch(){}
}
