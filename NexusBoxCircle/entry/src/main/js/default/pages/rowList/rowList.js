import Router from '@system.router';
import File from '@system.file';
import { getData, saveData } from '../../common/storage';
import { vibrate } from '../../common/vibrate';

let fileNum=[0,0,0,0,0];
let timer_ani;
export default {
    data: {
        font:$app.getData().font,
        listFont:($app.getData().apiVersion>11?'HarmonyOS_Sans_SCGB2312-Bold':'HarmonyOSHans-Medium'),
        openIdx:-1,
        openAni:0,
        iconIdx:2,
        fileList:[],
        num:0,
        maxPage:0,
        page:0,
        jumpToEnd:null,
        backRecord:false,
        recordPos:0,
        recordReady:false,
        list:[],
        type:'note',
        titleList:{
            text:'我的文档',
            script:'我的脚本',
            note:'我的笔记'
        },
        chosenIdx:-1,
        dirty:false,
        menu:{
            x:0,
            y:0
        },
        menuAni:0,

        newName:null,
        backKey:false,
        msg:{
            content:'',
            timer:null
        },

        bgdColor:['#4F8FBF','#438F9F','#478F80','#5A906C','#7A9850','#A88C3F','#C07A52','#C06A76','#9A6FA8','#657A9E']
    },
    onInit() {
        getData('fileNum',(arr)=>{fileNum=arr},[0,0,0,0,0]);
        const iconMap={text:2,script:5,note:6};
        this.iconIdx=iconMap[this.type]||2;
        if (this.backRecord) {
            getData('list_'+this.type+'Record',(v)=>{
                this.page=Math.floor((v||0)/10);
                this.recordPos=(v||0)%10;
                this.readFileList(()=>{
                    this.buildList();
                    this.recordReady=true;
                });
            },0);
        }else if (this.newName!==null||this.backKey) {
            getData('list_task',(obj)=>{
                this.type=obj.type;
                this.iconIdx=iconMap[this.type]||2;
                this.page=obj.page||0;
                this.readFileList(()=>{
                    if (obj.action=='new'&&this.newName) {
                        const idx=Date.now();
                        const ext=this.type=='script'?'js':'txt';
                        File.mkdir({
                            uri:'internal://app/'+this.type,
                            success:()=>{
                                File.writeText({
                                    uri:'internal://app/'+this.type+'/'+idx+'.'+ext,
                                    text:'',
                                    success:()=>{
                                        this.fileList.push([idx,this.newName]);
                                        this.dirty=true;
                                        const pos={text:0,image:1,video:2,script:3,note:4}[this.type];
                                        if(pos!==undefined)fileNum[pos]+=1;
                                        saveData('fileNum',fileNum);
                                        this.page=0;
                                        this.buildList();
                                    }
                                });
                            }
                        })
                        return;
                    };
                    if (obj.action=='rename'&&this.newName) {
                        this.fileList[obj.idx][1]=this.newName;
                        this.dirty=true;
                    };
                    this.buildList();
                });
            });
        }else if (!this.fileList.length) {
            this.readFileList(()=>{
                this.buildList()
            })
        }else {
            this.buildList();
        }
    },
    onShow(){
        if (this.jumpToEnd!==null) {
            this.$refs.list.scrollTo({index:this.jumpToEnd?8:0});
        }
        if (this.backRecord) this.scrollToRecord();
        setTimeout(()=>{
            if (this.openIdx>=0)this.springTo(1,'openAni',300);
        },200)
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
        clearTimeout(this.msg.timer);
        clearInterval(timer_ani);
        if (!this.dirty)return;
        let json=JSON.stringify(this.fileList);
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
        };
        File.writeText({
            uri:'internal://app/'+this.type+'List.json',
            text:this.fileList.length?','+escaped.slice(1,-1):'',
        });
    },
    showMenu(idx,e){
        vibrate()
        this.menu.x=Math.min(e.globalX,240);
        this.menu.y=Math.min(e.globalY,300);
        this.chosenIdx=this.fileList.length-1-(this.page*10+idx);
        this.menuAni=0;
        this.springTo(1,'menuAni')
    },
    closeMenu(){
        if (this.chosenIdx<0||!this.menuAni)return;
        this.chosenIdx=-1;
        this.menuAni=1;
        this.springTo(0,'menuAni')
    },
    clickMenu(e){
        if (this.chosenIdx<0||!this.menuAni)return;
        const idx=Math.ceil((e.globalY-this.menu.y)/60)-1;
        if (idx==0) {
            this.share()
        }else if(idx==1){
            this.rename()
        }else if (idx==2){
            this.deleteFile()
        };
        this.closeMenu()
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
                that[prop] = target;
                clearInterval(timer_ani);
                callback?.();
            }
        }, 33);
    },
    scrollToRecord(){
        if (!this.recordReady) {
            setTimeout(()=>this.scrollToRecord(),50);
            return;
        }
        this.recordReady=false;
        this.backRecord=false;
        if (this.$refs.list) this.$refs.list.scrollTo({index:Math.max(0,Math.min(this.recordPos,8,this.list.length-1))});
    },
    openFile(idx){
        //显示序(新在前)换算为fileList原索引(老在前)
        saveData('list_'+this.type+'Record',this.page*10+idx);
        const fileIdx=this.fileList.length-1-(this.page*10+idx);
        switch (this.type){
            case 'text':
                getData('text_type',(type)=>{
                    const totalPage=this.fileList[fileIdx][2]||0;
                    let replaced=false;
                    if (totalPage<=0) {
                        type = 'normal';
                        replaced=true
                    };
                    Router.replace({
                        uri:`/pages/textViewer/${type}/${type}`,
                        params:{
                            title:this.fileList[fileIdx][1],
                            uri:`internal://app/text/${this.fileList[fileIdx][0]}/${type=='hyper'?'':'text.txt'}`,
                            progress:this.fileList[fileIdx][3],
                            finalLines:this.fileList[fileIdx][4],
                            totalPage:totalPage,
                            replaced:replaced
                        }
                    })
                },'hyper')
                break
            case 'script':
                if (this.fileList[fileIdx][0]==0) {
                    Router.replace({
                        uri:'/pages/textViewer/normal/normal',
                        params:{
                            title:this.fileList[fileIdx][1],
                            uri:'internal://app/script/0.js',
                            progress:0,
                            finalLines:0,
                            totalPage:0
                        }
                    });
                    break;
                };
                Router.replace({
                    uri:'/pages/scriptEmulator/load/load',
                    params:{
                        uri:`internal://app/script/${this.fileList[fileIdx][0]}.js`,
                        backPage:'/pages/rowList/rowList'
                    }
                })
                break
            case 'note':
                Router.replace({
                    uri:'/pages/textEditor/load/load',
                    params:{
                        uri:`internal://app/note/${this.fileList[fileIdx][0]}.txt`,
                        backPage:'/pages/rowList/rowList'
                    }
                })
                break
        }
    },
    lastPage(){
        if (this.page>0) {
            Router.replace({
                uri:'/pages/rowList/rowList',
                params:{
                    type:this.type,
                    fileList:this.fileList,
                    num:this.num,
                    maxPage:this.maxPage,
                    page:this.page-1,
                    dirty:this.dirty,
                    jumpToEnd:true
                }
            });
        }
    },
    nextPage(){
        if (this.page<this.maxPage) {
            Router.replace({
                uri:'/pages/rowList/rowList',
                params:{
                    type:this.type,
                    fileList:this.fileList,
                    num:this.num,
                    maxPage:this.maxPage,
                    page:this.page+1,
                    dirty:this.dirty,
                    jumpToEnd:false
                }
            });
        }
    },
    buildList(){
        this.num=this.fileList.length;
        this.maxPage=Math.floor(Math.max(this.num-1,0)/10);
        this.page=Math.max(0,Math.min(this.page,this.maxPage));
        const total=this.fileList.length;
        const end=total-this.page*10;
        const start=Math.max(0,end-10);
        let arr=[];
        if (this.type=='text') {
            for (let i = end-1; i >= start; i--) {
                arr.push({name:this.fileList[i][1],time:'已读'+Math.round(this.fileList[i][3]*100)+'%'})
            }
        }else {
            for (let i = end-1; i >= start; i--) {
                arr.push({name:this.fileList[i][1],time:tsToDate(this.fileList[i][0])})
            }
        }
        this.list=arr;
    },
    edit(){
        if (this.list.length) {
            Router.replace({
                uri:'/pages/editList/editList',
                params:{
                    type:this.type
                }
            })
        }
    },
    newFile(){
        const pos={text:0,image:1,video:2,script:3,note:4}[this.type];
        if(pos!==undefined&&fileNum[pos]>=400){
            this.sendMsg('文件数量已达上限');
            return
        };
        saveData('list_task', {
            type:this.type,
            action:'new',
            page:this.page
        });
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/rowList/rowList',
                targetKey:'newName',
                prompt:'请输入文件名称',//提示词
                maxLen:128,//最大长度
                forbidden:"\"*+,:;<=>?[]\\",//非法字符，不推荐长文本场景使用
                allowNewline:false,//是否允许换行
                keyType:0,//0中文1小写2大写3字符
            }
        })
    },
    share(){
        saveData('list_task',{type:this.type,page:this.page});
        const fileIdx=this.chosenIdx;
        let uri='';
        if (this.type=='text') {
            uri=`internal://app/text/${this.fileList[fileIdx][0]}/text.txt`
        }else {
            uri=`internal://app/${this.type}/${this.fileList[fileIdx][0]}.${this.type=='script'?'js':'txt'}`
        }
        Router.replace({
            uri:'/pages/file/fileShare/fileShare',
            params:{
                uri:uri,
                title:this.fileList[fileIdx][1],
                backPage:'/pages/rowList/rowList'
            }
        })
    },
    rename(){
        saveData('list_task', {
            type:this.type,
            action:'rename',
            idx:this.chosenIdx,
            page:this.page
        });
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/rowList/rowList',
                targetKey:'newName',
                prompt:'请输入文件名称',//提示词
                maxLen:128,//最大长度
                forbidden:"\"*+,:;<=>?[]\\",//非法字符，不推荐长文本场景使用
                allowNewline:false,//是否允许换行
                keyType:0,//0中文1小写2大写3字符
            }
        })
    },
    deleteFile(){
        if (this.chosenIdx<0) return;
        const fileIdx=this.chosenIdx;
        const idx=this.fileList[fileIdx][0];
        this.fileList.splice(fileIdx,1);
        this.dirty=true;
        this.buildList();
        if (this.type=='text') {
            File.rmdir({
                uri:'internal://app/'+this.type+'/'+idx,
                recursive:true,
                success:()=>{},
                fail:()=>{}
            });
        }else {
            const ext=this.type=='script'?'js':'txt';
            File.delete({
                uri:'internal://app/'+this.type+'/'+idx+'.'+ext,
                success:()=>{},
                fail:()=>{}
            });
        };
        const pos={text:0,image:1,video:2,script:3,note:4}[this.type];
        if(pos!==undefined)fileNum[pos]=Math.max(0,fileNum[pos]-1);
        saveData('fileNum',fileNum);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/index/index',
                params:{
                    openIdx:this.iconIdx
                }
            })
        };
    },
    readFileList(callback){
        File.get({
            uri:'internal://app/'+this.type+'List.json',
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0){callback?.();return;}
                let pos=0;
                let result="";
                const readChunk=()=>{
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{
                            let text=result;
                            if(text[0]==',')text='['+text.slice(1)+']';
                            const arr=JSON.parse(text);
                            const seen={};
                            const list=[];
                            for(let i=0;i<arr.length;i++){
                                const key=arr[i][0];
                                if(seen[key]===undefined){
                                    seen[key]=list.length;
                                    list.push(arr[i]);
                                }else{
                                    list[seen[key]]=arr[i];
                                    this.dirty=true;
                                }
                            };
                            this.fileList=list;
                            callback?.()
                        }catch(e){};
                        return;
                    }
                    File.readText({
                        uri:'internal://app/'+this.type+'List.json',
                        position:pos,
                        length:chunkLen,
                        success:(data)=>{
                            result+=data.text;
                            pos+=chunkLen;
                            setTimeout(readChunk,0);
                        },
                        fail:()=>{
                            callback?.()
                        }
                    });
                }
                readChunk();
            },
            fail:()=>{
                callback?.()
            }
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
    tips(){
        Router.replace({
            uri:'/pages/setting/tips/tips',
            params:{
                from:this.type
            }
        })
    },
    grabTouch(){}
};
const tsToDate=(ts)=>{
    const d=new Date(ts);
    const hour=d.getHours();
    const min=d.getMinutes();
    return d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+' '+(hour<10?'0':'')+hour+':'+(min<10?'0':'')+min;
};
