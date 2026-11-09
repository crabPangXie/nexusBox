import Router from '@system.router';
import { P2pClient, Message ,PeerDeviceClient} from '../../common/wearengine';
import File from '@system.file';
let p2p=new P2pClient();
let peerDeviceClient = new PeerDeviceClient();
let timer_alert,timer_fresh,timer_ani,timer_ping;
let touching=false;
let deviceType=0;
export default {
    data: {
        font:$app.getData().font,
        openIdx:-1,
        openAni:0,
        display:false,
        ready:false,
        allowAlert:true,
        alertY:18,
        msg:{
            content:'',
            timer:null
        },
        connected:true
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
                    p2p.unregisterReceiver({onSuccess:()=>{}, onFailure:()=>{}});
                    switch (deviceType){
                        case 1:
                            p2p.setPeerPkgName("");
                            p2p.setPeerFingerPrint("");
                            this.registerReceiver()
                            break
                        case 2:
                            this.sendMsg('暂不支持IOS设备使用')
                            break
                        case 3:
                            p2p.setPeerPkgName("");
                            p2p.setPeerFingerPrint("");
                            this.registerReceiver()
                            break
                    }
                }
            },
            onFailure:()=>{
                this.connected=false
            },
        });
    },
    registerReceiver(){
        p2p.registerReceiver({
            onSuccess:()=>console.log('接收器已注册'),
            onFailure:()=>console.log('接收器注册失败'),
            onReceiveMessage: (data)=>{
                if (data && data.isFileType) {
                    //data.name为internal://app/文件名
                    // 处理手机侧应用发过来的文件
                    const name=data.name.slice(data.name.lastIndexOf('/')+1);
                    if (name=='phone.png') {
                        this.ready=true;
                        if (!timer_ani) {
                            clearTimeout(timer_fresh);
                            this.display=false;
                            timer_fresh=setTimeout(()=>{
                                this.display=true
                            },25)
                        }
                    }else {
                        this.sendMessage('handleFileFailed');
                        File.delete({
                            uri:data.name,
                            success:()=>{
                                Router.replace({
                                    uri:'/pages/index/index'
                                })
                            }
                        })
                    }
                }
            },
        });
    },
    onShow(){
        if (this.openIdx>=0)this.springTo(1,'openAni',300);
        timer_alert=setTimeout(()=>this.closeAlert(),4000)
    },
    onDestroy(){
        clearTimeout(timer_fresh);
        clearTimeout(timer_alert);
        clearTimeout(this.msg.timer);
        clearInterval(timer_ani);
        clearInterval(timer_ping);
        p2p.unregisterReceiver({
            onSuccess:()=>{}, onFailure:()=>{}
        });
        File.delete({
            uri:'internal://app/phone.png'
        })
    },
    closeAlert(){
        this.allowAlert=false;
        this.springTo(-90,'alertY')
    },
    clickTools(e){
        clearTimeout(timer_alert);
        timer_alert=setTimeout(()=>this.closeAlert(),2000);
        if (e.globalX>260) {
            this.sendMessage('controlHome');
        }else if (e.globalX>147){
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
                    openIdx:7
                }
            })
        };
    },
    action(type,e){
        if (type=='touchstart'&&e.globalY<=70&&e.direction=="down") {
            clearTimeout(timer_alert);
            touching=true;
            timer_alert=setTimeout(()=>this.closeAlert(),2000)
            if (!timer_ani){
                if (this.allowAlert) {
                    this.allowAlert=false;
                    this.springTo(18,'alertY')
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
    //移动动画
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
