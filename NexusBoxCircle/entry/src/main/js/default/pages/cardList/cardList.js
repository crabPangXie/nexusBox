import Router from '@system.router';
import File from '@system.file';
import { getData, saveData } from '../../common/storage';
import Audio from '@system.audio';
import Brightness from '@system.brightness';
import { vibrate } from '../../common/vibrate';

let fileNum=[0,0,0,0,0];
let timer_ani;
let videoControl=true;
export default {
    data: {
        font:$app.getData().font,
        listFont:($app.getData().apiVersion>11?'HarmonyOS_Sans_SCGB2312-Bold':'HarmonyOSHans-Medium'),
        openIdx:-1,
        openAni:0,
        iconIdx:3,

        fileList:[],
        num:0,
        maxPage:0,
        page:0,
        jumpToEnd:null,
        backRecord:false,
        recordPos:0,
        recordReady:false,

        //ui界面
        list:[],
        type:'image',
        titleList:{
            image:'我的图库',
            video:'我的视频',
        },
        chosenIdx:-1,
        dirty:false,
        menu:{
            x:0,
            y:0
        },
        menuAni:0,
        newName:null,
    },
    onInit() {
        File.writeText({uri:'internal://app/cur_playlist', text:'playList'});
        getData('fileNum',(arr)=>{fileNum=arr},[0,0,0,0,0]);
        getData('video_control',(v)=>{videoControl=!!v},true);
        this.iconIdx={image:3,video:4}[this.type]||3;
        if (this.newName!==null) {
            getData('list_task',(obj)=>{
                this.type=obj.type;
                this.iconIdx={image:3,video:4}[this.type]||3;
                this.readFileList(()=>{
                    if (obj.action=='rename'&&this.newName) {
                        this.fileList[obj.idx][1]=this.newName;
                        this.dirty=true;
                    };
                    this.num=this.fileList.length;
                    this.maxPage=Math.floor(Math.max(this.num-1,0)/10);
                    this.page=obj.page||0;
                    this.buildList();
                });
            });
            return;
        };
        if (this.backRecord) {
            getData('list_'+this.type+'Record',(v)=>{
                this.page=Math.floor((v||0)/10);
                this.recordPos=(v||0)%10;
                this.readFileList(()=>{
                    this.num=this.fileList.length;
                    this.maxPage=Math.floor(Math.max(this.num-1,0)/10);
                    this.page=Math.max(0,Math.min(this.page,this.maxPage));
                    this.buildList();
                    this.recordReady=true;
                });
            },0);
            return;
        };
        if (!this.fileList.length){
            this.readFileList(()=>{
                this.num=this.fileList.length;
                this.maxPage=Math.floor(Math.max(this.num-1,0)/10);
                this.buildList()
            })
        }else {
            this.buildList();
        }
    },
    onShow(){
        if (this.jumpToEnd!==null) {
            if (this.jumpToEnd) {
                this.$refs.list.scrollTo({index:8})
            }else {
                this.$refs.list.scrollTo({index:0})
            };
        };
        if (this.backRecord) this.scrollToRecord();
        setTimeout(()=>{
            if (this.openIdx>=0)this.springTo(1,'openAni',300);
        },200);
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
        this.menu.y=Math.min(e.globalY,360);
        this.chosenIdx=this.fileList.length-1-(idx+this.page*10);
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
            this.rename()
        }else if(idx==1){
            this.deleteFile()
        }
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
        idx=this.fileList.length-1-(this.page*10+idx);
        switch (this.type){
            case 'video':
                this.playVideo(idx);
                break
            case 'image':
                this.playImage(idx);
                break
        }
    },
    playImage(idx){
        Router.replace({
            uri:'/pages/imageViewer/imageViewer',
            params:{
                playList:this.fileList,
                idx:idx,
                backPage:'/pages/cardList/cardList'
            }
        })
    },
    prepareVideoBrightness(fn){
        Brightness.getMode({success:(data)=>{
            const oriMode=data.mode;
            Brightness.getValue({success:(light)=>{
                saveData('video_brightness',{mode:oriMode,light:light.value});
                getData('lightLock',(arr)=>{
                    if (arr[2]) {
                        getData('light',(v)=>{
                            Brightness.setValue({
                                value:Math.round(1+v*254/100),
                                success:()=>{
                                    Brightness.setMode({mode:0});
                                    fn();
                                }
                            })
                        },50);
                    }else fn();
                },[false,false,false]);
            }});
        }});
    },
    playVideo(idx){
        this.prepareVideoBrightness(()=>{
            File.get({
                uri:`internal://app/music/${this.fileList[idx][0]}.mp3`,
                success:(data)=>{
                    //64kbps=8000B/s；playList写入的是时长源头（Audio.duration基于它），字节换算必须准确
                    const duration = Math.floor(data.length/8000)*1000;//单位ms
                    const frames=this.fileList[idx][2];
                    const interval=duration/frames;
                    File.writeText({
                        uri:'internal://app/playList',
                        //playList时长单位为秒
                        text:`${this.fileList[idx][0]}.mp3,1,0,${Math.floor(duration/1000)}`+(videoControl?`,${this.fileList[idx][1]},腕连工具箱-视频播放`:''),
                        success:()=>{
                            Audio.stop();
                            Audio.loop=false;
                            Audio.src=`internal://app/music/${this.fileList[idx][0]}.mp3`;
                            Audio.play();
                            //开始播放进程
                            getData('video_auto',(v)=>{
                                Router.replace({
                                    uri:'/pages/videoViewer/play/play',
                                    params:{
                                        uri:'internal://app/video/'+this.fileList[idx][0]+'/',
                                        startTime:Date.now(),
                                        lastTime:Date.now(),
                                        frames:frames,
                                        interval:interval,
                                        duration:duration,
                                        title:this.fileList[idx][1],
                                        autoPlay:v,
                                    }
                                })
                            },false);
                        }
                    })
                }
            })
        });
    },
    lastPage(){
        if (this.page>0) {
            Router.replace({
                uri:'/pages/cardList/cardList',
                params:{
                    type:this.type,
                    fileList:this.fileList,
                    num:this.num,
                    maxPage:this.maxPage,
                    page:this.page-1,
                    jumpToEnd:true
                }
            })
        }
    },
    nextPage(){
        if (this.page<this.maxPage) {
            Router.replace({
                uri:'/pages/cardList/cardList',
                params:{
                    type:this.type,
                    fileList:this.fileList,
                    num:this.num,
                    maxPage:this.maxPage,
                    page:this.page+1,
                    jumpToEnd:false
                }
            })
        }
    },
    buildList(){
        let arr=[];
        //反向显示：page0=最新10条(新在前)，页内从新到老
        const total=this.fileList.length;
        const end=total-this.page*10;
        const start=Math.max(0,end-10);
        for (let i = end-1; i >= start; i--) {
            arr.push({
                name:this.fileList[i][1],
                time:tsToDate(this.fileList[i][0]),
                idx:this.fileList[i][0]
            })
        };
        this.list=arr;
    },
    edit(){
        if (this.num) {
            Router.replace({
                uri:'/pages/editList/editList',
                params:{
                    type:this.type
                }
            })
        }
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
                targetPage:'/pages/cardList/cardList',
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
        const idx=this.fileList[this.chosenIdx][0];
        this.fileList.splice(this.chosenIdx,1);
        this.dirty=true;
        this.num=this.fileList.length;
        this.maxPage=Math.floor(Math.max(this.num-1,0)/10);
        if (this.page>this.maxPage) this.page=this.maxPage;
        if (this.page<0) this.page=0;
        this.buildList();
        File.rmdir({
            uri:'internal://app/'+this.type+'/'+idx,
            recursive:true,
            success:()=>{},
            fail:()=>{}
        });
        if (this.type=='video') {
            File.delete({
                uri:'internal://app/music/'+idx+'.mp3'
            })
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
