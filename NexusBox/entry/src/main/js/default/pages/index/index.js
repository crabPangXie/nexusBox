import App from '@system.app';
import Router from '@system.router';
import File from '@system.file';
import Brightness from '@system.brightness';
import { P2pClient, Message , PeerDeviceClient} from '../../common/wearengine';
import { getData, saveData } from '../../common/storage';
const pageList=['file/index/index','device/index/index','text','image','video','script','note','screenCast/screenCast','trackpad/trackpad','setting/setting'];
let peerDeviceClient = new PeerDeviceClient();
let p2p=new P2pClient();

let oriX=0;//上一采样点x坐标
let oriY=0;//上一采样点y坐标
let disArr=[];//纵向滑动的帧间位移增量（unshift头插，最多保留3个，抬手时据此求惯性速度）
let timeArr=[];//触摸事件时间戳（unshift头插，最多保留4个=3段位移的耗时，与disArr配对求速度）
let moveType=0;//1滑动列表，2左右换页，3右滑退出（touchStart按e.direction判定；纵向仅在offsetX==0时允许）

let timer_ani,timer_focus,timer_ping,timer_file;

const escapeUnicode=(str)=>{
    let escaped="";
    for(let i=0;i<str.length;i++){
        const code=str.charCodeAt(i);
        if(code>127){
            const hex=code.toString(16);
            let padded="";
            for(let p=hex.length;p<4;p++)padded+="0";
            escaped+="\\u"+padded+hex;
        }else if(code==34||code==92){
            escaped+="\\"+str[i];
        }else{
            escaped+=str[i];
        }
    };
    return escaped;
};
let deviceType=0;
let fileNum=[0,0,0,0,0];//[text,image,video,script,note]
let filePos={text:0,image:1,video:2,script:3,note:4};

