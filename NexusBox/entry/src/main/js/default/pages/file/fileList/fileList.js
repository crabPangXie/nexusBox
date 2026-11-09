import File from '@system.file';
import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';
import { vibrate } from '../../../common/vibrate';

const getFileType = (name) => {
    if (!name) return 'text';
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1 || lastDot === name.length - 1) return 'text';
    const ext = name.slice(lastDot + 1).toLowerCase();
    const image = ['bmp', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'];
    const audio = ['mp3', 'flac', 'wav', 'aac', 'ogg', 'amr', 'mid', 'm4a'];
    const video = ['mp4', 'avi', 'mkv', '3gp', 'mov', 'webm','m4v'];
    const code  = ['js', 'ts', 'ets', 'py', 'css', 'html', 'hml', 'java', 'c', 'cpp', 'h', 'sh'];
    const apk   = ['hap', 'apk','app','rpk'];
    const arch  = ['zip', 'rar', '7z', 'tar', 'gz'];
    const text  = ['txt', 'log', 'md', 'json', 'xml', 'csv', 'ini', 'cfg', 'conf'];
    if (image.indexOf(ext)!== -1) return 'image';
    if (audio.indexOf(ext)!== -1) return 'audio';
    if (video.indexOf(ext)!== -1) return 'video';
    if (code.indexOf(ext) !== -1) return 'code';
    if (apk.indexOf(ext)  !== -1) return 'apk';
    if (arch.indexOf(ext) !== -1) return 'archive';
    if (text.indexOf(ext) !== -1) return 'text';
    if (ext=='bin')return 'bin';
    return 'text';
};
const getSize=(size)=>{
    let value = Number(size);
    if (size && !isNaN(value)) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
        let index = 0;
        let k = value;
        if (value >= 1024) {
            while (k >= 1024) {
                k = k / 1024;
                index++;
            }
        }
        return `${(k).toFixed(2)}${units[index]}`;
    }
    return "0B";
};
const formatMs=(ms)=>{
    if (ms<1000)return`${ms}ms`;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join('');
};
const getTime=(time)=>{
    let value=Number(time);
    if (value>0&&value<1e12) value*=1000;
    const t=new Date(value);
    function padNum(n) { return n < 10 ? "0" + n : n; }
    return `${t.getFullYear()}/${t.getMonth()+1}/${t.getDate()} ${padNum(t.getHours())}:${padNum(t.getMinutes())}:${padNum(t.getSeconds())}`
};
// 展开目录：内部项push队尾（与fn_copy一致）；目录树删除由调用方对顶层recursive一次完成
// fn(listLength)：展开完成回调（调用处累加totalCount并schedule）
const expandDeleteDir=(taskList,obj,prefix,fn)=>{
    File.list({
        uri:prefix+'/'+obj.uri,
        success:(data)=>{
            const list=data.fileList;
            list.forEach((element)=>{
                taskList.push({uri:obj.uri+'/'+element.uri, type:element.type, length:element.length});
            });
            fn(list.length);
        },
        fail:()=>fn(0)
    });
};

let counting=false;
let collectionArr=[];

