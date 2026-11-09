import Router from '@system.router';
import File from '@system.file';

const numOfLists=370/30;
let nextLineWArr=[];//后续行每段的宽度（反转：最后一项=文首段）
let nextTextWidth=0;

// 字符宽度表（真机实测，0x00-0x7F + 0xB7）
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
    return cw!==undefined?Math.ceil(cw*30-1e-6)/30:1;//对齐text组件换行算法：比例×30向上取整（-1e-6消除浮点误差）
};

export default {
    data: {
        uri:'',
        backPage:'/pages/index/index',
        maxLen:8192,//导入总字节上限
        name:'',
        aniArr:[],
        progress:0,
        nextLines:'',
        nextText:'',
    },
    onInit(){
        this.name=this.uri.slice(Math.max(this.uri.lastIndexOf('/'),this.uri.lastIndexOf('\\'))+1);
        let i=0;
        let arr=[];
        while (i<=35){
            arr.push({src:'/common/loading/'+i+'.png'})
            i++
        };
        this.aniArr=arr;
    },
    onShow(){
        this.startLoad();
    },
    //读取：File.get检查上限→分块读（UTF-8边界探测）→分行
    startLoad(){
        this.progress=0;
        File.get({
            uri:this.uri,
            success:(info)=>{
                const truncated=info.length>this.maxLen;
                const total=Math.min(info.length,this.maxLen);
                let pos=0;
                let result='';
                const that=this;
                function readChunk(){
                    const chunkLen=Math.min(4096,total-pos);
                    if(chunkLen<=0){
                        that.done(result,truncated);
                        return;
                    };
                    that.probeStart(pos,chunkLen,(p,l)=>{
                        File.readText({
                            uri:that.uri,
                            position:p,
                            length:l,
                            success:(data)=>{
                                result+=data.text;
                                pos+=l;
                                setTimeout(readChunk,0);
                            },
                            fail:()=>that.done(result,truncated)
                        });
                    });
                };
                readChunk();
            },
            fail:()=>this.done('',false)
        });
    },
    //UTF-8边界探测：position落在多字节字符中间时跳过，参考normal阅读器
    probeStart(pos, len, fn, retry=0){
        if (retry>=3) {
            fn(pos,len);
            return;
        };
        File.readText({
            uri:this.uri,
            position:pos,
            length:1,
            success:(data)=>{
                const code=data.text.charCodeAt(0);
                if (code>=0x80&&code<=0xBF) {
                    this.probeStart(pos+1,len-1,fn,retry+1);
                }else {
                    fn(pos,len);
                }
            },
            fail:()=>fn(pos,len)
        });
    },
    //分割：过滤\r，分片累计段宽（防阻塞+进度），完成后反转arr并压入nextLines
    splitToNextLines(text, callback){
        let s=text.split('\r').join('');
        if (s[s.length-1]!='\n') s+='\n';//末尾补\n，保证末段以段尾结束（滑动下边界计算正确）
        const total=s.length;
        const step=512;//每片字符数
        let pos=0;
        let w=0;
        const arr=[];
        const that=this;
        function chunk(){
            const end=Math.min(pos+step,total);
            for(let i=pos;i<end;i++){
                const ch=s[i];
                const cw=getFontWidth(ch);
                if(ch=='\n'){
                    arr.push(w);
                    w=0;
                    continue;
                };
                w+=cw;
            };
            pos=end;
            that.progress=total?Math.min(100,Math.floor(pos*100/total)):100;
            if(pos<total){
                setTimeout(chunk,20);
                return;
            };
            arr.reverse();
            nextLineWArr=arr;
            nextTextWidth=0;
            that.nextLines=s;
            that.nextText='';
            callback&&callback();
        };
        setTimeout(chunk,20)
    },
    //从nextLines抽字补充到nextText，直到把当前行填充满
    pullAllNext(){
        let idx=0;
        const s=this.nextLines;
        while (idx<s.length){
            const ch=s[idx++];
            this.nextText+=ch;
            const cw=getFontWidth(ch);
            if(ch=='\n'){
                nextLineWArr.pop();
                this.nextLines=s.substring(idx);
                return;
            };
            nextTextWidth+=cw;
            nextLineWArr[nextLineWArr.length-1]-=cw;
            if(nextTextWidth>numOfLists){
                const back=this.nextText[this.nextText.length-1];
                this.nextText=this.nextText.slice(0,-1);
                nextTextWidth-=cw;
                nextLineWArr[nextLineWArr.length-1]+=cw;
                this.nextLines=back+s.substring(idx);
                return;
            };
        };
        this.nextLines='';
    },
    done(text,truncated){
        this.splitToNextLines(text,()=>{
            this.pullAllNext();
            setTimeout(()=>{
                Router.replace({
                    uri:'/pages/textEditor/editor/editor',
                    params:{
                        uri:this.uri,
                        backPage:this.backPage,
                        nextLines:this.nextLines,
                        nextText:this.nextText,
                        nextLineWArr:nextLineWArr,
                        truncated:truncated
                    }
                })
            },150);//100%短暂停留增加仪式感
        });
    }
}
