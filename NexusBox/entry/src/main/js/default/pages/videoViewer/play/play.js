import Router from '@system.router'
import Audio from '@system.audio'
const now=Date.now();
export default {
    data: {
        uri:'',
        realUri:'',
        frames:0,
        interval:0,
        duration:0,
        startTime:0,
        lastTime:0,
        title:'',
        autoPlay:false,
        stop:false,
    },
    onInit(){
        const elapsed=Math.max(0,now-this.startTime);
        const frame=Math.min(this.frames,Math.floor((elapsed%this.duration)/this.duration*this.frames)+1);
        const group=Math.floor((frame-1)/200);
        const frameInGroup=(frame-1)%200+1;
        this.realUri=this.uri+group+'/'+frameInGroup+'.bin';
    },
    onShow(){
        if (this.stop||(!this.autoPlay&&(now-this.startTime)>=this.duration)){
            Audio.pause();
            if ((!this.autoPlay&&(now-this.startTime)>=this.duration))Audio.stop();
            Router.replace({
                uri:'/pages/videoViewer/stop/stop',
                params:{
                    uri:this.uri,
                    frames:this.frames,
                    duration:this.duration,
                    interval:this.interval,
                    title:this.title,
                    autoPlay:this.autoPlay,
                    startTime:this.startTime,
                }
            })
        }else {
            setTimeout(()=>{
                if (this.autoPlay&&(now-this.startTime)>=this.duration) {
                    Audio.stop();
                    Audio.play();
                    this.startTime=now;
                };
                Router.replace({
                    uri:'/pages/videoViewer/play/play',
                    params:{
                        uri:this.uri,
                        frames:this.frames,
                        interval:this.interval,
                        duration:this.duration,
                        title:this.title,
                        autoPlay:this.autoPlay,
                        startTime:this.startTime,
                        lastTime:now,
                        stop:this.stop,
                    }
                })
            },Math.max(0,this.interval-now+this.lastTime))
        }
    },
    stopDisplay(){
        this.stop=true;
    }
}