export default {
    data: {
        rootPath:$app.getRootPath(),
        devMode:$app.getDevVersion(),
        routerIdx:-1,//传入的文件位置
        backPage:'/pages/file/index/index',
        backKey:false,

        input_search:null,
        input_newFile:null,
        input_newDir:null,
        input_rename:null,
        uri:null,
        fileList:[],
        fileIdx:0,
        fileMode:0,//0:查看；1编辑；2移动；3复制
        chosenArr:[],//被选中的文件（夹）在列表中序号

        oriUri:'',//复制、移动任务的原路径
        chosenFileList:[],//复制、移动的任务列表

        showTaskBox:'',
        doneCount:0,
        totalCount:1,
        nowUri:null,
        allTime:'0ms',

        showToastBox:false,
        showSelectBox:'',
        //弹窗动画：show控制动画状态，if控制元素常驻（首次挂载不播动画）
        alertIf:false,
        alertShow:false,
        taskShow:false,
        toastList:[],//{t:,c:}
        selectList:[],//{fn:,color:可选}

        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {
        this.initRootUri();
        this.loadCollection();
        //键盘取消会回传空串：拦截为“未输入”，但仍要按键盘返回处理以恢复当前目录
        const fromKeyboard=this.input_search!==null||this.input_newFile!==null||this.input_newDir!==null||this.input_rename!==null;
        if (this.input_search==='') this.input_search=null;
        if (this.input_newFile==='') this.input_newFile=null;
        if (this.input_newDir==='') this.input_newDir=null;
        if (this.input_rename==='') {
            this.input_rename=null;
            const task=$app.getData().fileRenameTask;
            if (task) this.backPage=task.backPage;//取消改名也要保留原返回页
            $app.getData().fileRenameTask=null;
        };
        const after=()=>{//统一刷新入口（仅一次，避免旧uri列表竞态覆盖）
            this.readFileList(()=>{
                if (this.routerIdx>=0) {
                    this.fileMode=1;
                    if (this.fileList[0][0].uri=="返回上一级") {
                        this.routerIdx++;
                    };
                    this.fileIdx=Math.floor(this.routerIdx/6);
                    this.chosenArr.push(this.routerIdx)
                    this.routerIdx=null;
                };
            });
        };
        if (fromKeyboard||this.backKey){
            getData('file_uri',(data)=> {
                this.uri = data;
                if (this.input_rename){
                    const task=$app.getData().fileRenameTask;
                    $app.getData().fileRenameTask=null;
                    const name=this.input_rename;
                    this.input_rename=null;
                    if (task) {
                        this.backPage=task.backPage;
                        this.renameFile(task,name,after);
                    }else after();
                    return;
                };
                if (this.input_newDir){
                    File.mkdir({
                        uri:this.getRealUri()+'/'+this.input_newDir,
                        success:()=>{this.input_newDir=null;after()},
                        fail:()=>{
                            this.sendMsg('存在同名冲突,创建失败');
                            this.input_newDir=null;
                            after()
                        }
                    })
                    return;
                };
                if (this.input_newFile){
                    //writeText对已存在文件是覆盖写入，需先access预检防误覆盖
                    File.access({
                        uri:this.getRealUri()+'/'+this.input_newFile,
                        success:()=>{
                            this.sendMsg('存在同名文件,创建失败');
                            this.input_newFile=null;
                            after()
                        },
                        fail:()=>{
                            File.writeText({
                                uri:this.getRealUri()+'/'+this.input_newFile,
                                text:'',
                                success:()=>{this.input_newFile=null;after()},
                                fail:()=>{
                                    this.sendMsg('创建失败');
                                    this.input_newFile=null;
                                    after()
                                }
                            })
                        }
                    });
                    return;
                };
                after();
            });
        }else {
            after();
        };
    },
    onShow(){
        if (this.$refs.file.rotation) {
            this.$refs.file.rotation()
        };
    },
    onHide(){
        if (this.$refs.file.rotation) {
            this.$refs.file.rotation({focus:false})
        };
        if (this.$refs.select.rotation) {
            this.$refs.select.rotation({focus:false})
        };
        if (this.$refs.toast.rotation) {
            this.$refs.toast.rotation({focus:false})
        };
    },
    onDestroy(){
        clearTimeout(this.msg.timer);
        this.saveCollection();
    },
    loadCollection(){
        File.get({
            uri:'internal://app/fileCollections',
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0)return;
                let pos=0;
                let result="";
                function readChunk(){
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{collectionArr=JSON.parse(result)}catch(e){collectionArr=[]};
                        return;
                    }
                    File.readText({
                        uri:'internal://app/fileCollections',
                        position:pos,
                        length:chunkLen,
                        success:(data)=>{
                            result+=data.text;
                            pos+=chunkLen;
                            setTimeout(readChunk,0);
                        },
                        fail:()=>{collectionArr=[]}
                    });
                }
                readChunk();
            },
            fail:()=>{}
        });
    },
    getRealUri(){
        return this.rootPath+this.uri
    },
    getRootUri(){
        return this.rootPath
    },
    checkEditPermission(uri){
        if (this.devMode)return true;
        if (this.rootPath.indexOf('\\')<0)return true;
        if ((uri||'').indexOf('com.example.example')>=0)return true;
        this.sendMsg('权限不足');
        return false;
    },
    initRootUri(){
        //其他界面已传入uri（含空串）时不重定位
        if (this.uri!==null)return;
        this.uri='';
        //rootPath跳出沙箱后，按跳出层数把uri定位回工具箱目录；超过已知最远层级则不定位
        if (this.rootPath.indexOf('\\')<0)return;
        const parts=['user','ace','data','com.example.example'];
        let depth=0;
        let idx=this.rootPath.indexOf('\\..');
        while (idx>=0){
            depth++;
            idx=this.rootPath.indexOf('\\..',idx+3);
        };
        if (depth<1||depth>parts.length)return;
        this.uri='/'+parts.slice(parts.length-depth).join('/');
    },
    getFileObj(idx){
        return this.fileList[Math.floor(idx/6)][idx%6]
    },
    getMiniUri(uri){
        const parts =uri.split('/');
        parts.shift();
        // 没有中间文件夹（只有一段或两段）则无法用点号省略，直接返回
        if (parts.length <= 2) return uri;
        // 生成对应数量的点号（每个文件夹替换为一个点）
        let dots = '';
        for (let i = 0; i < parts.length - 2; i++) {
            dots += '.';
        };
        const result = '/'+parts[0]+'/'+dots+'/'+parts[parts.length - 1];
        return result;
    },
    //根据uri读取文件列表，写入fileList
    readFileList(fn){
        File.list({
            uri:this.getRealUri(),
            success:(data)=>{
                let list=data.fileList;
                if (this.input_search) {
                    if (this.input_search[0] !== '\t') {
                        let arr=[];
                        for (let i = 0; i < list.length; i++) {
                            if (list[i].uri.indexOf(this.input_search) != -1) {
                                arr.push(list[i])
                            };
                        };
                        list = arr;
                        this.input_search = '\t' + this.input_search;
                    } else this.input_search = null;
                };
                list.forEach((item,idx)=>{
                    if (item.type=='file') {
                        list[idx].type=getFileType(item.uri)
                    }
                });
                if (this.uri) {
                    const back={uri:"返回上一级",length:0,type:"back"}
                    list.push(back);
                    list.unshift(back);
                };
                let arr=[];
                for (let i = 0; i < list.length; i += 6) {
                    arr.push(list.slice(i, i + 6));
                };
                this.fileList=arr;
            },
            fail:()=> {
                this.fileList=[];
            },
            complete:()=>{
                this.chosenArr=[];
                this.fileIdx=0;
                if (this.fileMode==1)this.fileMode=0;
                fn?.()
            }
        })
    },
    swipeList(e){
        if (e.direction=='up'&&this.fileIdx<this.fileList.length-1)this.fileIdx++
        else if (e.direction=='down'&&this.fileIdx>0)this.fileIdx--
    },
    clickItem(idx){
        idx+=this.fileIdx*6;
        if (this.fileMode==1) {
            //编辑模式：点击选择文件（夹），再点取消选择
            if (this.getFileObj(idx).type=='back') {
                this.resetMode();
                return
            };
            const position=this.chosenArr.indexOf(idx)
            if (position!==-1) {
                this.chosenArr.splice(position,1)
            }else {
                this.chosenArr.push(idx)
            }
        }else if (this.fileMode==0){
            //查看模式：打开文件（夹）
            if (this.chosenArr[0]==idx) {
                this.chosenArr=[];
                return;
            };
            const obj=this.getFileObj(idx);
            if (obj.type=='dir') {
                this.uri+='/'+obj.uri;
                this.readFileList()
            }else if (obj.type=='back')this.backLastDir();
            else{
                this.chosenArr=[idx];
                this.showSelectBox=obj.uri;
                this.selectList=[{fn:'文本'},{fn:'图片'},{fn:'js脚本'},{fn:'文本编辑器'}];
                this.openAlert()
            }
        }else {
            const obj=this.getFileObj(idx);
            if (this.uri==this.oriUri){
                for (let i = 0; i < this.chosenFileList.length; i++) {
                    if (obj.uri==this.chosenFileList[i].uri){
                        this.sendMsg('禁止进入选中的文件夹');
                        return;
                    }
                }
            };
            if (obj.type=='dir') {
                this.uri+='/'+obj.uri;
                this.readFileList()
            }else if (obj.type=='back')this.backLastDir();
        }
    },
    pressItem(idx){
        if (this.fileMode>1) return;
        idx+=this.fileIdx*6;
        //长按自动进入多选模式
        this.fileMode=1;
        if (this.getFileObj(idx).type=='back') return;
        const position=this.chosenArr.indexOf(idx)
        if (position==-1) {
            this.chosenArr.push(idx)
        };
        vibrate()
    },
    //长按地址栏：复制当前uri到键盘剪切板（上限15条）
    copyContent(content,title){
        vibrate()
        const save=(list)=>{
            File.writeText({
                uri:'internal://app/shear.json',
                text:JSON.stringify(list),
                success:()=>this.sendMsg(title+'已复制'),
                fail:()=>this.sendMsg('复制失败')
            })
        };
        File.readText({
            uri:'internal://app/shear.json',
            success:(data)=>{
                let list=[];
                if (data.text) {
                    try{list=JSON.parse(data.text)}catch(e){list=[]}
                };
                list.unshift(content);
                if (list.length>15)list.length=15;
                save(list)
            },
            fail:()=>save([content])
        });
    },
    backLastDir(){
        this.uri=this.uri.slice(0,this.uri.lastIndexOf('/'));
        this.readFileList()
    },
    //cancel按钮触发，退出多选等模式
    resetMode(){
        if (this.fileMode!=1&&this.oriUri!=this.uri) {
            this.uri=this.oriUri;
            this.clearChosenList()
        };
        this.fileMode=0;
        this.chosenArr=[];
    },
    fn_multi(){
        this.fileMode=1;
        this.chosenArr=[];
    },
    fn_sort(){
        this.showSelectBox='排序方式';
        this.selectList=[{fn:'按名称正序'},{fn:'按名称倒序'},{fn:'按大小正序'},{fn:'按大小倒序'},{fn:'按时间正序'},{fn:'按时间倒序'}];
        this.openAlert()
    },
    fn_search(){
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/file/fileList/fileList',
                targetKey:'input_search',
                prompt:'请输入搜索内容',//提示词
                maxLen:128,//最大长度
                forbidden:"\"*+,:;<=>?[]\\",//非法字符，不推荐长文本场景使用
                allowNewline:false,//是否允许换行
                keyType:1,//0中文1小写2大写3字符
            }
        })
    },
    fn_new(){
        this.showSelectBox='新建类型';
        this.selectList=[{fn:'新建文件夹'},{fn:'新建文件'}];
        this.openAlert();
    },
    fn_newFile(type){
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/file/fileList/fileList',
                targetKey:'input_new'+type,
                prompt:type=='Dir'?'请输入文件夹名称':'请输入文件名称',//提示词
                maxLen:128,//最大长度
                forbidden:"\"*+,:;<=>?[]\\/|",//非法字符，不推荐长文本场景使用
                allowNewline:false,//是否允许换行
                keyType:1,//0中文1小写2大写3字符
            }
        })
    },
    fn_rename(){
        if (this.fileMode!=1||this.chosenArr.length!=1)return;
        const file=this.getFileObj(this.chosenArr[0]);
        if (!file||file.type=='dir'||file.type=='back')return;
        const srcUri=this.getRealUri()+'/'+file.uri;
        const maxLen=128-this.getRealUri().length-1;
        if (file.uri.length>maxLen||maxLen<1) {
            this.sendMsg('路径超过128字符');
            return;
        };
        $app.getData().fileRenameTask={
            srcUri:srcUri,name:file.uri,backPage:this.backPage
        };
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/file/fileList/fileList',
                targetKey:'input_rename',
                prompt:file.uri,
                maxLen:maxLen,
                forbidden:"\"*+,:;<=>?[]\\/|",
                allowNewline:false,
                keyType:1
            }
        });
    },
    renameFile(task,name,after){
        if (!name||!name.trim()||name===task.name) {
            after();
            return;
        };
        if (name=='.'||name=='..') {
            this.sendMsg('文件名含有非法字符');
            after();
            return;
        };
        const dstUri=this.getRealUri()+'/'+name;
        this.openTask('重命名');
        const finish=(message)=>{
            this.clearOperateTask();
            this.sendMsg(message);
            after();
        };
        File.access({
            uri:dstUri,
            success:()=>finish('存在同名文件或文件夹'),
            fail:(data,code)=>{
                if (code!==301) {
                    finish('无法检查目标,重命名已取消');
                    return;
                };
                File.move({
                    srcUri:task.srcUri,
                    dstUri:dstUri,
                    success:()=>finish('重命名成功'),
                    fail:()=>finish('重命名失败')
                });
            }
        });
    },
    fn_share(){
        const file=this.getFileObj(this.chosenArr[0]);
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/file/fileShare/fileShare',
            params:{
                uri:this.getRealUri()+'/'+file.uri,
                backPage:'/pages/file/fileList/fileList'
            }
        })
    },
    fn_openText(){
        const file=this.getFileObj(this.chosenArr[0]);
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/textViewer/normal/normal',
            params:{
                uri:this.getRealUri()+'/'+file.uri,
                fileMode:true,
            }
        })
    },
    fn_openImage(){
        const file=this.getFileObj(this.chosenArr[0]);
        saveData('file_uri',this.uri);
        const open=(uri,title)=>{
            Router.replace({
                uri:'/pages/imageViewer/imageViewer',
                params:{
                    uri:uri,
                    title:title||'',
                    backPage:'/pages/file/fileList/fileList'
                }
            })
        };
        if ($app.getData().apiVersion>23) {
            const ext=file.uri.slice(file.uri.lastIndexOf('.')+1).toLowerCase()=='bin'?'bin':'png';
            const dstUri='internal://app/temp.'+ext;
            File.copy({
                srcUri:this.getRealUri()+'/'+file.uri,
                dstUri:dstUri,
                success:()=>open('internal://app\\temp.'+ext,file.uri),
                fail:()=>this.sendMsg('图片打开失败')
            });
            return;
        }
        open(this.getRootUri()+(this.uri+'/'+file.uri).split('/').join('\\'),'');
    },
    fn_openScript(){
        const file=this.getFileObj(this.chosenArr[0]);
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/scriptEmulator/load/load',
            params:{
                uri:this.getRealUri()+'/'+file.uri,
                backPage:'/pages/file/fileList/fileList'
            }
        })
    },
    fn_openEditor(){
        const file=this.getFileObj(this.chosenArr[0]);
        saveData('file_uri',this.uri);
        Router.replace({
            uri:'/pages/textEditor/load/load',
            params:{
                uri:this.getRealUri()+'/'+file.uri,
                backPage:'/pages/file/fileList/fileList'
            }
        })
    },
    fn_details(){
        if (counting)return;//当前无统计任务再跑
        if (this.chosenArr.length==0) {
            this.sendMsg('未选择目标')
            return
        };
        const count=()=>{
            counting=true;
            let taskList=[];
            this.chosenArr.forEach((element)=>{taskList.push({uri:this.getFileObj(element).uri,type:this.getFileObj(element).type,length:-1})});
            let that=this;
            let allLength=0;
            let allItems=0;
            let allDirs=0;
            function schedule() {
                if (!counting)return;
                if (taskList.length > 0) {
                    setTimeout(function() {countOne(taskList.shift()) }, 0);
                } else {
                    counting=false;
                    that.toastList[3].c=getSize(allLength);
                    that.toastList[2].c=allDirs+'项';
                    that.toastList[1].c=allItems+'项';
                }
            };
            function countOne(obj) {
                if (obj.type=='dir') {
                    allDirs+=1;
                    expandDeleteDir(taskList,obj,that.getRealUri(),()=>{
                        schedule()
                    });
                    return;
                }
                if (obj.length!=-1){
                    allItems+=1;
                    allLength+=obj.length;
                    schedule();
                    return;
                }else {
                    File.get({
                        uri:that.getRealUri()+'/'+obj.uri,
                        success:(data)=>{
                            allItems+=1;
                            allLength+=data.length;
                        },
                        complete:()=>schedule()
                    })
                }
            };
            schedule();
        };
        this.showToastBox=true;
        this.openAlert();
        if (this.chosenArr.length>1) {
            this.toastList=[
                {t:'选中数',c:'共'+this.chosenArr.length+'项'},
                {t:'文件',c:'计算中...'},
                {t:'文件夹',c:'计算中...'},
                {t:'总大小',c:'计算中...'},
                {t:'路径',c:this.uri?this.uri:'内部存储'},
                {t:'uri',c:this.getRealUri()},
            ];
            count();
        }else {
            const file=this.getFileObj(this.chosenArr[0]);
            this.toastList=[
                {t:'名称',c:file.uri},
                {t:'大小',c:file.type=='dir'?'计算中...':getSize(file.length)},
                {t:'类型',c:file.type},
                {t:'路径',c:this.uri+'/'+file.uri},
                {t:'uri',c:this.getRealUri()+'/'+file.uri},
            ];
            if (file.type=='dir') {
                this.toastList.splice(1, 0, {t: '文件', c: '计算中...'},{t: '文件夹', c: '计算中...'});
                count();
            };
            if (file.lastModifiedTime) this.toastList.push({t:'时间',c:getTime(file.lastModifiedTime)})
        }
    },
    fn_operate(){
        if (this.chosenArr.length==0) {
            this.sendMsg('未选择目标')
            return
        };
        this.selectList=[{fn:'复制',color:'#ED6F21'},{fn:'移动',color:'#FF0000'},{fn:'删除',color:'#FF0000'}];
        if (this.chosenArr.length>1) {
            this.showSelectBox=`共${this.chosenArr.length}个项目`
        }else {
            const file=this.getFileObj(this.chosenArr[0]);
            const uri=this.uri+'/'+file.uri;
            if (this.fileMode==1&&file.type!='dir'&&file.type!='back') this.selectList.unshift({fn:'重命名',color:'#ED6F21'});
            this.selectList.unshift({fn:collectionArr.indexOf(uri)==-1?'收藏':'取消收藏',color:'#ED6F21'});
            if (file.type!='dir') this.selectList.push({fn:'分享至手机',color:'#005BFF'});
            this.showSelectBox=file.uri
        };
        this.openAlert()
    },
    fn(fn){
        const editFns=['重命名','移动','删除','新建文件夹','新建文件','js脚本','文本编辑器'];
        if (editFns.indexOf(fn)>=0&&!this.checkEditPermission(this.getRealUri()))return;
        let sortMode=0;
        switch (fn){
            case '文本':
                this.fn_openText()
                break
            case '图片':
                this.fn_openImage()
                break
            case 'js脚本':
                this.fn_openScript()
                break
            case '文本编辑器':
                this.fn_openEditor()
                break
        //operate
            case '重命名':this.fn_rename();break;
            case '复制':
                this.oriUri=this.uri;
                this.chosenFileList=[];
                this.chosenArr.forEach((element)=>{
                    this.chosenFileList.push({
                        uri:this.getFileObj(element).uri,
                        type:this.getFileObj(element).type
                    });
                });
                this.fileMode=2;
                this.chosenArr=[];
                break
            case '移动':
                this.oriUri=this.uri;
                this.chosenFileList=[];
                this.chosenArr.forEach((element)=>{
                    this.chosenFileList.push({
                        uri:this.getFileObj(element).uri,
                        type:this.getFileObj(element).type
                    });
                });
                this.fileMode=3;
                this.chosenArr=[];
                break
            case '删除': this.fn_delete();
                break
            case '收藏':
                collectionArr.unshift(this.uri+'/'+this.getFileObj(this.chosenArr[0]).uri);
                if (collectionArr.length>20) {
                    collectionArr.length = 20;
                    this.sendMsg('超过20条,已清除末尾项');
                }else {
                    this.sendMsg('收藏成功');
                };
                break
            case '取消收藏':
                const uri=this.uri+'/'+this.getFileObj(this.chosenArr[0]).uri;
                collectionArr.splice(collectionArr.indexOf(uri),1);
                this.sendMsg('已取消收藏');
                break
            case '分享至手机':this.fn_share();break;
            case '新建文件夹':this.fn_newFile('Dir');break;
            case '新建文件':this.fn_newFile('File');break;
        //sort
            case '按名称正序': sortMode=1; break
            case '按名称倒序': sortMode=2; break
            case '按大小正序': sortMode=3; break
            case '按大小倒序': sortMode=4; break
            case '按时间正序': sortMode=5; break
            case '按时间倒序': sortMode=6; break
        };
        if (sortMode) {
            const arr0 = [];
            this.fileList.forEach(sub => sub.forEach(item => {if(item.type!='back')arr0.push(item)}));
            arr0.sort((a, b) => {
                if (sortMode <= 2) {
                    let na = a.uri, nb = b.uri;
                    return sortMode == 1 ? (na < nb ? -1 : na > nb ? 1 : 0) : (na > nb ? -1 : na < nb ? 1 : 0);
                } else if (sortMode <= 4) return sortMode == 3 ? a.length - b.length : b.length - a.length;
                else {
                    const ta=Number(a.lastModifiedTime)||0;
                    const tb=Number(b.lastModifiedTime)||0;
                    return sortMode == 5 ? ta - tb : tb - ta;
                }
            });
            let arr1=[];
            if (this.uri) {
                const back={uri:"返回上一级",length:0,type:"back"}
                arr0.push(back);
                arr0.unshift(back);
            };
            for (let i = 0; i < arr0.length; i += 6)arr1.push(arr0.slice(i, i + 6));
            sortMode = 0;
            this.fileList=arr1;
        };
        this.closeAlert();
    },

    fn_copy(callback){
        if (this.uri == this.oriUri) {
            this.clearChosenList();
            this.sendMsg('位置与原位置相同');
            return;
        };
        if (!this.checkEditPermission(this.getRealUri()))return;
        let taskList=this.chosenFileList.slice();
        const startTime=Date.now();
        this.totalCount=taskList.length;
        if (!this.showTaskBox) {
            this.openTask('复制');
        };
        var that=this;
        function schedule() {
            if (taskList.length > 0) {
                setTimeout(function() {copyOne(taskList.shift())}, 0);
            } else {
                //处理结束
                if (callback&&!callback.type) {
                    callback(startTime);
                } else {
                    that.clearOperateTask()
                    that.clearChosenList();
                }
            }
        };
        function copyOne(obj) {
            that.nowUri=that.getMiniUri(obj.uri);
            that.doneCount+=1;
            that.allTime=formatMs(Date.now()-startTime);
            if (obj.type=='dir') {
                File.mkdir({
                    uri:that.getRealUri()+'/'+obj.uri,
                    recursive:true,
                    success:()=>{
                        expandDeleteDir(taskList,obj,that.getRootUri()+that.oriUri,(len)=>{
                            that.totalCount+=len;
                            schedule();
                        });
                    },
                    fail:()=>{
                        that.sendMsg('存在同名冲突,已忽略');
                        schedule();
                    }
                })
            }else {
                File.copy({
                    srcUri:that.getRootUri()+that.oriUri+'/'+obj.uri,
                    dstUri: that.getRealUri() + '/' + obj.uri,
                    success:()=>schedule(),
                    fail:()=>{
                        that.sendMsg('存在同名冲突,已忽略');
                        schedule();
                    }
                })
            }
        };
        schedule()
    },
    fn_move(){
        if (this.uri == this.oriUri) {
            this.clearChosenList();
            this.sendMsg('目标位置与原位置相同');
            return;
        };
        if (!this.checkEditPermission(this.getRealUri()))return;
        let taskList=this.chosenFileList.slice();
        let dirList=[];
        this.chosenFileList.forEach((obj)=>{
            if (obj.type=='dir') dirList.push(obj.uri);
        });
        this.openTask('移动');
        this.totalCount=taskList.length;
        const startTime=Date.now();
        const srcPrefix=this.getRootUri()+this.oriUri;
        var that=this;
        function schedule() {
            if (taskList.length > 0) {
                setTimeout(function() {moveOne(taskList.shift()) }, 60);
            } else {
                deleteDirs();
            }
        };
        function moveOne(obj) {
            that.nowUri=that.getMiniUri(obj.uri);
            that.doneCount+=1;
            that.allTime=formatMs(Date.now()-startTime);
            if (obj.type=='dir') {
                File.mkdir({
                    uri:that.getRealUri()+'/'+obj.uri,
                    recursive:true,
                    success:()=>{
                        expandDeleteDir(taskList,obj,srcPrefix,(len)=>{
                            that.totalCount+=len;
                            schedule();
                        });
                    },
                    fail:()=>{
                        that.sendMsg('存在同名冲突,已忽略');
                        schedule();
                    }
                })
            }else {
                File.move({
                    srcUri:srcPrefix+'/'+obj.uri,
                    dstUri:that.getRealUri()+'/'+obj.uri,
                    success:()=>schedule(),
                    fail:()=>{
                        that.sendMsg('存在同名冲突,已忽略');
                        schedule();
                    }
                })
            }
        };
        //文件全部移走后：原目录均为空壳，逐个顶层递归删除（recursive一次删整棵，子目录不再重复删）
        function deleteDirs(){
            if (!dirList.length) {
                that.clearOperateTask();
                that.clearChosenList();
                return;
            };
            that.totalCount+=dirList.length;
            function removeNext() {
                if (!dirList.length) {
                    that.clearOperateTask();
                    that.clearChosenList();
                    return;
                };
                const dir=dirList.shift();
                that.nowUri=that.getMiniUri(dir);
                that.doneCount+=1;
                that.allTime=formatMs(Date.now()-startTime);
                File.rmdir({
                    uri:srcPrefix+'/'+dir,
                    recursive:true,
                    complete:()=>removeNext()
                });
            };
            removeNext();
        };
        schedule()
    },
    clearChosenList(){
        this.oriUri='';
        this.chosenFileList=[];
        this.readFileList();
        this.fileMode=0;
    },
    fn_delete(){
        let taskList=[];
        let dirList=[];
        this.chosenArr.forEach((element)=>{
            const obj=this.getFileObj(element);
            if (obj.type=='dir') dirList.push(obj.uri);
            taskList.push(obj);
        });
        this.openTask('删除');
        this.totalCount=taskList.length;
        const startTime=Date.now();
        var that=this;
        function schedule() {
            if (taskList.length > 0) {
                setTimeout(function() {deleteOne(taskList.shift()) }, 60);
            } else {
                deleteDirs();
            }
        };
        function deleteOne(obj) {
            that.nowUri=that.getMiniUri(obj.uri);
            that.doneCount+=1;
            that.allTime=formatMs(Date.now()-startTime);
            if (obj.type=='dir') {
                expandDeleteDir(taskList,obj,that.getRealUri(),(len)=>{
                    that.totalCount+=len;
                    schedule();
                });
            }else {
                File.delete({
                    uri:that.getRealUri()+'/'+obj.uri,
                    complete:()=>schedule()
                })
            }
        };
        //文件全部删除后：目录均为空壳，逐个顶层递归删除（recursive一次删整棵，子目录不再重复删）
        function deleteDirs(){
            if (!dirList.length) {
                that.clearOperateTask();
                that.chosenArr=[];
                that.readFileList();
                return;
            };
            that.totalCount+=dirList.length;
            function removeNext() {
                if (!dirList.length) {
                    that.clearOperateTask();
                    that.chosenArr=[];
                    that.readFileList();
                    return;
                };
                const dir=dirList.shift();
                that.nowUri=that.getMiniUri(dir);
                that.doneCount+=1;
                that.allTime=formatMs(Date.now()-startTime);
                File.rmdir({
                    uri:that.getRealUri()+'/'+dir,
                    recursive:true,
                    complete:()=>removeNext()
                });
            };
            removeNext();
        };
        schedule()
    },
    clearOperateTask(){
        if (this.$refs.file.rotation) {
            this.$refs.file.rotation()
        };
        this.showTaskBox='';
        this.taskShow=false;
        this.totalCount=1;
        this.allTime='0ms';
        this.doneCount=0;
        this.nowUri=null;
    },
    saveCollection(){
        let json=JSON.stringify(collectionArr);
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
            uri:'internal://app/fileCollections',
            text:escaped,
        })
    },
    closeAlert(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            counting=false;
            this.alertShow=false;
            this.showToastBox=false;
            this.showSelectBox='';
            this.toastList=[];
            this.selectList=[];
            if (this.$refs.select.rotation) {
                this.$refs.select.rotation({focus:false})
            };
            if (this.$refs.toast.rotation) {
                this.$refs.toast.rotation({focus:false})
            };
            if (this.$refs.file.rotation) {
                this.$refs.file.rotation()
            };
            if (this.fileMode==0)this.chosenArr=[]
        }
    },
    //操作弹窗：if负责首次挂载（不播动画），show负责动画状态
    openAlert(){
        this.alertIf=true;
        this.alertShow=true;
        if (this.$refs.file.rotation) {
            this.$refs.file.rotation({focus:false})
        };
        if (this.showSelectBox) {
            if (this.$refs.select.rotation) {
                this.$refs.select.rotation()
            };
        }else if (this.$refs.toast.rotation) {
            this.$refs.toast.rotation()
        };
    },
    openTask(name){
        if (this.$refs.file.rotation) {
            this.$refs.file.rotation({focus:false})
        };
        if (this.$refs.select.rotation) {
            this.$refs.select.rotation({focus:false})
        };
        if (this.$refs.toast.rotation) {
            this.$refs.toast.rotation({focus:false})
        };
        this.taskShow=true;
        this.showTaskBox=name;
    },
    listenList(e){
        this.fileIdx=e.value;
    },
    swipe(e){
        if (e.direction=='right') {
            if (this.fileMode>0){
                this.resetMode();
                return;
            };
            if (this.msg.timer) {
                if (this.backPage=='/pages/file/fileSearch/fileSearch') {
                    Router.replace({
                        uri:this.backPage,
                    });
                    return
                }
                Router.replace({uri:this.backPage});
            }else {
                this.sendMsg('再划一次退出')
            }
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
    grabTouch(){}
}
