import File from '@system.file';
import Router from '@system.router';
import Device from '@system.device';
import lookupDict from '../../../common/lookupDictV5';
import { getData } from '../../../common/storage';
import { vibrate } from '../../../common/vibrate';

const key_en=[
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m",","]
];
const key_symbol=[
    ["`","~","@","#","%","&","*","-","^","+","=","$","×"],
    ["(",")","[","]","<",">","\\","|","/","_","±","≈"],
    [";",":","\"","‘","“","?","!",",",".","∞","π"]
];
const key_cnShift=[
    ["1","2","3","4","5","6","7","8","9","0"],
    ["《","》","~","…","—","（","）","‘","’"],
    ["“","”","；","：","！","？","、","。"]
];
const key_enShift=[
    ["1","2","3","4","5","6","7","8","9","0"],
    ["@","#","$","&","(",")","/","_","-"],
    ["'","\"",";",":","!","?","\\","."]
];
const key_syShift=[
    ["1","2","3","4","5","6","7","8","9","0","≠","￥","÷"],
    ["{","}","【","】","《","》","、","·","…","—","≤","≥"],
    ["；","：","'","’","”","？","！","，","。","∑","√"]
];
let timer_cursor;
let timer_operate;
let timer_line;
let timer_ani;
let timer_alert;
let timer_popup;
let moveType=1;
let oriX=0;
let oriY=0;
let disArr=[];
let timeArr=[];
let allowClose=false;

let updateCount=0; //候选刷新令牌：每次updateCandidates递增，回调中比对thisCount作废过期请求
let prefMap={};
let prefsDirty=false;
let saveOnExit=false;//仅“保存并退出”置true，直接退出不保存

const easeOutBack = t => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function getIndent(str){
    let i=0;
    while(i<str.length&&(str[i]===' '||str[i]==='\t'))i++;
    return str.slice(0,i);
};

function dedent(str){
    if(str[0]==='\t')return str.slice(1);
    let i=0;
    while(i<4&&str[i]===' ')i++;
    return str.slice(i);
};

function isCase(content){
    return content==='default:'||(content.indexOf('case ')===0&&content[content.length-1]===':');
};

function alignCase(str,lines){
    const indent=getIndent(str);
    const content=str.slice(indent.length);
    if(!isCase(content))return str;
    for(let i=lines.length-1;i>=0;i--){
        const prevIndent=getIndent(lines[i]);
        const prev=lines[i].slice(prevIndent.length);
        if(!prev)continue;
        if(prevIndent.length<indent.length)return prev.indexOf('switch')===0?str:dedent(str);
    }
    return str;
};

function dedentClosing(str,lines,closing){
    let result=dedent(str);
    if(closing!=='}')return result;
    const level=getIndent(result).length;
    for(let i=lines.length-1;i>=0;i--){
        const indent=getIndent(lines[i]);
        const content=lines[i].slice(indent.length);
        if(!content)continue;
        if(indent.length<level)break;
        if(indent.length===level&&isCase(content))return dedent(result);
    }
    return result;
};

