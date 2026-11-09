import Router from '@system.router';
import File from '@system.file';

export default {
    data: {
        backPage:'/pages/rowList/rowList',
        uri:'',
        aniArr:[],
        progress:0,
    },
    onInit(){
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
    //读取：分块读（UTF-8边界探测）→split分行
    startLoad(){
        this.progress=0;
        File.get({
            uri:this.uri,
            success:(info)=>{
                const total=info.length;
                let pos=0;
                let result='';
                const that=this;
                function readChunk(){
                    const chunkLen=Math.min(4096,total-pos);
                    if(chunkLen<=0){
                        that.done(result);
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
                                that.progress=total?Math.min(100,Math.floor(pos*100/total)):100;
                                setTimeout(readChunk,0);
                            },
                            fail:()=>that.done(result)
                        });
                    });
                };
                readChunk();
            },
            fail:()=>this.done('')
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
    //分割：第一行→nextText，后续→nextLines
    done(text){
        const lines=text.split('\n');
        if (lines.length&&lines[lines.length-1]==='') {
            lines.pop();//末尾\n产生的空行
        };
        const nextText=lines.length?lines[0]:'';
        const nextLines=lines.length>1?lines.slice(1):[];
        setTimeout(()=>{
            Router.replace({
                uri:'/pages/scriptEmulator/editor/editor',
                params:{
                    uri:this.uri,
                    nextText:nextText,
                    nextLines:nextLines,
                    backPage:this.backPage
                }
            })
        },150);//100%短暂停留增加仪式感
    }
}
