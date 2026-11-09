import File from '@system.file';
import { getData, saveData } from '../../common/storage';
import Router from '@system.router';
let fileNum=[0,0,0,0,0];//[text,image,video,script,note]
export default {
    data: {
        type:'video',
        fileList:[],
        list:[],
        chosenNum:0,
        deleting:false,
        aniArr:[],
        savingDelete:false,
        deleteTimer:null,
        destroyed:false,

        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {
        const arr=[];
        for(let i=0;i<=35;i++){
            arr.push({src:'/common/loading/'+i+'.png'});
        };
        this.aniArr=arr;
        getData('fileNum',(arr)=>{fileNum=arr},[0,0,0,0,0]);
        this.readFileList(()=>{
            this.buildList()
        });
    },
    onShow(){
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
        if(this.destroyed)return;
        this.destroyed=true;
        clearTimeout(this.deleteTimer);
        if(this.deleting)this.saveDeleteProgress();
        clearTimeout(this.msg.timer)
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
    //按新在前生成展示列表，界面不再用长度反查fileList
    buildList(){
        const arr=[];
        for(let i=this.fileList.length-1;i>=0;i--){
            arr.push({
                name:this.fileList[i][1],
                key:this.fileList[i][0],
                checked:false
            })
        };
        this.list=arr;
        this.chosenNum=0;
    },
    choose(idx){
        if(this.deleting)return;
        const item=this.list[idx];
        if(!item)return;
        const checked=!item.checked;
        item.checked=checked;
        this.chosenNum=this.chosenNum+(checked?1:-1);
    },
    handleAll(){
        if(this.deleting)return;
        const selectAll=this.chosenNum!=this.list.length;
        for(let i=0;i<this.list.length;i++){
            this.list[i].checked=selectAll;
        };
        this.chosenNum=selectAll?this.list.length:0;
    },
    deleteFile(){
        if(this.deleting||this.destroyed)return;
        if(!this.chosenNum){
            this.sendMsg('请先选择文件');
            return;
        };
        const pos={text:0,image:1,video:2,script:3,note:4}[this.type];
        const keys=[];
        for(let i=0;i<this.list.length;i++){
            if(this.list[i].checked){
                const key=this.list[i].key;
                keys.push(key);
            }
        };
        this.deleting=true;
        let index=0;
        const done=()=>{
            if(this.destroyed)return;
            this.deleteTimer=setTimeout(next,0);
        };
        const next=()=>{
            this.deleteTimer=null;
            if(this.destroyed)return;
            if(index<keys.length){
                const key=keys[index++];
                const success=()=>{
                    if(this.destroyed)return;
                    for(let i=this.fileList.length-1;i>=0;i--){
                        if(this.fileList[i][0]===key)this.fileList.splice(i,1);
                    };
                    if(pos!==undefined)fileNum[pos]=this.fileList.length;
                    done();
                };
                if(pos==4||pos==3){
                    File.delete({
                        uri:'internal://app/'+this.type+'/'+key+(pos==4?'.txt':'.js'),
                        success:success,
                        fail:success
                    });
                }else{
                    const removeAudio=()=>{
                        if(this.destroyed)return;
                        File.delete({
                            uri:'internal://app/music/'+key+'.mp3',
                            success:success,
                            fail:success
                        });
                    };
                    File.rmdir({
                        uri:'internal://app/'+this.type+'/'+key,
                        recursive:true,
                        success:pos==2?removeAudio:success,
                        fail:pos==2?removeAudio:success
                    });
                }
                return;
            }
            this.buildList();
            this.saveDeleteProgress(()=>{
                this.deleting=false;
                this.close();
            });
        };
        this.deleteTimer=setTimeout(next,0);
    },
    saveDeleteProgress(callback){
        if(this.savingDelete)return;
        this.savingDelete=true;
        const pos={text:0,image:1,video:2,script:3,note:4}[this.type];
        if(pos!==undefined)fileNum[pos]=this.fileList.length;
        saveData('fileNum',fileNum);
        this.writeList(()=>{
            if(this.destroyed)return;
            this.savingDelete=false;
            callback?.();
        });
    },
    //删除后写回列表JSON（append兼容格式，原样推回记录）
    writeList(callback){
        const list=[];
        for(let i=0;i<this.fileList.length;i++){
            list.push(this.fileList[i]);
        };
        let json=JSON.stringify(list);
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
            text:list.length?','+escaped.slice(1,-1):'',
            success:()=>{callback?.()},
            fail:()=>{callback?.()}
        });
    },
    grabTouch(){},
    close(e={type:'click'}){
        if(this.deleting||this.destroyed)return;
        if (e.direction=='right'||e.type=='click') {
            const uri=this.type=='video'||this.type=='image'?'/pages/cardList/cardList':'/pages/rowList/rowList';
            Router.replace({
                uri:uri,
                params:{
                    type:this.type
                }
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
