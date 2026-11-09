import Audio from '@system.audio'
import Router from '@system.router';
import Brightness from '@system.brightness';
import { getData, saveData } from '../../../common/storage';
let volumeSetTime=0;
let timer_volumeSet;
let oriMode=0;
let oriLight=0;
export default {
    data: {
        font:$app.getData().font,
        value:50,
        target:'volume',//volume||light
    },
    onInit() {
        if (this.target=='volume') {
            this.value=Math.round(Audio.volume*100);
        }else {
            Brightness.getMode({
                success:(data)=>oriMode=data.mode
            })
            Brightness.getValue({success:(light)=>{
                oriLight=light.value;
                getData('light',(v)=>{
                    this.value=v;
                    this.applyValue()
                },50);
            }});
        }
    },
    onShow(){
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation()
        }
    },
    onHide(){
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation({focus:false})
        }
    },
    onDestroy(){
        clearTimeout(timer_volumeSet);
        if (this.target=='light') {
            Brightness.setValue({
                value:oriLight,
                success:()=>{
                    if (oriMode==0) Brightness.setMode({mode:0});
                }
            });
            saveData('light',this.value)
        }
    },
    touchStart(e){
        this.moveSlider(e)
    },
    touchMove(e){
        this.moveSlider(e)
    },
    touchEnd(e){
        this.moveSlider(e)
        if (this.target=='volume') {
            this.setVolume()
        }
    },
    listenSlider(e){
        this.value=e.value*5;
        this.applyValue()
    },
    moveSlider(e){
        this.value=Math.max(0,Math.min(100,Math.round((451-e.globalY)/346*100)));
        this.applyValue()
    },
    applyValue(){
        if (this.target=='light') {
            Brightness.setValue({
                value:Math.round(1+this.value*254/100),
                success:()=>{
                    Brightness.setMode({
                        mode:0,
                    })
                }
            })
        }else {
            this.setVolume()
        }
    },
    setVolume(){
        const interval=200;
        const gap=Date.now()-volumeSetTime;
        const volume=this.value/100;
        if (gap>=interval) {
            Audio.volume=volume;
            volumeSetTime=Date.now()
        }else {
            clearTimeout(timer_volumeSet);
            timer_volumeSet=setTimeout(()=>{
                Audio.volume=volume;
                volumeSetTime=Date.now()
            },interval-gap)
        }
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            if (this.target=='light') {
                Router.replace({
                    uri:'/pages/setting/screenSetting/screenSetting'
                })
            }else {
                Router.replace({
                    uri:'/pages/setting/setting',
                    params:{
                        item:2
                    }
                })
            }
        }
    }
}
