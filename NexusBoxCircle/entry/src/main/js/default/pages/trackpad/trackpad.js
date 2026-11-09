import Router from '@system.router';
import { P2pClient, Message ,PeerDeviceClient} from '../../common/wearengine';
let p2p=new P2pClient();
let peerDeviceClient = new PeerDeviceClient();
let timer_alert;
let timer_ani,timer_ping;
let deviceType=0;
let touching=false;
export default {
    data: {
        font:$app.getData().font,
        openIdx:-1,
        openAni:0,
        allowAlert:true,
        alertY:45,
        connected:true,
    },
    onInit() {
        this.subscribeConnect();
        timer_ping=setInterval(()=>this.subscribeConnect(),5000);
    },
    subscribeConnect(){
        peerDeviceClient.getPeerDevice({
            onSuccess:(data)=>{
                const type=data.peerDevice.mOsType;
                this.connected=(type==1||type==3);
                if (deviceType!=type) {
                    deviceType=type;
                    switch (deviceType){
                        case 1:
                            p2p.setPeerPkgName("");
                            p2p.setPeerFingerPrint("");
                            break
                        case 2:
                            break
                        case 3:
                            p2p.setPeerPkgName("");
                            p2p.setPeerFingerPrint("");
                            break
                    }
                }
            },
            onFailure:()=>{
                this.connected=false
            },
        });
    },
    onShow(){
        if (this.openIdx>=0)this.springTo(1,'openAni',300);
        timer_alert=setTimeout(()=>this.closeAlert(),4000)
    },
    onDestroy(){
        clearTimeout(timer_alert);
        clearInterval(timer_ani);
        clearInterval(timer_ping);
    },
    clickTools(e){
        clearTimeout(timer_alert);
        timer_alert=setTimeout(()=>this.closeAlert(),2000);
        if (e.globalX>283) {
            this.sendMessage('controlHome');
        }else if (e.globalX>183){
            this.sendMessage('controlBack');
        }else {
            this.close()
        }
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/index/index',
                params:{
                    openIdx:8
                }
            })
        };
    },
    closeAlert(){
        this.allowAlert=false;
        this.springTo(-90,'alertY')
    },
    action(type,e){
        if (type=='touchstart'&&e.globalY<=70&&e.direction=="down") {
            clearTimeout(timer_alert);
            touching=true;
            timer_alert=setTimeout(()=>this.closeAlert(),2000)
            if (!timer_ani){
                if (this.allowAlert) {
                    this.allowAlert=false;
                    this.springTo(45,'alertY')
                    return;
                }else {
                    this.allowAlert=true;
                };
            }
        }else if (this.alertY!=-90){
            if (!touching) {
                this.closeAlert()
            }else if(type=='touchend')touching=false;
            return;
        };
        if (type=='touchend'&&touching) {
            touching=false;
        };
        this.sendMessage('touchEvent',{
            event:type,
            x:e.globalX,
            y:e.globalY,
            width:408,
            height:480
        })
    },
    sendMessage(event,content){
        const time=Date.now();
        let obj={
            event:event,
            time:time,
            content:content
        };
        let message=new Message();
        message.builder.setDescription(JSON.stringify(obj));
        p2p.send(message,{
            onSuccess:()=>{
                console.log(`消息${event}发送成功,时间${String(time)}`)
            },
            onFailure:()=>{
                console.log(`消息${event}发送失败,时间${String(time)}`)
            },
            onSendResult: function(resultCode) {
                // send任务执行结束后返回的错误码和信息进行处理
                console.log(resultCode.data + resultCode.code);
            }
        });
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
