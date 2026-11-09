import File from '@system.file';
import Router from '@system.router';
import Battery from '@system.battery';
import Brightness from '@system.brightness';
import { getData, saveData } from '../../../common/storage';

const windowWidth=320;
const windowHeight=338;
let numOfLines=0;//一屏行数
let numOfLists=0;//一屏列数
let length=0;//单次读取的长度
let timer_auto,timer_turnPage,timer_focus,timer_tick,timer_bar;
let oriMode=0;
let oriLight=0;
let tickCount=0;
export default {
    data: {
        uri:'internal://app/bench.json',
        upperText:'',
        lowerText:'',
        text:'',
        ani_name:'',
        ani_show:false,
        pagePosition:0,//当前读取位置
        pageLength:0,//页长度记录
        totalLength:0,
        style:{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        },
        styleIdx:0,
        title:'',

        //其他页面传入的临时数据
        progress:0,

        target:0,
        setArr:[0,0],//阅读进度，亮度
        lightLock:false,//亮度锁定是否开启
        timer_set:null,
        autoDuration:5,
        auto:false,
        focusValue:1,
        barIf:false,
        barShow:false,
        pageTurning:false,
        timeText:'',
        battery:100,
        msg:{
            content:'',
            timer:null
        },
        //hyper临时数据
        finalLines:0,
        totalPage:0,

        fileMode:false,
        replaced:false,
        showPopup:false
    },
    onInit() {
        getData('text_styleIdx',(t)=>{this.styleIdx=t},0);
        getData('text_style',(t)=>{
            this.style=t;
            numOfLines=Math.floor(windowHeight/this.style.size/1.3);
            numOfLists=windowWidth/this.style.size;
            length=Math.ceil(4.5*numOfLines*numOfLists);
            File.get({
                uri:this.uri,
                success:(obj)=>{
                    this.totalLength=obj.length;
                    this.jumpTo(this.progress)
                }
            });
        },{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        });
        if (this.progress) {
            this.setArr[0]=Math.round(this.progress*100)
        };
        this.initialize();
        this.updateTick();
        timer_tick=setInterval(()=>{
            this.updateTick();
        },1000)
    },
    updateTick(){
        const d=new Date();
        const h=d.getHours();
        const m=d.getMinutes();
        this.timeText=(h<10?'0':'')+h+':'+(m<10?'0':'')+m;
        if (tickCount%5===0) {
            Battery.getStatus({
                success:(data)=>{
                    this.battery=Math.round(data.level*100)
                }
            })
        };
        tickCount++
    },
    onShow(){
        getData('tips_text',(shown)=>{
            if (!shown) {
                this.showPopup = true;
                this.barIf=true;
                this.barShow=true;
            }else {
                if (this.$refs.slider.rotation) {
                    this.$refs.slider.rotation()
                };
            }
        },false);
        if (this.replaced) {
            this.sendMsg('无分页文件,启用翻页模式',3000)
        }
    },
    onHide(){
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation({focus:false})
        };
    },
    changTarget(){
        this.target=(this.target+1)%this.setArr.length;
        this.focusValue=this.setArr[this.target];
        this.resetBarTimer();
    },
    clickAuto(e){
        this.resetBarTimer();
        clearInterval(timer_auto);
        if (e.globalX<145){
            if (this.auto) {
                this.auto=false;
                this.sendMsg('自动翻页已关闭')
            }else {
                this.auto=true;
                this.sendMsg('自动翻页已开启')
            }
        }else {
            this.autoDuration=(this.autoDuration+1)%9;
            if (!this.autoDuration)this.autoDuration=1;
            if (this.auto) this.autoMove();
        }

    },
    setting(){
        //跳转设置页：temp保存阅读页面数据，返回时恢复
        Router.replace({
            uri:'/pages/setting/readSetting/readSetting',
            params:{
                backPage:'/pages/textViewer/normal/normal',
                fileMode:this.fileMode,
                temp:{
                    title:this.title,
                    uri:this.uri,
                    progress:this.getProgress(),
                    finalLines:this.finalLines,
                    totalPage:this.totalPage,
                    fileMode:this.fileMode,
                }
            }
        })
    },
    listenSlider(e){
        this.resetBarTimer();
        if (!this.barShow&&!this.pageTurning) {
            let value=e.value;
            if (this.focusValue>value) {
                this.turnPage({direction:'right'})
            }else if (this.focusValue<value) {
                this.turnPage({direction:'left'})
            };
            this.focusValue=0;
            this.pageTurning=true;
            timer_turnPage=setTimeout(()=>{
                this.pageTurning=false;
                this.focusValue=1;
            },700)
        }else if (this.barShow){
            if (this.target) {
                Brightness.setValue({
                    value:Math.round(1+e.value*254/50),
                    success:()=>Brightness.setMode({mode:0})
                });
                this.setArr[1]=e.value*2
            }else {
                clearTimeout(timer_focus);
                this.setArr[0]=e.value*2;
                timer_focus=setTimeout(()=>{
                    this.jumpTo(e.value/50)
                },500)
            }
        }
    },
    resetBarTimer(){
        if (!this.barShow) {
            clearTimeout(timer_bar);
            return
        }
        clearTimeout(timer_bar);
        timer_bar=setTimeout(()=>{
            this.closeBar()
        },4000)
    },
    openBar(){
        clearInterval(timer_auto);
        this.barIf=true;
        this.barShow=true;
        this.setArr[0]=Math.round(this.getProgress()*100);
        this.focusValue=this.setArr[this.target];
        this.resetBarTimer();
    },
    closeBar(){
        clearTimeout(timer_bar);
        this.barShow=false;
        if (this.auto) {
            this.autoMove()
        };
        this.focusValue=1
    },
    autoMove(){
        clearInterval(timer_auto);
        timer_auto=setInterval(()=>{
            this.turnPage({direction:'left'});
        },this.autoDuration*1000)
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
    jumpTo(progress){
        if (!this.totalLength) return;
        const value=Math.max(0,Math.min(progress,1));
        if (value>=1) {
            const len=Math.min(length,this.totalLength);
            this.probeStart(this.totalLength-len,len,this.readBackward);
            return;
        };
        const pos=Math.round(this.totalLength*value);
        if (pos>=this.totalLength) {
            const len=Math.min(length,this.totalLength);
            this.probeStart(this.totalLength-len,len,this.readBackward)
        }else if (pos) {
            this.probeStart(pos,Math.min(length,this.totalLength-pos),this.readForward)
        }else {
            this.readForward(0,Math.min(length,this.totalLength))
        }
    },
    getProgress(){
        if (!this.totalLength) return 0;
        if (this.pagePosition+this.pageLength>=this.totalLength) return 1;
        return this.pagePosition/this.totalLength;
    },
    clickPage(e){
        if(this.barShow) {
            this.closeBar();
            return
        };
        if (e.globalX>330) {
            this.turnPage({direction:'left'})
        }else if(e.globalX<136){
            this.turnPage({direction:'right'})
        }else {
            this.openBar();
        }
    },

    onDestroy(){
        this.saveProgress();
        clearInterval(timer_auto);
        clearTimeout(this.timer_set);
        clearTimeout(timer_turnPage);
        clearTimeout(timer_focus);
        clearInterval(timer_tick);
        clearTimeout(this.msg.timer);
        clearTimeout(timer_bar);
        saveData('text_duration',this.autoDuration);
        if (this.lightLock) saveData('light',Math.round(this.setArr[1]));
        Brightness.setValue({
            value:oriLight,
            success:()=>{
                if (oriMode==0) Brightness.setMode({mode:0});
            }
        });
    },

    initialize(){
        if (!this.title)this.title=this.uri.slice(Math.max(this.uri.lastIndexOf('/'),this.uri.lastIndexOf('\\'))+1);
        Brightness.getMode({success:(data)=>oriMode=data.mode});
        Brightness.getValue({success:(light)=>{
            oriLight=light.value;
            getData('lightLock',(arr)=>{
                if (arr[0]) {
                    getData('light',(v)=>{
                        this.setArr[1]=v;
                        this.lightLock=true;
                        Brightness.setValue({
                            value:Math.round(1+v*254/100),
                            success:()=>Brightness.setMode({mode:0})
                        })
                    },50);
                }else {
                    this.setArr[1]=Math.round(light.value/255*100)
                }
            },[false,false,false]);
        }});
        getData('text_duration',(data)=>{
            //temp返回恢复优先，无temp才读持久化
            this.autoDuration=Math.max(1,Math.min(8,data||5));
        },5)
    },

    //传入位置，长度，正向读取
    readForward(pos,len){
        File.readText({
            uri:this.uri,
            position:pos,
            length:len,
            success:(data)=>{
                const str=data.text;
                let resultText=[''];
                let pageLen=0;
                let lineWidth=0;
                let i=0;
                while (i < str.length) {
                    const ch = str[i];
                    const code = ch.charCodeAt(0);
                    if (ch=='\t'||ch == '\r'){
                        i++;
                        pageLen+=getByteLen(code);
                        continue
                    };
                    if (ch == '\n') {
                        if (resultText.length >= numOfLines) break;
                        resultText.push('');
                        lineWidth = 0;
                        i++;
                        pageLen+=getByteLen(code);
                        continue;
                    };
                    const charWidth = Math.ceil(getFontWidth(ch)*this.style.size-1e-6)/this.style.size;
                    if (lineWidth + charWidth > numOfLists) {
                        if (resultText.length >= numOfLines )break;
                        resultText.push('');
                        lineWidth = 0;
                        continue; // 重新处理当前字符
                    };
                    lineWidth += charWidth;
                    resultText[resultText.length - 1] += ch;
                    i++;
                    pageLen+=getByteLen(code);
                };
                if (resultText.length<numOfLines) {
                    for (let i = resultText.length; i < numOfLines; i++) resultText.push('')
                };
                this.pagePosition=pos;
                this.pageLength=pageLen;
                this.text=resultText.join('\n');
                this.lowerText=this.text;
                this.ani_name='out';
            },
            fail:(a,b)=>console.log(a+b)
        });
    },
    readBackward(pos,len){
        File.readText({
            uri:this.uri,
            position:pos,
            length:len,
            success:(data)=>{
                const str=data.text;
                let resultText=[''];
                let pageLen=0;
                let lineWidth=0;
                let i=str.length-1;
                while (i>=0) {
                    const ch = str[i];
                    const code = ch.charCodeAt(0);
                    if (ch=='\t'||ch == '\r'){
                        i--;
                        pageLen+=getByteLen(code);
                        continue
                    };
                    if (ch == '\n') {
                        if (resultText.length >= numOfLines) break;
                        resultText.push('');
                        lineWidth = 0;
                        i--;
                        pageLen+=getByteLen(code);
                        continue;
                    };
                    const charWidth = Math.ceil(getFontWidth(ch)*this.style.size-1e-6)/this.style.size;
                    if (lineWidth + charWidth > numOfLists) {
                        if (resultText.length >= numOfLines )break;
                        resultText.push('');
                        lineWidth = 0;
                        continue; // 重新处理当前字符
                    };
                    lineWidth += charWidth;
                    resultText[resultText.length - 1] = ch + resultText[resultText.length-1];
                    i--;
                    pageLen+=getByteLen(code);
                };
                resultText.reverse();
                if (resultText.length<numOfLines) {
                    for (let i = resultText.length; i < numOfLines; i++) resultText.push('')
                };
                this.pagePosition=pos+len-pageLen;
                this.pageLength=pageLen;
                this.text=resultText.join('\n');
                this.upperText=this.text;
                this.ani_name='in';
            },
            fail:(a,b)=>console.log(a+b)
        });
    },
    probeStart(pos, len , fn, retry=0 ) {//传入指定位置，向下寻找有效开头
        if (retry >= 3) {
            // 3次都失败，直接读（让API自己处理）
            fn(pos,len);
            return;
        }
        File.readText({
            uri: this.uri,
            position: pos,
            length: 1,
            success: (data) => {
                const code = data.text.charCodeAt(0);
                // 检查是否是合法的 UTF-8 起始字节
                // 0x00-0x7F: ASCII（合法）
                // 0x80-0xBF: continuation byte（不合法开头！）
                // 0xC0-0xFF: 多字节起始（合法）
                if (code >= 0x80 && code <= 0xBF) {
                    // continuation byte，不是合法开头，跳过1字节
                    this.probeStart(pos + 1, len - 1, fn ,retry + 1);
                } else {
                    // 合法开头，正式读
                    fn(pos,len);
                }
            },
            fail: () =>fn(pos,len)
        });
    },
    turnPage(e){
        if (this.barShow){
            if (e.direction=='right') {
                this.close()
            };
            return;
        }
        if (e.direction=='right'&&this.pagePosition) {//上一页
            this.upperText='';
            this.lowerText=this.text;
            this.ani_name='';
            this.ani_show=true;
            this.ani_show=false;
            if (this.pagePosition<length) this.readBackward(0,this.pagePosition);
            else this.probeStart(this.pagePosition-length,length,this.readBackward);
        }else if (e.direction=='left'){
            if (this.pagePosition+this.pageLength<this.totalLength) {
                this.upperText=this.text;
                this.lowerText='';
                this.ani_name='';
                this.ani_show=false;
                this.ani_show=true;
                this.readForward(this.pagePosition+this.pageLength,length);
            }else {
                if (this.auto) {
                    this.auto=false;
                    clearInterval(timer_auto);
                    this.sendMsg('已到文件尾,自动翻页已关闭')
                }else {
                    this.sendMsg('已到文件尾')
                }
            }
        }
    },
    close(){
        if (this.fileMode){
            Router.replace({
                uri:'/pages/file/fileList/fileList',
                params:{
                    backKey:true
                }
            })
        }else{
            Router.replace({
                uri:'/pages/rowList/rowList',
                params:{
                    type:this.uri.indexOf('internal://app/script/')===0?'script':'text',
                    backRecord:true
                }
            })
        }
    },
    saveProgress(callback){
        if (this.fileMode||!this.totalLength||!this.pageLength||this.uri.indexOf('internal://app/text/')!==0) {
            callback&&callback();
            return;
        }
        const idx=this.uri.split('/')[4];
        if(!idx){
            callback&&callback();
            return;
        }
        const record=[idx,this.title,this.totalPage,this.getProgress(),this.finalLines];
        const json=JSON.stringify(record);
        let escaped='';
        for(let i=0;i<json.length;i++){
            const code=json.charCodeAt(i);
            if(code>127){
                const hex=code.toString(16);
                let padded='';
                for(let p=hex.length;p<4;p++)padded+='0';
                escaped+='\\u'+padded+hex;
            }else{
                escaped+=json[i];
            }
        }
        File.writeText({
            uri:'internal://app/textList.json',
            append:true,
            text:','+escaped,
            success:()=>{
                callback&&callback();
            },
            fail:()=>{
                callback&&callback();
            }
        })
    },
    confirmPopup(){
        this.showPopup=false;
        saveData('tips_text',true);
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation()
        };
        this.openBar()
    },
    grabTouch(){}
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
    return cw!==undefined?cw:1;//对齐text组件换行算法：比例×30向上取整（-1e-6消除浮点误差）
};

function getByteLen(code) {
    if (code <= 0x7F) return 1;                 // ASCII
    if (code <= 0x7FF) return 2;                // 扩展拉丁等
    if (code >= 0xD800 && code <= 0xDBFF) return 1;  // 高位代理（不完整）
    return 3;                                    // 中文字等 BMP 字符
};
