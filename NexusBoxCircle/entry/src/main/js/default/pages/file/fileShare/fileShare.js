import File from '@system.file';
import { P2pClient, Message ,PeerDeviceClient} from '../../../common/wearengine';
import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';
import { vibrate } from '../../../common/vibrate';
let p2p=new P2pClient();
let peerDeviceClient = new PeerDeviceClient();
let startArr=[0];
let timer_operate;
let hasReminded=false;
let timer_ping;
let deviceType=0;
let hasInformed=false;
export default {
    data: {
        font:$app.getData().font,
        backPage:'/pages/file/fileList/fileList',
        uri:'',
        title:'',
        auto:false,
        start:0,
        length:256,
        idx:0,
        totalLength:0,

        progress:0,
        text:'',
        height:0,

        msg:{
            content:'',
            timer:null
        }
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:this.backPage,
                params:{
                    backKey:true
                }
            })
        }
    },
    onInit() {
        getData('share_auto',(data)=>this.auto=data,true);
        if (!this.title) {
            this.title=this.uri.slice(Math.max(this.uri.lastIndexOf('/'),this.uri.lastIndexOf('\\'))+1);
        }
        File.get({
            uri:this.uri,
            success:(data)=>{
                this.totalLength=data.length;
                this.read();
            }
        });
        this.subscribeConnect();
        timer_ping=setInterval(()=>this.subscribeConnect(),5000);
    },
    subscribeConnect(){
        peerDeviceClient.getPeerDevice({
            onSuccess:(data)=>{
                hasInformed=false;
                if (deviceType!=data.peerDevice.mOsType) {
                    deviceType=data.peerDevice.mOsType;
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
                if (!hasInformed) {
                    hasInformed=true;
                    this.sendMsg('未连接设备',3000)
                }
            },
        });
    },
    registerReceiver(){
        p2p.registerReceiver({
            onSuccess:()=>console.log('接收器已注册'),
            onFailure:()=>console.log('接收器注册失败'),
            onReceiveMessage: (data)=>{
                if (data && data.isFileType) {
                    this.sendMessage('handleFileFailed');
                    File.delete({
                        uri:data.name,
                        success:()=>{
                            Router.replace({
                                uri:'/pages/index/index'
                            })
                        }
                    })
                }else{
                    const info=JSON.parse(data);
                    if (info.event=='scanContinue') {
                        if (this.auto)this.more()
                        else if (!hasReminded) {
                            this.sendMsg('请先开启闪传模式');
                            hasReminded=true;
                        }
                    }
                }
            },
        });
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
    onDestroy(){
        clearInterval(timer_operate);
        clearInterval(timer_ping);
        clearTimeout(this.msg.timer);
        saveData('share_auto',this.auto);
        p2p.unregisterReceiver({
            onSuccess:()=>{}, onFailure:()=>{}
        });
    },
    onShow(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    less(){
        if (this.idx>0) {
            this.idx--;
            this.read()
        }
    },
    more(){
        const next=startArr[this.idx+1];
        if (next===undefined) return;           // 读取中，忽略本条，等read完成
        if (next>=this.totalLength) {
            this.sendMessage('scanFinished');   // 真末页才通知
            return;
        };
        this.idx++;
        this.read()
    },
    changeStart(value){
        clearInterval(timer_operate);
        switch (value){
            case 'add':
                this.start=Math.min(this.start+1,Math.max(0,this.totalLength-1));
                break
            case 'reduce':
                this.start=Math.max(this.start-1,0);
                break
        };
        this.reset()
    },
    changeLength(value){
        clearInterval(timer_operate);
        switch (value){
            case 'add':
                this.length=Math.min(this.length+1,256);
                break
            case 'reduce':
                this.length=Math.max(this.length-1,0);
                break
        };
        this.reset()
    },
    pressStart(value){
        clearInterval(timer_operate);
        switch (value){
            case 'add':
                timer_operate=setInterval(()=>{
                    this.start=Math.min(this.start+1,Math.max(0,this.totalLength-1));
                },20)
                break
            case 'reduce':
                timer_operate=setInterval(()=>{
                    this.start=Math.max(this.start-1,0);
                },20)
                break
        };
        vibrate()
    },
    pressLength(value){
        clearInterval(timer_operate);
        switch (value){
            case 'add':
                timer_operate=setInterval(()=>{
                    this.length=Math.min(this.length+1,256);
                },20)
                break
            case 'reduce':
                timer_operate=setInterval(()=>{
                    this.length=Math.max(this.length-1,0);
                },20)
                break
        };
        vibrate()
    },
    operateRelease(){
        clearInterval(timer_operate);
        this.reset();
    },
    reset(){
        startArr=[this.start];
        this.idx=0;
        this.read();
    },
    changeAuto(){
        this.auto=!this.auto;
        if (this.auto)this.sendMsg('闪传模式已开启')
        else this.sendMsg('闪传模式已关闭')
    },
    read(){
        const pos=startArr[this.idx];
        if (pos===undefined) return;
        File.readText({
            uri:this.uri,
            position:pos,
            length:this.length,
            success:(data)=>{
                this.probeEnd(pos,data.text,(text,start)=>{
                    startArr[this.idx+1]=Math.min(start,this.totalLength);
                    this.text=text;
                    this.progress=Math.round(Math.min(start/this.totalLength,1)*100);
                    this.height=this.countLines(text)*30+70;
                })
            }
        })
    },
    //UTF-8末尾边界探测：读length字节后末尾截断3字节字符时退让，fn(有效text,下页起始位置)
    probeEnd(pos, text, fn){
        File.readText({
            uri:this.uri,
            position:pos+this.length,
            length:1,
            success:(data)=>{
                const code=data.text.charCodeAt(0);
                if (code>=0x80&&code<=0xBF) {
                    File.readText({
                        uri:this.uri,
                        position:pos+this.length-1,
                        length:1,
                        success:(data)=>{
                            const c=data.text.charCodeAt(0);
                            if (c>=0x80&&c<=0xBF) {
                                fn(text.slice(0,-1),pos+this.length-2)
                            }else {
                                fn(text.slice(0,-1),pos+this.length-1)
                            }
                        },
                        fail:()=>fn(text,pos+this.length)
                    });
                }else {
                    fn(text,pos+this.length)
                }
            },
            fail:()=>fn(text,pos+this.length)
        });
    },
    countLines(text){
        let lines=[''];
        let lineWidth=0;
        let i=0;
        while(i<text.length){
            const ch=text[i];
            if(ch=='\t'){
                i++;
                continue
            };
            if(ch=='\r'||ch=='\n'){
                lines.push('');
                lineWidth=0;
                i++;
                continue
            };
            const charWidth=Math.ceil(getFontWidth(ch)*24-1e-6)/24;
            if(lineWidth+charWidth>340/24){
                lines.push('');
                lineWidth=0;
                continue//重新处理当前字符
            };
            lineWidth+=charWidth;
            i++;
        };
        return lines.length;
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
};
var W=[
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0.27,32/128,48/128,20/30,74/128,24/30,22/30,26/128,11/30,11/30,57/128,0.57,8/30,15/30,31/128,52/128,
    147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,8/30,35/128,74/128,74/128,74/128,58/128,
    126/128,21/30,20/30,20/30,22/30,77/128,73/128,91/128,23/30,35/128,62/128,90/128,73/128,111/128,96/128,99/128,
    78/128,99/128,20/30,74/128,75/128,95/128,87/128,126/128,87/128,82/128,75/128,11/30,52/128,11/30,15/30,56/128,
    41/128,17/30,79/128,64/128,79/128,17/30,11/30,79/128,18/30,8/30,8/30,70/128,8/30,26/30,18/30,18/30,
    79/128,79/128,12/30,14/30,12/30,18/30,16/30,24/30,66/128,69/128,61/128,49/128,26/128,49/128,74/128,0
];
W[0xB7]=15/30;
W[0xB1]=17/30;W[0xD7]=17/30;W[0xF7]=17/30;
W[0x3C0]=18/30;
W[0x2018]=41/128;W[0x2019]=41/128;W[0x201C]=15/30;W[0x201D]=15/30;
W[0x2014]=1;W[0x2026]=1;W[0x3001]=1;W[0x3002]=1;
W[0x300A]=1;W[0x300B]=1;W[0x3010]=1;W[0x3011]=1;
W[0x221A]=22/30;W[0x221E]=1;
W[0x2248]=17/30;W[0x2260]=17/30;W[0x2264]=17/30;W[0x2265]=17/30;
W[0x2211]=17/30;
W[0xFF01]=1;W[0xFF08]=1;W[0xFF09]=1;W[0xFF0C]=1;
W[0xFF1A]=1;W[0xFF1B]=1;W[0xFF1F]=1;W[0xFFE5]=1;
function getFontWidth(w){
    const cw=W[w.charCodeAt(0)];
    return cw!==undefined?Math.ceil(cw*24-1e-6)/24:1;
};
