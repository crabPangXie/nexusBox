import File from '@system.file';
import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';
import Brightness from '@system.brightness';
//单页行数：分页文件为JSON数组(~45B/行=14汉字+引号逗号)，4KB上限→最大90行,减少分页文件数量
const onePageLines=90;
//分组路径：与主页handleFile公式一致（组0基，组内序号1基），200页一组，无后缀
const pageUri=(base,page)=>{
    const group=Math.floor((page-1)/200);
    return base+group+'/'+(page-group*200);
};
const oneScreenLines=17;
let prevArr=[];
let curArr=[];
let nextArr=[];
let displayArr=[];
let timer_ani,oriY=0;
let vFoc=0,focRunning=false,springing=false;
let timer_focus;
let disArr=[];
let timeArr=[];
let timer_autoMove;
let timer_bar;
let oriMode=0;
let oriLight=0;

export default {
    data: {
        style:{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        },
        uri:'',

        finalLines:40,//最后一页行数，由列表页面传入
        totalLines:0,
        totalPage:0,

        displayText:'',
        nowLine:0,
        nowPage:0,
        offsetY:0,
        focusValue:25,//与slider初始位置对齐，避免第一下方向误判

        showProgress:true,

        //其他页面传入的临时数据
        progress:0,

        barIf:false,
        barShow:false,
        showPopup:false,
        target:0,
        setArr:[0,0],//阅读进度，亮度
        lightLock:false,//亮度锁定是否开启
        auto:false,
        autoSpeed:0,
        title:'',
        msg:{
            content:'',
            timer:null
        }
    },
    onInit(){
        getData('text_style',(t)=>{this.style=t},{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        });
        const end=this.uri.lastIndexOf('text.txt');
        if (end!=-1) {
            this.uri=this.uri.slice(0,end)
        };
        this.initialize();
    },
    initialize(){
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
        getData('text_speed',(data)=>{
            //自动翻页速度：打开页面重新初始化（temp不再传递）
            this.autoSpeed=data;
        },0)
    },
    onShow(){
        getData('tips_text',(shown)=>{
            if (!shown) {
                this.showPopup=true;
                this.barIf=true;
                this.barShow=true;
            }else {
                if (this.$refs.text.rotation) {
                    this.$refs.text.rotation()
                };
            }
        },false);
        timer_focus=setTimeout(()=>this.showProgress=false,3000);
        if (!this.totalPage){
            Router.replace({
                uri:'/pages/textViewer/normal/normal',
                params:{
                    title:this.title,
                    uri:this.uri+'text.txt',
                    progress:this.progress,
                    finalLines:this.finalLines,
                    totalPage:this.totalPage
                }
            })
        }else {
            this.totalPage=this.totalPage||1;
            this.totalLines=(this.totalPage-1)*onePageLines+this.finalLines;
            this.jumpTo(this.progress)
        }
    },
    onHide(){
        if (this.$refs.text.rotation) {
            this.$refs.text.rotation({focus:false})
        };
    },
    onDestroy(){
        this.saveProgress();
        clearInterval(timer_ani);
        clearTimeout(timer_focus);
        clearTimeout(this.msg.timer);
        clearInterval(timer_autoMove);
        clearTimeout(timer_bar);
        saveData('text_speed',this.autoSpeed);
        if (this.lightLock) saveData('light',Math.round(this.setArr[1]));
        Brightness.setValue({
            value:oriLight,
            success:()=>{
                if (oriMode==0) Brightness.setMode({mode:0});
            }
        });
    },
    buildDisplay(line){
        displayArr.length=0;
        // 1. prevArr 部分（line <= 0 时）
        if (line<=0&&prevArr.length) {
            displayArr=prevArr.slice(line-1);
        };
        // 2. curArr 部分
        let curStart=Math.max(0,line-1);
        let need=oneScreenLines-displayArr.length;
        if (need>0&&curStart<curArr.length) {
            displayArr=displayArr.concat(curArr.slice(curStart,Math.min(curArr.length,curStart+need)));
        };
        // 3. nextArr 部分（超出 curArr 末尾时）
        need=oneScreenLines-displayArr.length;
        if (need>0&&nextArr.length) {
            const nextStart=Math.max(0,line-curArr.length-1);
            displayArr=displayArr.concat(nextArr.slice(nextStart,nextStart+need));
        };
        this.displayText=displayArr.join('\n');
    },
    checkPage(){
        //获取offsetY偏移量
        if (this.offsetY>=38) {
            const deltaLines=Math.floor(this.offsetY/38);
            //事实上，unshift和重新slice的性能开销一致,，所以直接重新裁剪
            //先根据当前行找到要新裁剪的位置
            let line=this.nowLine-deltaLines;
            if (this.nowPage==1&&line<1) line=1;
            this.buildDisplay(line);
            this.offsetY-=deltaLines*38;
            this.nowLine=line;
            if (line<=-oneScreenLines)this.backward()
        }else if (this.offsetY<=-38) {
            const deltaLines=Math.floor(-this.offsetY/38);
            let line=this.nowLine+deltaLines;
            if (this.nowPage==this.totalPage&&line+oneScreenLines-1>curArr.length) line=curArr.length-oneScreenLines+1;
            this.buildDisplay(line);
            this.offsetY+=deltaLines*38;
            this.nowLine=line;
            if (line>onePageLines)this.forward()
        }
    },
    jumpTo(progress){
        const value=Math.max(0,Math.min(progress,1));
        const maxOffset=Math.max(0,this.totalLines-oneScreenLines);
        const absoluteLine=Math.round(maxOffset*value)+1;
        const absoluteEnd=Math.min(this.totalLines,absoluteLine+oneScreenLines-1);
        let page=Math.floor((absoluteEnd-1)/onePageLines)+1;
        if (page<1) page=1;
        if (page>this.totalPage) page=this.totalPage;
        this.nowPage=page;
        const line=absoluteLine-(page-1)*onePageLines;
        let doneCount=0;
        const finish=()=>{
            this.buildDisplay(line);
            this.nowLine=line;
        };
        File.readText({
            uri:pageUri(this.uri,page),
            success:(data)=>{
                curArr=JSON.parse(data.text);
                doneCount++;
                if (doneCount>=3)finish()
            }
        });
        if (page>1) {
            File.readText({
                uri:pageUri(this.uri,page-1),
                success:(data)=>{
                    prevArr=JSON.parse(data.text);
                    doneCount++;
                    if (doneCount>=3)finish()
                }
            })
        }else {
            prevArr=[];
            doneCount++;
            if (doneCount>=3)finish()
        };
        if (page<this.totalPage) {
            File.readText({
                uri:pageUri(this.uri,page+1),
                success:(data)=>{
                    nextArr=JSON.parse(data.text);
                    doneCount++;
                    if (doneCount>=3)finish()
                }
            })
        }else {
            nextArr=[];
            doneCount++;
            if (doneCount>=3)finish()
        };
    },
    backward(){
        //读取上一页，判断在手势，page=1是直接走弹性分支而非继续读取，forward同理
        this.nowPage-=1;
        if (this.nowPage>1) {
            File.readText({
                uri:pageUri(this.uri,this.nowPage-1),
                success:(data)=>{
                    nextArr=curArr;
                    curArr=prevArr;
                    this.nowLine=onePageLines+this.nowLine;
                    prevArr=JSON.parse(data.text);
                }
            })
        }else {
            nextArr=curArr;
            curArr=prevArr;
            this.nowLine=onePageLines+this.nowLine;
            prevArr=[];
        };
    },
    forward(){
        //读取下一页，判断在手势，page=1是直接走弹性分支而非继续读取，backward同理
        this.nowPage+=1;
        if (this.nowPage<this.totalPage) {
            File.readText({
                uri:pageUri(this.uri,this.nowPage+1),
                success:(data)=>{
                    prevArr=curArr;
                    curArr=nextArr;
                    this.nowLine=this.nowLine-onePageLines;
                    nextArr=JSON.parse(data.text);
                }
            })
        }else {
            prevArr=curArr;
            curArr=nextArr;
            this.nowLine=this.nowLine-onePageLines;
            nextArr=[];
        };
    },

    //手势引擎
    touchStart(e){
        if(this.barShow)return;
        clearTimeout(timer_focus);
        this.showProgress=true;
        this.clearAni();
        oriY=e.globalY;
        timeArr.unshift(e.timestamp);
    },
    touchMove(e){
        if(this.barShow)return;
        let distance=e.globalY-oriY;
        let atTop=(this.nowPage-1)*onePageLines+this.nowLine<=1;
        let atBottom=(this.nowPage-1)*onePageLines+this.nowLine+oneScreenLines-1>=this.totalLines;

        if(atTop&&distance>0){
            let gap=Math.max(0,this.offsetY);
            this.offsetY=Math.min(76,this.offsetY+distance*(1-gap/76));
        }else if(atBottom&&distance<0){
            let gap=Math.max(0,-this.offsetY);
            this.offsetY=Math.max(-76,this.offsetY+distance*(1-gap/76));
        }else{
            this.offsetY+=distance;
            this.checkPage();
        }
        timeArr.unshift(e.timestamp);
        disArr.unshift(distance);
        if(timeArr.length>4)timeArr.length=4;
        if(disArr.length>3)disArr.length=3;
        oriY=e.globalY;
    },
    touchEnd(){
        //tap检测：无位移视为点击，弹窗操作由clickPage处理（grab:click可拦截click）
        let moved=0;
        for(let i=0;i<disArr.length;i++)moved+=Math.abs(disArr[i]);
        if(moved<10){
            disArr.length=0;
            timeArr.length=0;
            return;
        }
        //列表为惯性
        let atTop=(this.nowPage-1)*onePageLines+this.nowLine<=1;
        let atBottom=(this.nowPage-1)*onePageLines+this.nowLine+oneScreenLines-1>=this.totalLines;
        if(atTop&&this.offsetY>0){
            this.springTo(0,'offsetY')
        }else if(atBottom&&this.offsetY<0){
            this.springTo(0,'offsetY')
        }else{
            //计算最后三次滑动平均速度，提交给惯性函数
            let totalDist = 0;
            let totalShift = 0;
            const n = Math.min(disArr.length, timeArr.length - 1);
            if (n > 0) {
                for (let i = 0; i < n; i++) {
                    totalDist += Math.abs(disArr[i])//移动总距离
                    totalShift += disArr[i]//;移动总位移
                };
                const totalTime = timeArr[0] - timeArr[n];
                let v=totalDist / totalTime ;
                this.inertia(Math.sign(totalShift)*Math.min(v,10));
            };
        }
        disArr.length=0;
        timeArr.length=0
        clearTimeout(timer_focus);
        timer_focus=setTimeout(()=>this.showProgress=false,3000);
    },
    //纵向惯性动画
    inertia(v){
        if (!v) return;
        this.clearAni();
        let vel = v * 40; // px/ms → px/帧
        const oneFrame=()=>{
            let atTop=(this.nowPage-1)*onePageLines+this.nowLine<=1;
            let atBottom=(this.nowPage-1)*onePageLines+this.nowLine+oneScreenLines-1>=this.totalLines;

            if(atTop&&(this.offsetY>0||vel>0)){
                let gap=Math.max(0,this.offsetY);
                vel*=0.5-0.5*(gap/76);
                this.offsetY+=vel;
                if(this.offsetY>=70){
                    this.springTo(0,'offsetY');
                    return;
                }
            }else if(atBottom&&(this.offsetY<0||vel<0)){
                let gap=Math.max(0,-this.offsetY);
                vel*=0.5-0.5*(gap/76);
                this.offsetY+=vel;
                if(this.offsetY<=-70){
                    this.springTo(0,'offsetY');
                    return;
                }
            }else{
                this.offsetY+=vel;
                vel *= 0.65;
                this.checkPage();
            };
            if (Math.abs(vel) < 0.3) {
                this.clearAni();
                if((atTop&&(this.offsetY>0||vel>0)||(atBottom&&(this.offsetY<0||vel<0))))this.springTo(0,'offsetY');
            };
        };
        oneFrame();
        timer_ani = setInterval(oneFrame, 33);
    },

    autoMove(){
        clearInterval(timer_autoMove);
        timer_autoMove=setInterval(()=>{
            let atBottom=(this.nowPage-1)*onePageLines+this.nowLine+oneScreenLines-1>=this.totalLines;
            if(atBottom&&this.offsetY<0){
                clearInterval(timer_autoMove);
                this.springTo(0,'offsetY');
                this.sendMsg('到达文件尾,自动翻页已停止');
                return;
            }
            this.offsetY-=[2,3,5][this.autoSpeed]||2;
            this.checkPage();
        },33)
    },

    //表冠引擎
    listenText(e){
        this.resetBarTimer();
        if (this.barShow) {
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
                    this.jumpTo(e.value/50);
                },500)
            }
            return;
        }
        if(springing)return;//弹簧回弹期间忽略表冠输入，防止互相截断拉扯
        clearTimeout(timer_focus);
        this.showProgress=true;
        timer_focus=setTimeout(()=>this.showProgress=false,3000);
        let value=e.value;
        vFoc=vFoc+20*((this.focusValue>value?1:-1));
        if (vFoc>60) vFoc=60;
        if (vFoc<-60) vFoc=-60;
        this.focusValue=value;
        if (!focRunning) {
            focRunning=true;
            this.startFocusMove()
        };
        if(this.focusValue==0||this.focusValue==50){
            this.focusValue=25;
        }
    },
    startFocusMove(){
        clearInterval(timer_ani);
        const oneFrame=()=>{
            let atTop=(this.nowPage-1)*onePageLines+this.nowLine<=1;
            let atBottom=(this.nowPage-1)*onePageLines+this.nowLine+oneScreenLines-1>=this.totalLines;

            if(atTop&&(this.offsetY>0||vFoc>0)){
                let gap=Math.max(0,this.offsetY);
                vFoc*=0.7-0.7*(gap/76);
                this.offsetY+=vFoc;
                if(this.offsetY>=70){
                    this.springTo(0,'offsetY');
                    return;
                }
            }else if(atBottom&&(this.offsetY<0||vFoc<0)){
                let gap=Math.max(0,-this.offsetY);
                vFoc*=0.7-0.7*(gap/76);
                this.offsetY+=vFoc;
                if(this.offsetY<=-70){
                    this.springTo(0,'offsetY');
                    return;
                }
            }else{
                this.offsetY+=vFoc;
                if (vFoc>0) {
                    vFoc=Math.max(vFoc-5,0);
                }else {
                    vFoc=Math.min(vFoc+5,0);
                }
                this.checkPage();
            };
            if (Math.abs(vFoc) < 0.3) {
                this.clearAni();
                if((atTop&&(this.offsetY>0||vFoc>0)||(atBottom&&(this.offsetY<0||vFoc<0))))this.springTo(0,'offsetY');
            };
        };
        oneFrame();
        timer_ani=setInterval(oneFrame,33)
    },
    clearAni(){
        clearInterval(timer_ani);
        vFoc=0;
        focRunning=false;
        springing=false
    },
    springTo(target, prop, time=350, callback){
        this.clearAni();
        springing=true;
        const startValue=this[prop];
        const delta=target-startValue;
        if(delta===0){if(callback)callback();return;}
        const startTime=Date.now();
        const that=this;
        timer_ani=setInterval(()=>{
            const progress=Math.min((Date.now()-startTime)/time,1);
            const eased=1-Math.pow(1-progress,3);
            that[prop]=startValue+delta*eased;
            if(progress>=1){
                that[prop]=target;
                springing=false;
                this.clearAni();
                if(callback)callback();
            }
        },33);
    },
    clickPage(e){
        const y=e.globalY;
        if (this.barShow) {
            if (y<330) this.closeBar();
        }else if (y>85&&y<330) {
            this.openBar()
        };
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
        clearInterval(timer_autoMove);
        this.barIf=true;
        this.barShow=true;
        this.setArr[0]=Math.round(this.getProgress()*100);
        this.focusValue=this.setArr[this.target]/2;
        this.resetBarTimer();
    },
    closeBar(){
        clearTimeout(timer_bar);
        this.barShow=false;
        if (this.auto) {
            this.autoMove()
        };
        this.focusValue=25
    },
    changTarget(){
        this.target=(this.target+1)%2;
        this.focusValue=this.setArr[this.target]/2;
        this.resetBarTimer();
    },
    clickAuto(e){
        this.resetBarTimer();
        if (e.globalX<145) {
            this.auto=!this.auto;
            if (this.auto) {
                this.sendMsg('自动翻页已开启')
            }else {
                this.sendMsg('自动翻页已关闭')
            }
        }else {
            this.autoSpeed=(this.autoSpeed+1)%3
        }
    },
    setting(){
        //跳转设置页：temp保存阅读页面数据，返回时恢复
        Router.replace({
            uri:'/pages/setting/readSetting/readSetting',
            params:{
                backPage:'/pages/textViewer/hyper/hyper',
                temp:{
                    title:this.title,
                    uri:this.uri+'text.txt',
                    progress:this.getProgress(),
                    finalLines:this.finalLines,
                    totalPage:this.totalPage
                }
            }
        })
    },
    confirmPopup(){
        this.showPopup=false;
        saveData('tips_text',true);
        if (this.$refs.text.rotation) {
            this.$refs.text.rotation()
        };
        this.openBar()
    },
    grabTouch(){},
    close(e={type:'click'}){
        if (e.type=='click'){
            Router.replace({
                uri:'/pages/rowList/rowList',
                params:{
                    type:'text',
                    backRecord:true
                }
            })
        }else if (e.direction=='right'){
            if (!this.msg.timer) {
                this.sendMsg('再划一次退出')
            }else {
                Router.replace({
                    uri:'/pages/rowList/rowList',
                    params:{
                        type:'text',
                        backRecord:true
                    }
                })
            }
        }
    },
    getProgress(){
        if (!this.totalLines||!this.nowPage) return 0;
        const maxOffset=this.totalLines-oneScreenLines;
        if (maxOffset<=0) return 1;
        const offset=(this.nowPage-1)*onePageLines+this.nowLine-1;
        return Math.max(0,Math.min(offset/maxOffset,1));
    },
    saveProgress(callback){
        if (!this.totalLines||!this.nowPage) {
            callback&&callback();
            return;
        }
        const parts=this.uri.split('/');
        const idx=parts[parts.length-2];
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
