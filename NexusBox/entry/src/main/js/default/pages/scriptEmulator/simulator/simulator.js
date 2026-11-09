import Router from '@system.router';
import App from '@system.app';
import Battery from '@system.battery';
import Brightness from '@system.brightness';
import Configuration from '@system.configuration';
import Device from '@system.device';
import Fetch from '@system.fetch';
import File from '@system.file';
import Geolocation from '@system.geolocation';
import Sensor from '@system.sensor';
import Storage from '@system.storage';
import Vibrator from '@system.vibrator';
import Audio from '@system.audio';
import screenLock from '@ohos.screenLock';

let timer_run;

function pushRuntimeLog(prefix,msg){
    const host=$app.getHost();
    var str=typeof msg==='string'?msg:String(msg);
    str=prefix+str;
    host.logArr.unshift({
        content:str,
        lines:calcLines(str),
        time:getTime()
    });
    if(host.logArr.length>20)host.logArr.length=20;
    host.logChanged?.(host.logArr.slice());
};

export default {
    data: {
        font:$app.getData().font,
        fn:'',
        showLog:false,
        ifLog:false,
        logArr:[],
        timeArr:[],
        logMode:0,

        alertShow:false,
        alertMsg:'',
        alertLines:0,
        alertCallback:null,

        confirmShow:false,
        confirmIf:false,
        confirmMsg:'',
        confirmCallback:null,

        prompt:'',
        runStatus:'运行中',
        runTime:'0s',
    },
    onDestroy(){
        clearInterval(timer_run);
    },
    onShow(){
        let host=$app.getHost();
        //注册BOM事件到app.js
        host.alert=(msg,callback)=>{
            if(typeof msg==='function'){callback=msg;msg='';}
            msg=msg===undefined||msg===null?'':String(msg);
            this.logMode=2;
            this.ifLog=true;
            this.alertShow=true;
            this.alertMsg=msg;
            this.alertCallback=callback||null;
            this.alertLines=calcLines(msg);
        };
        host.confirm=(msg,callback)=>{
            msg=msg===undefined||msg===null?'':String(msg);
            this.confirmIf=true;
            this.confirmShow=true;
            this.confirmMsg=msg;
            this.confirmCallback=callback||null;
        };
        host.logChanged=(arr)=>{
            this.logArr=arr;
        };
        host.statusChanged=(status)=>{
            this.runStatus=status;
            if(status!=='运行中')this.unsubscribeTime();
        };
        host.runtimeError=(error)=>{
            const msg=error&&error.message?error.message:error;
            pushRuntimeLog('[ERROR] ',msg);
            host.fn=null;
            host.clearAllTimers();
            host.runStatus='运行错误';
            host.statusChanged?.('运行错误');
        };
        host.timerChanged=(arr)=>{
            this.timeArr=arr;
        };
        host.timerDone=()=>{
            this.checkDone();
        };
        host.clearCanvas=()=>this.$refs.canvas.clear();
        this.logArr=host.logArr.slice();
        this.timeArr=host.timeArr.slice();
        this.runStatus=host.runStatus;
        host.canvas=this.$refs.canvas.getContext('2d');
        this.setCanvas(host.canvas,host.canvasObj);
        const callback=host.fn;
        if (callback) {
            host.fn=null;
            setTimeout(()=> {
                try{
                    callback(this.prompt||'');
                }catch(e){
                    host.runtimeError?.(e);
                };
                this.checkDone();
            },100)
        }else if(!host.time&&this.fn){
            host.clearAllTimers();
            host.logArr=[];
            host.logChanged?.([]);
            host.time=Date.now();
            this.setRunStatus('运行中');
            setTimeout(()=>this.runFn(),100)
        }else if(!host.time){
            this.setRunStatus('运行结束')
        }else{
            this.checkDone();
        };
        if(host.time&&host.runStatus==='运行中')this.subscribeTime(host.time);
        else this.unsubscribeTime();
    },
    setCanvas(canvas,canvasObj){
        canvas.strokeStyle=canvasObj.strokeStyle;
        canvas.fillStyle=canvasObj.fillStyle;
        canvas.lineWidth=canvasObj.lineWidth;
        canvas.textAlign=canvasObj.textAlign;
        canvas.font=canvasObj.font;
    },
    subscribeTime(time){
        clearInterval(timer_run);
        this.runTime=Math.floor((Date.now()-time)/1000)+'s';
        timer_run=setInterval(()=>{
            this.runTime=Math.floor((Date.now()-time)/1000)+'s';
        },1000)
    },
    unsubscribeTime(){
        clearInterval(timer_run);
    },
    setRunStatus(status){
        const host=$app.getHost();
        host.runStatus=status;
        this.runStatus=status;
    },
    checkDone(){
        const host=$app.getHost();
        if(host.runStatus==='运行中'&&host.timeArr.length===0&&!host.fn&&!this.confirmShow&&!this.alertShow){
            this.unsubscribeTime();
            this.setRunStatus('运行结束')
        }
    },
    runFn(){
        var CX=204,CY=240;
        var customConsole={
            log:function(a){pushRuntimeLog('[Log] ',a)},
            error:function(a){pushRuntimeLog('[Error] ',a)},
            warn:function(a){pushRuntimeLog('[Warn] ',a)},
            info:function(a){pushRuntimeLog('[Info] ',a)}
        };
        var setTimeoutFn=function(cb,delay){
            return $app.getHost().setTimeoutFn(cb,delay);
        };
        var setIntervalFn=function(cb,delay){
            return $app.getHost().setIntervalFn(cb,delay);
        };
        var clearTimeoutFn=function(id){
            $app.getHost().clearTimeoutFn(id);
        };
        var clearIntervalFn=function(id){
            $app.getHost().clearIntervalFn(id);
        };

        var canvas={
            fillStyle:function(c){$app.getHost().canvas.fillStyle=c;$app.getHost().canvasObj.fillStyle=c;},
            strokeStyle:function(c){$app.getHost().canvas.strokeStyle=c;$app.getHost().canvasObj.strokeStyle=c;},
            lineWidth:function(w){$app.getHost().canvas.lineWidth=w;$app.getHost().canvasObj.lineWidth=w;},
            font:function(v){$app.getHost().canvas.font=v;$app.getHost().canvasObj.font=v;},
            textAlign:function(a){$app.getHost().canvas.textAlign=a;$app.getHost().canvasObj.textAlign=a;},
            fillText:function(t,x,y){$app.getHost().canvas.fillText(t,x+CX,CY-y);},
            moveTo:function(x,y){$app.getHost().canvas.moveTo(x+CX,CY-y);},
            lineTo:function(x,y){$app.getHost().canvas.lineTo(x+CX,CY-y);},
            arc:function(x,y,r,sa,ea,ac){$app.getHost().canvas.arc(x+CX,CY-y,r,sa,ea,ac);},
            fillRect:function(x,y,w,h){$app.getHost().canvas.fillRect(x+CX,CY-y-h,w,h);},
            strokeRect:function(x,y,w,h){$app.getHost().canvas.strokeRect(x+CX,CY-y-h,w,h);},
            rect:function(x,y,w,h){$app.getHost().canvas.rect(x+CX,CY-y-h,w,h);},
            beginPath:function(){$app.getHost().canvas.beginPath();},
            closePath:function(){$app.getHost().canvas.closePath();},
            stroke:function(){$app.getHost().canvas.stroke();},
            clear:function(){
                //api>=12：canvas组件clear()实测可用；api<12：组件无此方法，用背景色fillRect覆盖模拟清屏
                if($app.getData().apiVersion>=12){
                    $app.getHost().clearCanvas?.();
                }else{
                    $app.getHost().canvas.fillStyle='#080808';
                    $app.getHost().canvas.fillRect(0,0,466,480);
                }
            }
        };
        var alertFn=function(msg,callback){
            $app.getHost().alert(msg,callback)
        };
        var confirmFn=function(msg,callback){
            $app.getHost().confirm(msg,callback)
        };
        var promptFn=function(msg,callback){
            $app.getHost().fn=callback;
            Router.replace({
                uri:'/pages/keyboard/keyboard',
                params:{
                    targetPage:'/pages/scriptEmulator/simulator/simulator',
                    targetKey:'prompt',
                    prompt:msg===undefined||msg===null?'':String(msg),
                    maxLen:1024,
                    allowNewline:false,
                    keyType:1,
                }
            });
        };
        var safeRouter={
            replace:function(options){
                const host=$app.getHost();
                if(!options||!options.uri){
                    host.runtimeError?.('Router.replace缺少uri');
                    return;
                };
                host.clearRuntime();
                Router.replace(options);
            }
        };

        var filePathKeys=['uri','srcUri','dstUri'];
        var hasIllegalFilePath=function(options){
            if($app.getDevVersion())return false;
            if(!options)return false;
            if(typeof options==='string')return options.indexOf('\\')>=0;
            for(var i=0;i<filePathKeys.length;i++){
                var path=options[filePathKeys[i]];
                if(path!==undefined&&path!==null&&String(path).indexOf('\\')>=0)return true;
            }
            return false;
        };
        var safeFile={};
        ['readText','writeText','list','get','delete','mkdir','access','move','copy','readArrayBuffer','writeArrayBuffer'].forEach(function(name){
            safeFile[name]=function(options){
                if(hasIllegalFilePath(options)){
                    $app.getHost().runtimeError?.(new Error("SecurityError: file path must not contain '\\'"));
                    return;
                }
                return File[name](options);
            };
        });

        var wrappedCode = 'var console = customConsole;\n' + this.fn;
        try{
            new Function(
                'customConsole','canvas','alert','confirm','prompt',
                'setTimeout','setInterval','clearTimeout','clearInterval',
                'App','Battery','Brightness','Configuration','Device',
                'Fetch','File','Geolocation','Router','Sensor','Storage','Vibrator','Audio','screenLock',
                wrappedCode
            )(
                customConsole,canvas,alertFn,confirmFn,promptFn,
                setTimeoutFn,setIntervalFn,clearTimeoutFn,clearIntervalFn,
                App,Battery,Brightness,Configuration,Device,
                Fetch,safeFile,Geolocation,safeRouter,Sensor,Storage,Vibrator,Audio,screenLock
            );
        }catch(e){
            $app.getHost().runtimeError?.(e);
            return;
        }
        this.checkDone();
    },
    showTools(e){
        this.logMode=Number(e.globalX<320)*1;
        this.ifLog=true;
        this.showLog=true;
        if (this.logMode==0) {
            if (this.$refs.logList.rotation) {
                this.$refs.logList.rotation()
            };
        }else {
            if (this.$refs.timerList.rotation) {
                this.$refs.timerList.rotation()
            };
        }
    },
    clearTimerItem(idx){
        var item=this.timeArr[idx];
        if(item.type==='timeout')$app.getHost().clearTimeoutFn(item.id);
        else $app.getHost().clearIntervalFn(item.id);
    },
    hideLog(e={type:'click'}){
        if(e.type=='click'||(e.direction=='right')){
            this.showLog=false;
            this.alertShow=false;
            if (this.$refs.logList.rotation) {
                this.$refs.logList.rotation({focus:false})
            };
            if (this.$refs.timerList.rotation) {
                this.$refs.timerList.rotation({focus:false})
            };
            if(this.logMode==2){
                const callback=this.alertCallback;
                this.alertCallback=null;
                try{
                    callback?.();
                }catch(e){
                    $app.getHost().runtimeError?.(e);
                };
                this.checkDone();
            }
        }
    },
    confirmOK(){
        this.confirmShow=false;
        const callback=this.confirmCallback;
        this.confirmCallback=null;
        try{
            callback?.(true);
        }catch(e){
            $app.getHost().runtimeError?.(e);
        };
        this.checkDone();
    },
    confirmCancel(){
        this.confirmShow=false;
        const callback=this.confirmCallback;
        this.confirmCallback=null;
        try{
            callback?.(false);
        }catch(e){
            $app.getHost().runtimeError?.(e);
        };
        this.checkDone();
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            const host=$app.getHost();
            const uri=host.uri;
            const backPage=host.backPage;
            host.clearRuntime();
            Router.replace({
                uri:'/pages/scriptEmulator/load/load',
                params:{
                    uri:uri,
                    backPage:backPage
                },
            });
        }
    },
};

const W=[
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

const FONT_SIZE=30;
const MAX_WIDTH=370;

function getFontWidth(w){
    const cw=W[w.charCodeAt(0)];
    return cw!==undefined?Math.ceil(cw*30-1e-6)/30:1;//对齐text组件换行算法：比例×30向上取整（-1e-6消除浮点误差）
};
function calcLines(str){
    let lines=1;
    let width=0;
    for(let i=0;i<str.length;i++){
        const ch=str[i];
        if(ch==='\n'||ch==='\t'||ch==='\r')continue;
        width+=getFontWidth(ch)*FONT_SIZE;
        if(width>MAX_WIDTH){
            lines++;
            width=getFontWidth(ch)*FONT_SIZE;
        }
    }
    return lines;
};

function getTime(){
    const d=new Date();
    const h=d.getHours().toString();
    const m=d.getMinutes().toString();
    const s=d.getSeconds().toString();
    const cs=Math.floor(d.getMilliseconds()/10).toString();
    return h+':'+m+':'+s+'.'+cs;
};
