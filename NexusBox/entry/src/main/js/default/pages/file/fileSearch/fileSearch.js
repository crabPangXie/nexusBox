import Router from '@system.router';
import File from '@system.file';

let timer_set,timer_jump;
let searching=false;

export default {
    data: {
        rootPath:$app.getRootPath(),

        keyWord:null,
        search_finished:false,
        fileArr:[],
        list:[],
        nowUri:'',
        foundNum:0,
        closing:false,

        showJump:false,
        aniArr:[],

        msg:{
            content:'',
            timer:null
        }
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
        if (!this.keyWord) {
            this.loadSearch((obj)=>{
                if (obj&&obj.list&&obj.list.length>0) {
                    this.keyWord=obj.key;
                    this.fileArr=obj.list;
                    this.foundNum=this.fileArr.length;
                    this.search_finished=true;
                    this.list=[];
                    this.load();
                    if (this.$refs.list.rotation) {
                        this.$refs.list.rotation()
                    };
                }else this.startSearch();
            })
        }else this.startSearch();
    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },

    onDestroy(){
        if (searching) searching=false;
        clearTimeout(this.msg.timer);
        clearTimeout(timer_set);
        clearTimeout(timer_jump);
        if (this.keyWord) this.saveSearch();//有搜索词才保存，防止覆盖有效历史
    },
    saveSearch(){
        //直接保存UTF-8（跳过转义循环，避免大结果集同步遍历卡顿）；读取端用边界探测防截断
        File.writeText({
            uri:'internal://app/fileSearch',
            text:JSON.stringify({
                key:this.keyWord,
                list:this.fileArr
            }),
        });
    },
    loadSearch(callback){
        File.get({
            uri:'internal://app/fileSearch',
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0){
                    callback?.(null);
                    return;
                }
                let pos=0;
                let result="";
                const that=this;
                function readChunk(){
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{
                            callback?.(JSON.parse(result))
                        }catch(e){
                            callback?.(null);
                        };
                        return;
                    }
                    that.probeStart(pos,chunkLen,(p,l)=>{
                        File.readText({
                            uri:'internal://app/fileSearch',
                            position:p,
                            length:l,
                            success:(data)=>{
                                result+=data.text;
                                pos+=l;
                                setTimeout(readChunk,0);
                            },
                            fail:()=>{
                                callback?.(null);
                            }
                        });
                    });
                }
                readChunk();
            },
            fail:()=>{
                callback?.(null);
            }
        });
    },
    //UTF-8边界探测：position落在多字节字符中间时跳过，防止分块截断中文
    probeStart(pos, len, fn, retry=0){
        if (retry>=3) {
            fn(pos,len);
            return;
        };
        File.readText({
            uri:'internal://app/fileSearch',
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

    search(){
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/file/fileSearch/fileSearch',
                backPage:'/pages/file/startSearch/startSearch',
                targetKey:'keyWord',
                prompt:'请输入搜索内容',
                maxLen:128,
                forbidden:"\"*+,:;<=>?[]\\",
                allowNewline:false,
                keyType:1,
            }
        })
    },
    getRealUri(uri){
        return this.rootPath+uri
    },
    getMiniUri(uri){
        const parts =uri.split('/');
        parts.shift();
        if (parts.length <= 2) return uri;
        let dots = '';
        for (let i = 0; i < parts.length - 2; i++) {
            dots += '.';
        };
        const result = '/'+parts[0]+'/'+dots+'/'+parts[parts.length - 1];
        return result;
    },
    startSearch(){
        if (!this.keyWord) {
            this.sendMsg('请先输入搜索内容');
            return;
        };
        searching=true;
        this.fileArr=[];
        let taskList=[{uri:'',type:1,name:''}];
        let result=[];
        const schedule=()=>{
            if (taskList.length > 0&&searching) {
                setTimeout(()=>countOne(taskList.shift()), 0);
            } else {
                this.search_finished=true;
                this.nowUri=null;
                timer_set=setTimeout(()=>{
                    if (this.$refs.list.rotation) {
                        this.$refs.list.rotation()
                    };
                    this.fileArr=result;
                    this.list=[];
                    this.load();
                },50)
                if (searching) {
                    this.sendMsg('共找到'+this.foundNum+'项文件')
                };
                searching=false;
            }
        };
        const countOne=(obj)=>{
            this.nowUri=this.getMiniUri(obj.uri);
            if (obj.name.indexOf(this.keyWord)!==-1){
                result.push(obj);
                this.foundNum++;
            };
            if (obj.type) {
                File.list({
                    uri:this.getRealUri(obj.uri),
                    success:(data)=>{
                        const list=data.fileList;
                        list.forEach((element)=>{taskList.push({
                            uri:obj.uri+'/'+element.uri,
                            type:Number(element.type=='dir') ,
                            name:element.uri
                        })});
                        schedule();
                    },
                    fail:()=>schedule()
                })
            }else schedule()
        };
        schedule();
    },
    //懒加载：滚动到底部追加10条（rowList同款）
    load(){
        if (this.list.length<this.fileArr.length) {
            const end=Math.min(this.list.length+10,this.fileArr.length);
            let arr=[];
            for (let i = this.list.length; i < end; i++) {
                arr.push(this.fileArr[i]);
            };
            this.list=this.list.concat(arr);
        }
    },
    jumpToList(idx){
        if (this.closing) return;
        this.showJump=true;
        this.closing=true;
        const outUri=this.fileArr[idx].uri.slice(0,this.fileArr[idx].uri.lastIndexOf('/'));
        this.list=[];//清列表释放UI线程占用
        timer_jump=setTimeout(()=>{
            File.list({
                uri:this.getRealUri(outUri),
                success:(data)=>{
                    const name=this.fileArr[idx].name.toLowerCase();
                    let targetId=-1;
                    for (let i=0;i<data.fileList.length;i++){
                        if (data.fileList[i].uri.toLowerCase()==name){
                            targetId=i;
                            break}};
                    Router.replace({
                        uri:'/pages/file/fileList/fileList',
                        params:{
                            uri:outUri,
                            backPage:'/pages/file/fileSearch/fileSearch',
                            routerIdx:targetId
                        }
                    });
                }
            });
        },200)
    },
    close(e={type:'click'}){
        if (this.closing) return;
        if (e.direction=='right'||e.type=='click') {
            if (searching) {
                searching=false;
                this.sendMsg('扫描任务已停止');
                return
            };
            this.closing=true;
            Router.replace({
                uri:'/pages/file/startSearch/startSearch'
            })
        }
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
}