import Brightness from '@system.brightness';
import Audio from '@system.audio';
import File from '@system.file';
import Geolocation from '@system.geolocation';
import Sensor from '@system.sensor';
import { getData, getDevice } from "./common/storage";
import Router from '@system.router';

let data={
    windowWidth:466,
    windowHeight:466,
    apiVersion:11,
    screenShape:'circle',
    font:'HYQiHei-65S'
};
let host={
    fn:null,
    time:0,
    logArr:[],
    logChanged:null,
    runStatus:'运行中',
    statusChanged:null,
    runtimeError:null,
    timeArr:[],
    timerChanged:null,
    timerDone:null,
    setTimeoutFn:null,
    setIntervalFn:null,
    clearTimeoutFn:null,
    clearIntervalFn:null,
    clearAllTimers:null,
    clearRuntime:null,
    alert:null,
    confirm:null,
    canvas:null,
    clearCanvas:null,
    canvasObj:{
        fillStyle:'#ffffff',
        strokeStyle:'#ffffff',
        lineWidth:1,
        textAlign:'left',
        font:'30px HarmonyOSHans-Medium',
    },
    uri:'',//脚本uri临时存放
    backPage:'',//脚本临时存放
};
function getHostTime(){
    const d=new Date();
    return d.getHours().toString()+':'+d.getMinutes().toString()+':'+d.getSeconds().toString()+'.'+Math.floor(d.getMilliseconds()/10).toString();
};
function notifyTimers(){
    host.timerChanged?.(host.timeArr.slice());
};
function removeTimer(id){
    for(let i=0;i<host.timeArr.length;i++){
        if(host.timeArr[i].id===id){
            host.timeArr.splice(i,1);
            break;
        }
    };
    notifyTimers();
    if(host.timeArr.length===0)host.timerDone?.();
};
function limitTimers(){
    if(host.timeArr.length<10)return;
    const item=host.timeArr.shift();
    if(item.type==='timeout')clearTimeout(item.id);
    else clearInterval(item.id);
};
host.setTimeoutFn=function(cb,delay){
    limitTimers();
    const entry={type:'timeout',time:getHostTime(),id:null};
    entry.id=setTimeout(function(){
        let error=null;
        try{
            cb();
        }catch(e){
            error=e;
        };
        removeTimer(entry.id);
        if(error)host.runtimeError?.(error);
    },delay);
    host.timeArr.push(entry);
    notifyTimers();
    return entry.id;
};
host.setIntervalFn=function(cb,delay){
    limitTimers();
    const entry={type:'interval',time:getHostTime(),id:null};
    entry.id=setInterval(function(){
        try{
            cb();
        }catch(e){
            clearInterval(entry.id);
            removeTimer(entry.id);
            host.runtimeError?.(e);
        }
    },delay);
    host.timeArr.push(entry);
    notifyTimers();
    return entry.id;
};
host.clearTimeoutFn=function(id){
    clearTimeout(id);
    removeTimer(id);
};
host.clearIntervalFn=function(id){
    clearInterval(id);
    removeTimer(id);
};
host.clearAllTimers=function(){
    for(let i=0;i<host.timeArr.length;i++){
        if(host.timeArr[i].type==='timeout')clearTimeout(host.timeArr[i].id);
        else clearInterval(host.timeArr[i].id);
    };
    host.timeArr=[];
    notifyTimers();
};
host.clearRuntime=function(){
    host.clearAllTimers();
    host.fn=null;
    host.time=0;
    host.logArr=[];
    host.logChanged=null;
    host.runStatus='运行中';
    host.statusChanged=null;
    host.runtimeError=null;
    host.timerChanged=null;
    host.timerDone=null;
    host.alert=null;
    host.confirm=null;
    host.canvas=null;
    host.clearCanvas=null;
    host.canvasObj={
        fillStyle:'#ffffff',
        strokeStyle:'#ffffff',
        lineWidth:1,
        textAlign:'left',
        font:'30px HarmonyOSHans-Medium',
    };
    host.uri='';
    host.backPage='';
    Audio.onplay=null;
    Audio.onpause=null;
    Audio.onstop=null;
    Audio.onloadeddata=null;
    Audio.onended=null;
    Audio.onerror=null;
    Audio.ontimeupdate=null;
    Audio.stop();
    Geolocation.unsubscribe();
    try{Sensor.unsubscribeAccelerometer()}catch(e){};
    try{Sensor.unsubscribeCompass()}catch(e){};
    try{Sensor.unsubscribeProximity()}catch(e){};
    try{Sensor.unsubscribeLight()}catch(e){};
    try{Sensor.unsubscribeStepCounter()}catch(e){};
    try{Sensor.unsubscribeBarometer()}catch(e){};
    try{Sensor.unsubscribeHeartRate()}catch(e){};
    try{Sensor.unsubscribeOnBodyState()}catch(e){};
    try{Sensor.unsubscribeDeviceOrientation()}catch(e){};
    try{Sensor.unsubscribeGyroscope()}catch(e){};
};

let rootPath='internal://app';
//探针：从internal://app逐层加\..，直到File.list失败到达上限
//开发版不限层数，非开发版只探一层（最多internal://app\..）
function probeRootPath(devVersion){
    rootPath='internal://app';
    const maxDepth=devVersion?Infinity:1;
    let depth=0;
    const probe=()=>{
        if(depth>=maxDepth)return;
        const uri=rootPath+'\\..';
        File.list({
            uri:uri,
            success:()=>{
                rootPath=uri;
                depth++;
                if(depth<maxDepth)setTimeout(probe,0)//让出UI线程，避免假异步同步回调阻塞
            },
            fail:()=>{}
        });
    };
    setTimeout(probe,800);//首个探针延后，避免拉长应用启动
};
export default {
    getData(){
        return data
    },
    getHost(){
        return host
    },
    getDevVersion(){
        return true
    },
    getRootPath(){
        return rootPath
    },
    onCreate() {
        console.info("Application onCreate");
        getDevice(data);
        probeRootPath(this.getDevVersion());
        //读取常亮设置（默认开启），开启才保持常亮
        getData('keepScreen',(v)=>{
            if (v!==false) {
                Brightness.setKeepScreenOn({
                    keepScreenOn:true
                });
            }
        },true);
        getData('welcome',(w)=>{
            if (!w) {
                setTimeout(()=>{
                    Router.replace({
                        uri:'/pages/welcome/welcome'
                    })
                },0)
            }
        },false);

    },


    onDestroy() {
        console.info("Application onDestroy");
        host.clearRuntime();
    },
};