export default {
    data: {
        width:$app.getData().windowWidth,
        height:$app.getData().windowHeight,
        offsetX:0,
        offsetY:0,
        wallpaper:'internal://app/',
        focusValue:50,

        connect:false,
        fileName:'',
        fileAni:0,//文件传输动画
        fileDisappear:false,
        showAni:false,//初始化界面进入时动画
        openAni:1,//页面打开/关闭动画
        openIdx:-1,
        startAni:1,//启动动画
        exitAni:0,
        exitLength:250,//退出需要滑动的距离

        msg:{
            content:'',
            timer:null
        }
    },

    onInit(){
        if (this.openIdx<0) {
            this.openAni = 0;
        }else {
            this.startAni=0;
        };
        //获取文件数目
        getData('fileNum',(arr)=>{fileNum=arr},[0,0,0,0,0]);
        this.subscribeConnect();
        timer_ping=setInterval(()=>this.subscribeConnect(),5000);
        this.checkWallpaper();
    },
    onShow(){
        if (this.openIdx>=0) {
            getData('index',(y)=>{
                this.offsetY=y;
                setTimeout(()=>{this.springTo(0,'openAni',400)},100)
            })
        }else if (!this.showAni){
            this.springTo(0,'startAni',600)
        }else {
            this.springTo(0,'startAni',800)
        }
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onDestroy(){
        this.clearAni();
        clearTimeout(this.msg.timer);
        clearInterval(timer_ping);
        clearTimeout(timer_focus);
        clearTimeout(timer_file);
        p2p.unregisterReceiver({
            onSuccess:()=>{}, onFailure:()=>{}
        });
        saveData('fileNum',fileNum);
    },
    checkWallpaper(){
        File.access({
            uri:'internal://app/card2.bin',
            success:()=>this.wallpaper='internal://app/',
            fail:()=>this.wallpaper='/common/wallpaper/'
        })
    },
    displayFileAni(){
        clearTimeout(timer_file);
        this.springTo(1, 'fileAni', 1000, () => {
            timer_file=setTimeout(()=>{
                this.fileDisappear=true;
                this.springTo(0,'fileAni',400,()=>{
                    this.fileAni=0;
                    this.fileName='';
                    this.fileDisappear=false;
                })
            },400)
        })
    },
    handleFile(uri,arr,twice){
        //arr=[group,idx,name]或[group,idx]
        if (!twice) {
            this.fileAni=0;
            this.fileName=arr[arr.length-1];
            this.fileDisappear=false;
            if(this.offsetX!=-this.width)this.offsetX=-this.width;
            this.displayFileAni()
        };
        const move=()=>{
            if (arr.length>2&&arr[2].indexOf('.')==-1) {//视频、文本分页文件单独处理
                const group=Math.floor((arr[2]*1-1)/200);
                const idx=arr[2]*1-group*200;
                File.move({
                    srcUri:uri,
                    dstUri:`internal://app/${arr[0]}/${arr[1]}/${group}/${idx}${arr[0]=='video'?'.bin':''}`,
                });
                return
            };
            File.move({
                srcUri:uri,
                dstUri:'internal://app/'+arr[0]+'/'+arr[1]+(arr.length>2?'/'+arr[2]:''),
            })
        };
        File.access({
            uri:`internal://app/${arr[0]}/${arr.length>2?arr[1]:''}`,
            success:()=>move(),
            fail:()=> {
                const idx=String(arr[1]).split('.')[0]
                const info={
                    type:arr[0]=='music'?'video':arr[0],
                    idx:idx,
                    name:idx,
                };
                if (arr[0]=='text') {
                    info.finalLines = '50';
                    info.entries=1
                };
                if (arr[0]=='video')info.entries=1;
                this.newFile(info, () => this.handleFile(uri, arr, true))
            }
        })
    },
    newFile(info,callback){
        if (!callback) {
            callback=()=>{
                this.sendMessage('newFileSuccess',idx);
            }
        };
        const type=info.type;
        const name=info.name;
        const idx=info.idx;
        if (fileNum[filePos[type]]>=400){
            this.sendMessage('newFileFailed',fileNum);
            return
        };
        const escapedName=escapeUnicode(name);
        const json=`,[${JSON.stringify(idx)},"${escapedName}"${info.entries!==undefined?','+info.entries:''}${type=='text'?',0,'+info.finalLines:''}]`
        File.writeText({
            uri:`internal://app/${type}List.json`,
            append:true,
            text:json,
            success:()=>{
                fileNum[filePos[type]]+=1;
                if (type=='script'||type=='note') {
                    File.mkdir({
                        uri:`internal://app/${type}`,
                        recursive:true,
                        success:()=>callback?.()
                    });
                    return
                };
                if (type=='text'||type=='video'){
                    const group=Math.ceil(info.entries/200);
                    if (!group){
                        File.mkdir({
                            uri:`internal://app/${type}/${idx}`,
                            recursive:true,
                            success:()=>callback?.(),
                        })
                    } else {
                        for (let i = 0; i < group; i++) {
                            File.mkdir({
                                uri:`internal://app/${type}/${idx}/${i}`,
                                recursive:true,
                                success:()=>{
                                    if (i==group-1)callback?.()
                                }
                            })
                        };
                    };
                    if (type=='video')File.mkdir({uri:`internal://app/music`, recursive:true});
                    return;
                };
                File.mkdir({
                    uri:`internal://app/${type}/${idx}`,
                    recursive:true,
                    success:()=>callback?.()
                })
            },
            fail:()=>this.sendMessage('handleFileFailed')
        });
    },
    deleteFile(callback){
        let taskList=[];
        File.list({
            uri:'internal://app/',
            success:(data)=>{
                data.fileList.forEach((element)=>{
                    if (element.uri!='cur_playlist'&&element.uri.indexOf('_')!=-1) {
                        taskList.push(element.uri);
                    }
                });
                //收集完成后统一串行调度；无待清理项也回调（清理完成才newFile）
                function schedule() {
                    if (taskList.length > 0) {
                        setTimeout(function() {
                            File.delete({
                                uri:'internal://app/'+taskList.shift(),
                                complete:()=>schedule()
                            })
                        }, 0);
                    } else {
                        callback?.()
                    }
                };
                schedule();
            },
            fail:()=>callback?.()
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
                console.log(`消息${event}发送成功,时间${time}`)
            },
            onFailure:()=>{
                console.log(`消息${event}发送失败,时间${time}`)
            },
            onSendResult: function(resultCode) {
                // send任务执行结束后返回的错误码和信息进行处理
                console.log(resultCode.data + resultCode.code);
            }
        });
    },
    //轮询获取蓝牙连接状态
    subscribeConnect(){
        peerDeviceClient.getPeerDevice({
            onSuccess:(data)=>{
                this.connect=true;
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
                this.connect=false;
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
                    Brightness.setKeepScreenOn({keepScreenOn:true});
                    const name=data.name.slice(data.name.lastIndexOf('/')+1);
                    console.log('接收到'+data.name);
                    if (name.indexOf('_')!=-1) {
                        this.handleFile(data.name, name.split('_'));
                        return
                    };
                    if (name=='phone.png') {
                        Router.replace({uri:'/pages/screenCast/screenCast'});
                        return;
                    };
                } else {
                    // 处理手机侧应用发过来的简短消息
                    const msg=JSON.parse(data);
                    switch (msg.event){
                        case 'newFile':
                            const info=msg.content;
                            this.deleteFile(()=>this.newFile(info,null))
                            break
                        case 'refreshWallpaper':
                            Router.replace({uri:'/pages/index/index'})
                            break
                    }
                }
            },
        });
    },

    //页面跳转
    jumpToPage(e){
        if (this.offsetX!=0||this.offsetY>0||this.offsetY<-970) return;
        if (this.openAni>0.2) {
            this.springTo(0,'openAni',400);
            return
        }else {
            this.openAni=0;
        }
        this.clearAni();
        const clickPosition=e.globalY-180-this.offsetY;//阴影占20px
        if (clickPosition<0||clickPosition%110>100) return;//点到间隙了
        const index=Math.floor(clickPosition/110);
        if (index>=pageList.length) return;
        this.openIdx=index;
        this.springTo(1,'openAni',400,()=>{
            saveData('index',this.offsetY);
            if (index>=2&&index<=6) {
                if (index==2||index==5||index==6){
                    Router.replace({
                        uri:'/pages/rowList/rowList',
                        params:{
                            openIdx:index,
                            type:pageList[index]
                        }
                    })
                }else{
                    Router.replace({
                        uri:'/pages/cardList/cardList',
                        params:{
                            openIdx:index,
                            type:pageList[index]
                        }
                    })
                }
            }else {
                Router.replace({
                    uri:'/pages/'+pageList[index],
                    params:{
                        openIdx:index
                    }
                })
            }
        })
    },
    clearAni(){
        clearInterval(timer_ani);
        clearTimeout(timer_file);
        this.fileAni=0;
        this.fileName='';
    },
    //触摸引擎
    listenList(e){
        if (this.startAni)return;
        if (this.openAni>0.2) {
            this.springTo(0,'openAni',400);
            return
        }else {
            this.openAni=0;
        };
        if (this.offsetX!=0) return;
        clearTimeout(timer_focus);
        this.clearAni();
        let value=e.value;
        if (this.offsetY>0) {
            let gap=this.offsetY;
            this.offsetY=Math.min(100,this.offsetY+(this.focusValue-value)*30*(1-gap/100));
        }else if(this.offsetY<-970){
            let gap=-970-this.offsetY;
            this.offsetY=Math.max(-1070,this.offsetY+(this.focusValue-value)*30*(1-gap/100));
        }else this.offsetY+=(this.focusValue-value)*30;
        if (this.offsetY>0) {
            this.offsetY=Math.min(100,this.offsetY);
            clearTimeout(timer_focus);
            timer_focus=setTimeout(()=>this.springTo(0,'offsetY'),50)
        }else if (this.offsetY<-970) {
            this.offsetY=Math.max(-1070,this.offsetY);
            clearTimeout(timer_focus);
            timer_focus=setTimeout(()=>this.springTo(-970,'offsetY'),50)
        };
        this.focusValue=value;
        if (this.focusValue==0||this.focusValue==100) this.focusValue=50
    },
    touchStart(e){
        this.exitAni=0;
        if (this.openAni>0.2) {
            this.springTo(0,'openAni',400);
            return
        }else this.openAni=0;
        //横向移动可打断所有动画，纵向不可打断横向阻尼动画
        //根据方向判断滑动类型
        if (e.direction=='right')moveType=this.offsetX?2:3;
        else if (e.direction=='left') moveType=2;
        else if (!this.offsetX)moveType=1;
        else return;
        this.clearAni();
        oriX=e.globalX;
        oriY=e.globalY;
        disArr.length=0;
        timeArr.length=0;
        timeArr.unshift(e.timestamp);
    },
    touchMove(e){
        if (!moveType) return;
        //推入滑动记录
        let distance=moveType==1?e.globalY - oriY:e.globalX-oriX;
        timeArr.unshift(e.timestamp);
        disArr.unshift(distance);
        if(timeArr.length>4)timeArr.length=4;
        if(disArr.length>3)disArr.length=3;
        if (moveType==1) {
            if (this.offsetY>=0&&distance>0) {
                let gap=this.offsetY;
                this.offsetY=Math.min(100,this.offsetY+distance*(1-gap/105))
            }else if (this.offsetY<=-970&&distance<0) {
                let gap=-970-this.offsetY;
                this.offsetY=Math.max(-1070,this.offsetY+distance*(1-gap/105))
            }else this.offsetY=Math.max(-1070,Math.min(this.offsetY+distance,100));
        }else if (moveType==2){
            this.offsetX=Math.max(-this.width,Math.min(this.offsetX+distance,0))
        }else {
            this.exitAni=Math.max(0,this.exitAni+Math.min(distance,40));
            if (this.exitAni>=this.exitLength) App.terminate()
        }
        oriX=e.globalX;
        oriY=e.globalY;
    },
    touchEnd(){
        if (this.openAni>0.2) {
            this.springTo(0,'openAni',400);
            return
        }else this.openAni=0;
        if (!moveType)return;
        //结束时的处理
        //计算最后三次滑动平均速度、总滑动方向
        let totalDist=0;
        let totalShift=0;
        let totalSpeed=0
        const n = Math.min(disArr.length, timeArr.length - 1);
        if (n > 0) {
            for (let i = 0; i < n; i++) {
                totalDist += Math.abs(disArr[i])//移动总距离
                totalShift += disArr[i]//;移动总位移
            };
            totalSpeed=totalDist/Math.max(1,timeArr[0]-timeArr[n]);
        };
        if (moveType==1){
            if (this.offsetY>=0) this.springTo(0,'offsetY')
            else if (this.offsetY<=-970)this.springTo(-970,'offsetY')
            else this.inertia(Math.sign(totalShift)*Math.min(totalSpeed,10));
        }else if (moveType==2){
            //速度达一定值直接切到对应方向，否则根据当前位置切换
            if (totalSpeed>=0.7) {
                this.springTo(totalShift>0?0:-this.width,'offsetX')
            }else {
                this.springTo(-this.offsetX<this.width/2?0:-this.width,'offsetX')
            }
        }else if (moveType==3) {
            if ((totalShift>0&&totalSpeed>1)||this.exitAni>this.exitLength/2) this.springTo(this.exitLength,'exitAni',200,()=>App.terminate())
            else this.springTo(0,'exitAni')
        };
        moveType=0;
        disArr.length=0;
        timeArr.length=0
    },
    //纵向惯性动画
    inertia(v){
        if (!v) return;
        this.clearAni();
        let vel = v * 30; // px/ms → px/帧
        const that=this;
        function oneFrame(){
            if (that.offsetY>=0) {
                let gap=Math.min(100,that.offsetY);
                vel*=0.85-0.85*(gap/105);
                that.offsetY+=vel;
            }else if(that.offsetY<=-970){
                let gap=Math.min(100,-970-that.offsetY);
                vel*=0.85-0.85*(gap/105);
                that.offsetY+=vel;
            }else {
                that.offsetY+=vel;
                vel *= 0.85 ;
            };
            if (that.offsetY>=100) {
                that.offsetY=100;
                that.springTo(0,'offsetY')
                return;
            }else if (that.offsetY<=-1070) {
                that.offsetY=-1070;
                that.springTo(-970,'offsetY')
                return;
            };
            if (Math.abs(vel) < 0.3) {
                that.clearAni();
                if (that.offsetY >= 0) that.springTo(0,'offsetY');
                else if (that.offsetY <= -970) that.springTo(-970,'offsetY');
            };
        };
        timer_ani = setInterval(oneFrame, 33);
        oneFrame();
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
                if (that[prop] == target) {
                    clearInterval(timer_ani);
                    callback?.();
                }else {
                    that[prop] = target;
                }
            }
        }, 33);
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
    grabTouch(){}
};