export default {
    data: {
        fontColor:'#FFFFFF',

        uri:'',
        backPage:'',

        font:'HYQiHei-65S',
        numFont:'HarmonyOSCondensedClockTabular',

        displayKbd:true,//控制键盘展开、收起
        showKbd:true,//控制键盘暂时隐藏

        keyPos:0,//键盘位置
        keyType:1,//0中文1小写2大写3字符
        aniType:0,
        aniPos:0,
        aniDotPos:0,
        aniOpacity:0,

        prevLines:[],
        text:'',
        nextText:'',
        nextLines:[],
        showCursor:false,
        cursorSteady:false,
        popup:{
            text:'',
            left:0,
            top:0,
            lowerLimit:0
        },

        pinyin:'',
        pyList:[],
        pyFullList:[],
        shearList:[],

        alertIf:false,
        alertShow:false,
        confirmIf:false,
        confirmShow:false,
        dirty:false,
        showPy:true,//true拼音,false剪切板
        showCode:false,
        codeIdx:0,
        codeTitle: ['常用函数','WebAPI','Canvas','Math','Date','str','number','arr','obj','File','Storage','Sensor','Brightness','Device','App','Battery','Configuration','Router','Vibrator','Audio','Geolocation','Fetch','screenLock'],
        codeList:[],

        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {
        getData('script_style',(v)=>{this.fontColor=v;},'#FFFFFF');
        saveOnExit=false;
        Device.getInfo({
            success:(data)=>{
                if (data.apiVersion>=12){
                    this.font='HarmonyOS_Sans_SCGB2312-Bold'
                }else if (data.apiVersion>=10&&data.screenShape=='rect'){
                    this.font='HarmonyOSSans-Bold'
                };
            }
        });
        timer_cursor=setInterval(()=>this.showCursor=!this.showCursor,500);
        File.readText({
            uri:'internal://app/shear.json',
            success:(data)=>{
                if (data.text) {
                    this.shearList=JSON.parse(data.text)
                }
            }
        });
        this.loadPrefs();
        this.loadTemplates();
    },
    onDestroy(){
        clearInterval(timer_cursor);
        clearInterval(timer_operate);
        clearInterval(timer_line);
        clearInterval(timer_ani);
        clearTimeout(timer_alert);
        clearTimeout(timer_popup);
        clearTimeout(this.msg.timer);
        if(prefsDirty)this.savePrefs();
        if (this.shearList.length) {
            File.writeText({
                uri:'internal://app/shear.json',
                text:JSON.stringify(this.shearList)
            })
        }
        //仅“保存并退出”时写入
        if (saveOnExit && this.uri) {
            let code=this.prevLines.join('\n');
            if (this.prevLines.length > 0) code+='\n';
            code+=this.text+this.nextText;
            if (this.nextLines.length) code+='\n'+this.nextLines.join('\n');
            File.writeText({
                uri:this.uri,
                text:code,
                fail:()=>{}
            })
        }
    },
    onHide(){
        this.stopOperate();
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
        if (this.$refs.shear.rotation) {
            this.$refs.shear.rotation({focus:false})
        };
        if (this.$refs.py.rotation) {
            this.$refs.py.rotation({focus:false})
        };
        if (this.$refs.code.rotation) {
            this.$refs.code.rotation({focus:false})
        };
    },
    onShow(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    scrollStart(){
        allowClose=true;
    },
    close(e={type:'click'}){
        if (e.type == 'click' || e.direction == 'right') {
            if (this.alertShow)this.closeAlert();
            else if (this.displayKbd) {
                this.closeKbd();
            }
            else if (this.confirmShow)this.closeExitConfirm()
            else if (this.dirty) {
                this.showExitConfirm();
            }else {
                this.jumpBackPage();
            }
        }
    },
    switchKbd(){
        this.displayKbd=!this.displayKbd
    },
    openKbd(){
        this.displayKbd=true;
    },
    closeKbd(){
        this.displayKbd=false;
    },
    appearKbd(){
        this.showKbd=true;
        if (allowClose) {
            this.close();
            allowClose=false;
        }
    },
    hideKbd(){
        this.showKbd=false;
    },

    run(){
        let code = this.prevLines.join('\n');
        if (this.prevLines.length > 0) code += '\n';
        code += this.text + this.nextText;
        if (this.nextLines.length) code += '\n' + this.nextLines.join('\n');
        $app.getHost().uri=this.uri;
        $app.getHost().backPage=this.backPage;
        const start=()=>{
            Router.replace({
                uri: '/pages/scriptEmulator/simulator/simulator',
                params: {
                    fn: code
                }
            });
        };
        if (this.uri) {
            File.writeText({
                uri:this.uri,
                text:code,
                success:start,
                fail:start
            })
        }else {
            start();
        }
    },
    code(e){
        if (e.globalX>200) {
            this.showCode=true;
            this.alertIf=true;
            this.alertShow=true;
            if (this.$refs.code.rotation) {
                this.$refs.code.rotation()
            };
        }
    },
    changeCode(idx){
        if (this.alertShow&&this.showCode) {
            this.codeIdx=idx
        }
    },

    showPopup(w,row,line,time=200){
        clearTimeout(timer_popup);
        this.popup.left=row*57+29*line+this.keyPos-16;
        this.popup.top=line*60+145;
        this.popup.lowerLimit=0;
        this.popup.text=w;
        timer_popup=setTimeout(()=>{
            this.popup.text='';
        },time)
    },
    click(e){
        const line=Math.floor((e.globalY-230)/60);
        if (line<0||line>2||e.globalX-this.keyPos-29*line<0)return;
        const row=Math.floor((e.globalX-this.keyPos-29*line)/57);
        if (row<0||row>(this.keyType==3?12:9)-line)return;
        let word='';
        switch (this.keyType){
            case 3:
                word=key_symbol[line][row];
                break
            case 2:
                word=key_en[line][row].toUpperCase();
                break
            case 1:
                word=key_en[line][row];
                break
            case 0:
                if (line==2&&row==7) {
                    if (this.pinyin) {
                        this.clearCandidates()
                    };
                    word='，';
                }else {
                    word=key_en[line][row];
                    this.pinyin+=word;
                    this.showPopup(word,row,line);
                    this.updateCandidates();
                    return
                }
        };
        this.input(word);
        this.showPopup(word,row,line);
    },
    getShiftText(line,row){
        switch (this.keyType){
            case 3:
                return key_syShift[line][row]
                break
            case 0:
                if (this.pinyin) {
                    this.clearCandidates()
                };
                return key_cnShift[line][row]
                break
            default:
                return key_enShift[line][row]
        };
    },
    press(e){
        const line=Math.floor((e.globalY-230)/60);
        if (line<0||line>2||e.globalX-this.keyPos-29*line<0)return;
        const row=Math.floor((e.globalX-this.keyPos-29*line)/57);
        if (row<0||row>(this.keyType==3?12:9)-line)return;
        let word=this.getShiftText(line,row);
        this.input(word);
        this.showPopup(word,row,line,300);
        vibrate();
    },
    //选中候选词：写入文本、消费拼音、刷新MTF偏好与候选
    clickCn(id){
        const obj=this.pyFullList.length?this.pyFullList[Math.floor(id/4)][id%4]:this.pyList[id];
        if (!obj)return;
        this.closeAlert();
        //偏好：键内去重unshift，上限3
        const fullPinyin=this.pinyin;
        const existing=prefMap[fullPinyin]||[];
        for(let i=0;i<existing.length;i++){
            if(existing[i].word===obj.word){existing.splice(i,1);break}
        };
        existing.unshift(obj);
        if(existing.length>3)existing.length=3;
        //键级LRU：delete+re-insert移到最新位，满100删最旧键
        delete prefMap[fullPinyin];
        if(Object.keys(prefMap).length>=100){
            delete prefMap[Object.keys(prefMap)[0]];
        };
        prefMap[fullPinyin]=existing;
        prefsDirty=true;

        //写入文本
        this.input(obj.word);
        //消费拼音：len>0按词长截断，len=0（未命中）清空全部拼音
        if(obj.len>0){
            this.pinyin=this.pinyin.substring(obj.len);
        }else{
            this.pinyin='';
        };
        this.updateCandidates();
    },
    clickSpace(){
        if(this.pinyin){
            this.clearCandidates()
        }else{
            this.input(' ');
        }
    },
    pressText(){
        if (!this.text) {
            this.sendMsg('请先输入文本');
            return
        };
        this.shearList.unshift(this.text);
        if (this.shearList.length>15)this.shearList.length=15;
        vibrate()
        this.sendMsg('已复制')
    },
    pressDelete(){
        clearInterval(timer_operate);
        this.cursorSteady=true;
        vibrate()
        this.delete();
        timer_operate=setInterval(this.delete,40)
    },
    stopOperate(){
        this.cursorSteady=false;
        clearInterval(timer_operate);
    },
    pressFn(e){
        this.stopOperate();
        let idx=Math.floor((e.globalX-10)/75);
        switch (idx){
            case 0://向左移动光标
                this.cursorLeft();
                timer_operate=setInterval(this.cursorLeft,40);
                this.cursorSteady=true;
                vibrate()
                break
            case 3://向右移动光标
                this.cursorRight();
                timer_operate=setInterval(this.cursorRight,40);
                this.cursorSteady=true;
                vibrate()
                break
        }
    },
    clickFn(e){
        this.stopOperate();
        let idx=Math.floor((e.globalX-10)/75);
        switch (idx){
            case 0://向左移动光标
                this.cursorLeft();
                break
            case 1:
                this.incKeyboard();
                break//切换键盘
            case 2:
                this.showPy=false;
                this.alertIf=true;
                this.alertShow=true;
                if (this.$refs.shear.rotation) {
                    this.$refs.shear.rotation()
                };
                break //剪切板弹窗
            case 3://向右移动光标
                this.cursorRight();
                break
        }
    },
    scrollTo(){
        this.$refs.list.scrollTo({index:this.prevLines.length});
    },
    //输入、删除、换行、光标移动逻辑
    input(w){
        if (!w) {
            this.closeAlert();
            return;
        };
        // 正常输入
        if (w.length == 1) {
            // 自动补全括号
            const pairs = {'{': '}', '[': ']', '(': ')'};
            if (pairs[w]) {
                this.text += w + pairs[w];
                // 光标回退到括号中间
                this.nextText = this.text[this.text.length - 1] + this.nextText;
                this.text = this.text.slice(0, -1);
                this.dirty=true;
                return;
            }
            // 自动跳过右括号（如果下一个字符就是要输入的右括号）
            if (w === '}' || w === ']' || w === ')') {
                const before=this.text;
                if(getIndent(this.text)===this.text)this.text=dedentClosing(this.text,this.prevLines,w);
                if (this.nextText[0] === w) {
                    this.text += w;
                    this.nextText = this.nextText.slice(1);
                    if (this.text !== before + w) this.dirty=true;
                    return;
                }
            };
            this.text += w;
            this.dirty=true;
        }else {
            const lines=w.split('\n');
            for(let i=0;i<lines.length;i++){
                if(i>0)this.enter();
                let line=lines[i];
                let first=0;
                while(first<line.length&&(line[first]===' '||line[first]==='\t'))first++;
                if(i>0&&(line[first]==='}'||line[first]===']'||line[first]===')'))this.text=dedentClosing(this.text,this.prevLines,line[first]);
                this.text+=line;
            };
            this.dirty=true;
        };
        this.closeAlert();
    },
    //结束或截断该段的编辑，创建新段
    enter(){
        if (this.pinyin) {
            this.clearCandidates()
            return;
        };
        this.dirty=true;
        // 取当前行缩进
        this.text=alignCase(this.text,this.prevLines);
        let indent=getIndent(this.text);
        let lastChar = this.text[this.text.length - 1];
        // 行末是 { [ ( : 则增加缩进
        let extra = '';
        if (lastChar === '{' || lastChar === '[' || lastChar === '(' || lastChar === ':') extra = '    ';
        this.prevLines.push(this.text);
        this.text = indent + extra;
        this.scrollTo()
    },
    delete(){
        //拼音删除相关
        if (this.pinyin) {
            this.pinyin=this.pinyin.slice(0,-1);
            this.updateCandidates()
            return;
        };
        //行内删除
        if (this.text) {
            //如果text有内容，就类似输入删字一样拉字
            this.text=this.text.slice(0,-1);
            this.dirty=true;
        }else {
            //行间删除，将当前行于上一行合并
            if (!this.prevLines.length)return;
            this.text=this.prevLines[this.prevLines.length-1];
            this.prevLines.pop();
            this.dirty=true;
            this.scrollTo()
        };
    },
    cursorLeft(){
        //将text中字符拉到nextText中，以实现光标移动效果
        //行内移动
        if (this.text) {
            this.nextText=this.text[this.text.length-1]+this.nextText;
            this.text=this.text.slice(0,-1)
        }else {
            //行间移动,此时无text,当前行压入nextLines,读上一行到当前行
            if (!this.prevLines.length)return;
            this.jumpPrevLine();
            this.scrollTo()
        }
    },
    cursorRight(){
        //行内移动
        if (this.nextText) {
            this.text+=this.nextText[0];
            this.nextText=this.nextText.slice(1);
        }else {
            //行间移动,此时无nextText,当前行压入prevLines,读下一行到当前行
            if (!this.nextLines.length)return;
            this.jumpNextLine();
            this.scrollTo()
        }
    },
    jumpToLine(idx){
        //光标跳转到指定行（行号从0开始），停在行末
        if (idx==this.prevLines.length)return
        clearInterval(timer_line);
        this.cursorSteady=true;
        timer_line=setInterval(()=>{
            const nowLine=this.prevLines.length;
            if (idx==nowLine) {
                this.cursorSteady=false;
                clearInterval(timer_line);
                return
            };
            if (idx>nowLine) {
                if (!this.nextLines.length)return;
                this.jumpNextLine()
            }else {
                if (!this.prevLines.length)return;
                this.jumpPrevLine()
            };
        },40)
    },
    jumpPrevLine(){
        if (!this.prevLines.length)return;
        this.nextLines.unshift(this.text+this.nextText);
        this.nextText='';
        this.text=this.prevLines[this.prevLines.length-1];
        this.prevLines.pop();
    },
    jumpNextLine(){
        if (!this.nextLines.length)return;
        this.prevLines.push(this.text+this.nextText);
        this.text='';
        this.nextText=this.nextLines[0];
        this.nextLines.shift();
    },

    //弹窗相关
    expandPy(e){
        if (e.globalX>55)return;
        clearTimeout(timer_alert);
        if (this.pyFullList.length==0){
            timer_alert=setTimeout(()=>{
                this.searchWithFallback(updateCount,this.pinyin.toLowerCase(),[],{},100);
            },300)//弹窗打开存在300ms动画
        };
        this.showPy=true;
        this.alertShow=true;
        this.alertIf=true;
        if (this.$refs.py.rotation) {
            this.$refs.py.rotation()
        };
    },
    closeAlert(e={type:'click'}){
        if(e.type=='click'||(e.direction=='right'&&e.distance>=200)){
            clearTimeout(timer_alert);
            this.alertShow=false;
            this.showCode=false;
            if (this.$refs.list.rotation) {
                this.$refs.list.rotation()
            };
        }
    },
    showExitConfirm(){
        this.confirmIf=true;
        this.confirmShow=true;
    },
    closeExitConfirm(){
        this.confirmShow=false;
        setTimeout(()=>{this.confirmIf=false;},280);
    },
    discardAndExit(){
        saveOnExit=false;
        this.jumpBackPage()
    },
    saveAndExit(){
        //保存统一在onDestroy，这里仅标记
        saveOnExit=true;
        this.jumpBackPage()
    },
    jumpBackPage(){
        let obj={};
        if (this.backPage=='/pages/rowList/rowList') {
            obj={
                type:'script',
                backRecord:true
            }
        }else if (this.backPage=='/pages/file/fileList/fileList') {
            obj={
                backKey:true
            }
        };
        Router.replace({
            uri:this.backPage,
            params:obj
        })
    },
    //键盘移动逻辑
    touchStart(e){
        clearInterval(timer_ani);
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
                this.aniDotPos=0;
            }else{
                this.keyPos=this.aniPos+408;
                this.aniDotPos=100;
            };
            this.aniPos=0;
            this.aniOpacity=0;
        };
        if (e.direction=='up') {
            moveType=2;
            const line=Math.floor((e.globalY-230)/60);
            if (line<0||line>2||e.globalX-this.keyPos-29*line<0)return;
            const row=Math.floor((e.globalX-this.keyPos-29*line)/57);
            if (row<0||row>(this.keyType==3?12:9)-line)return;
            clearTimeout(timer_popup);
            this.popup.left=row*57+29*line+this.keyPos-16;
            this.popup.top=line*60+125;
            this.popup.lowerLimit=line*60+125;
            this.popup.text=this.getShiftText(line,row);
        }else {
            moveType=1;
            timeArr.unshift(e.timestamp);
        };
        oriX=e.globalX;
        oriY=e.globalY;
    },
    touchMove(e){
        if (moveType==2){
            this.popup.top+=e.globalY-oriY;
        }else {
        let maxLimit=this.keyType==3?-333:-162;
        let distance=0;
        distance=e.globalX-oriX;
        if (this.keyPos>=0&&distance>0) {
            let gap=this.keyPos;
            this.keyPos=Math.min(120,this.keyPos+distance*0.6*Math.max(0,1-gap/125))
        }else if (this.keyPos<=maxLimit&&distance<0) {
            let gap=maxLimit-this.keyPos;
            this.keyPos=Math.max(maxLimit-120,this.keyPos+distance*0.6*Math.max(0,1-gap/125))
        }else {
            this.keyPos+=distance;
        };
        disArr.unshift(distance);
        timeArr.unshift(e.timestamp);
        if(timeArr.length>4)timeArr.length=4;
        if(disArr.length>3)disArr.length=3;
        };
        oriX=e.globalX;
        oriY=e.globalY;
    },
    touchEnd(){
        let maxLimit=this.keyType==3?-333:-162;
        //结束时的处理
        if (moveType==2){
            this.input(this.popup.text);
            this.popup.text='';
        }else if (this.keyPos>0) {
            if(this.keyPos>80)this.decKeyboard();
            else this.back(0);
        }else if (this.keyPos<maxLimit){
            if(this.keyPos<maxLimit-80 )this.incKeyboard();
            else this.back(maxLimit)
        }else this.inertia()
        disArr.length=0;
        timeArr.length=0;
        moveType=1;
    },
    //惯性动画
    inertia(){
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
            if (totalTime<=0||totalDist==0)return;
            let v=Math.sign(totalShift)*Math.min(totalDist / totalTime,12);

            clearInterval(timer_ani);
            let vel = v * 22; // px/ms → px/帧
            const that=this;
            let oneFrame;
            let maxLimit=this.keyType==3?-333:-162;
            oneFrame=()=>{
                if (that.keyPos>=0) {
                    let gap=that.keyPos;
                    vel*=0.5-0.5*(gap/40);
                    that.keyPos+=vel;
                    if (that.keyPos>=40) {
                        that.back(0);
                        return;
                    };
                }else if(that.keyPos<=maxLimit){
                    let gap=maxLimit-that.keyPos;
                    vel*=0.5-0.5*(gap/40);
                    that.keyPos+=vel;
                    if (that.keyPos<=maxLimit-40) {
                        that.back(maxLimit);
                        return;
                    };
                }else {
                    that.keyPos+=vel;
                    vel *= 0.5;
                };
                if (Math.abs(vel) < 0.3) {
                    if (that.keyPos > 0) {
                        that.back(0);
                    } else if (that.keyPos <=maxLimit) {
                        that.back(maxLimit);
                    }else clearInterval(timer_ani);
                };
            };
            if (!oneFrame)return;
            oneFrame();
            timer_ani = setInterval(oneFrame, 33);
        };
    },
    //移动动画
    back(end){
        clearInterval(timer_ani);
        const that=this;
        let lastTime=Date.now();
        const getStep=()=>{
            const now=Date.now();
            const step=1-Math.pow(0.6,Math.min((now-lastTime)/22,4));
            lastTime=now;
            return step;
        };
        let fn;
        fn=() => {
            const diff = end - that.keyPos;
            if (Math.abs(diff) < 0.1) {
                that.keyPos = end;
                clearInterval(timer_ani);
            } else {
                that.keyPos += diff * getStep();
            }};
        timer_ani = setInterval(fn, 33);
    },
    //左滑
    incKeyboard(){
        if (this.pinyin) {
            this.clearCandidates()
        };
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
            }else{
                this.keyPos=this.aniPos+408;
            };
        };
        this.aniType=(this.keyType+1)%4;
        this.aniPos=this.keyType==3?741:570;
        this.aniOpacity=0;
        this.aniDotPos=100;
        this.move(this.keyType==3?-741:-570,0)
    },
    //右滑
    decKeyboard(){
        if (this.pinyin) {
            this.clearCandidates()
        };
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
            }else{
                this.keyPos=this.aniPos+408;
            };
        };
        this.aniType=(this.keyType+3)%4;
        this.aniPos=this.aniType==3?-741:-570;
        this.aniOpacity=0;
        this.aniDotPos=0;
        this.move(408,100);
    },
    move(target_key,target_dot){
        clearInterval(timer_ani);
        const duration=500;
        const start_key=this.keyPos;
        const start_dot=this.aniDotPos;
        const startTime=Date.now();
        timer_ani=setInterval(()=>{
            const t=(Date.now()-startTime)/duration;
            if(t>=1){
                clearInterval(timer_ani);
                this.keyPos=target_key;
                this.aniDotPos=target_dot;
                this.keyType=this.aniType;
                this.keyPos=this.aniPos+this.keyPos;
                this.aniPos=0;
                this.aniOpacity=0;
            }else{
                const d=easeOutBack(t);
                this.aniOpacity=d;
                this.keyPos=start_key+(target_key-start_key)*d;
                this.aniDotPos=start_dot+(target_dot-start_dot)*d;
            }
        },33);
    },
    //拼音候选搜索
    clearCandidates(){
        this.pyFullList=[];
        this.pyList=[];
        this.input(this.pinyin);
        this.pinyin='';
        updateCount++;
        if (this.alertShow) this.closeAlert();
    },
    updateCandidates(){
        this.pyFullList=[];
        if (this.alertShow) this.closeAlert();
        if(!this.pinyin)return;
        this.searchWithFallback(++updateCount,this.pinyin.toLowerCase(),[],{});
    },
    searchWithFallback(thisUpdateCount, key, allCandidates, seenWords ,length=20) {
        if (thisUpdateCount !== updateCount) return;
        // 递归终止条件
        if (!key || allCandidates.length >= length) {
            if (length==20) {
                this.pyList=this.applyPrefs(allCandidates)
            }else this.setExpandedCandidate(this.applyPrefs(allCandidates))
            return;
        };
        lookupDict.lookupDict(
            "internal://app/rawfile/pinyinDictV5_20260416",
            key,
            (actualKey, actualValue) => {
                if (thisUpdateCount !== updateCount) return;
                if (actualValue) {
                    actualValue.split(" ").slice(0, length - allCandidates.length).forEach(word => {
                        if (!seenWords[word]) {
                            seenWords[word] = true;
                            allCandidates.push({ word: word, len: actualKey.length });
                        }
                    });
                };
                if (allCandidates.length < length && actualKey && actualKey.length > 1) {
                    setTimeout(() => this.searchWithFallback(thisUpdateCount, actualKey.substring(0, actualKey.length - 1), allCandidates, seenWords, length), 0);
                } else {
                    if (length==20) {
                        this.pyList=this.applyPrefs(allCandidates)
                    }else this.setExpandedCandidate(this.applyPrefs(allCandidates))
                }
            }
        );
    },
    applyPrefs(allCandidates){
        const prefs=prefMap[this.pinyin];
        if(prefs&&prefs.length>0&&allCandidates.length>0){
            for(let p=0;p<prefs.length;p++){
                for(let i=0;i<allCandidates.length;i++){
                    if(allCandidates[i].word===prefs[p].word){
                        allCandidates.splice(i,1);
                        break;
                    }
                }
            };
            return prefs.concat(allCandidates);
        };
        return allCandidates;
    },
    setExpandedCandidate(candidates){
        let arr=[];
        for (let i = 0; i < candidates.length; i+=4) {
            arr.push([
                candidates[i]?candidates[i]:'',
                candidates[i+1]?candidates[i+1]:'',
                candidates[i+2]?candidates[i+2]:'',
                candidates[i+3]?candidates[i+3]:'',
            ]);
        };
        this.pyFullList=arr;
    },
    loadPrefs(){
        File.get({
            uri:"internal://app/pyref.json",
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0)return;
                let pos=0;
                let result="";
                function readChunk(){
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{prefMap=JSON.parse(result)}catch(e){prefMap={}};
                        return;
                    }
                    File.readText({
                        uri:"internal://app/pyref.json",
                        position:pos,
                        length:chunkLen,
                        success:(data)=>{
                            result+=data.text;
                            pos+=chunkLen;
                            setTimeout(readChunk,0);
                        },
                        fail:()=>{prefMap={}}
                    });
                }
                readChunk();
            },
            fail:()=>{}
        });
    },
    loadTemplates(){
        File.get({
            uri:"internal://app/rawfile/templates.json",
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0)return;
                let pos=0;
                let result="";
                let that=this;
                function readChunk(){
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{
                            let data=JSON.parse(result);
                            that.codeList=data;
                        }catch(e){};
                        return;
                    }
                    File.readText({
                        uri:"internal://app/rawfile/templates.json",
                        position:pos,
                        length:chunkLen,
                        success:(data)=>{
                            result+=data.text;
                            pos+=chunkLen;
                            setTimeout(readChunk,0);
                        },
                        fail:()=>{}
                    });
                }
                readChunk();
            },
            fail:()=>{}
        });
    },
    savePrefs(){
        let json=JSON.stringify(prefMap);
        let escaped="";
        for(let i=0;i<json.length;i++){
            const code=json.charCodeAt(i);
            if(code>127){
                const hex=code.toString(16);
                let padded="";
                for(let p=hex.length;p<4;p++)padded+="0";
                escaped+="\\u"+padded+hex;
            }else{
                escaped+=json[i];
            }
        }
        File.writeText({
            uri:"internal://app/pyref.json",
            text:escaped,
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
    grabTouch(){}
};
