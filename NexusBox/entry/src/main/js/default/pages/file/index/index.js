import Router from '@system.router';
import File from '@system.file';
import { vibrate } from '../../../common/vibrate';
let timer_ani;
export default {
    data: {
        font:$app.getData().font,
        rootPath:$app.getRootPath(),
        collectionArr:[],
        collection:[],
        chosenCollection:0,

        alertShow:false,
        alertIf:false,
        openIdx:-1,
        openAni:0,

        msg:{
            content:'',
            timer:null
        }
    },
    onHide(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onShow(){
        setTimeout(()=>{
            if (this.openIdx>=0)this.springTo(1,'openAni',300);
        },200);
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
        let that=this;
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
                        try{
                            that.collectionArr=JSON.parse(result);
                            let arr=[];
                            that.collectionArr.forEach((item)=>arr.push(item.slice(item.lastIndexOf('/')+1)));
                            that.collection=arr;
                        }catch(e){};
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
                        fail:()=>{}
                    });
                }
                readChunk();
            },
            fail:()=>{}
        });
    },
    onDestroy(){
        let json=JSON.stringify(this.collectionArr);
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
        });
        clearTimeout(this.msg.timer);
        clearInterval(timer_ani);
    },
    getRealUri(uri){
        return this.rootPath+uri
    },
    showAlert_collection(idx){
        vibrate()
        this.chosenCollection=idx;
        this.alertIf=true;
        this.alertShow=true;
    },
    closeAlert(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            this.alertShow=false;
            this.chosenCollection=-1;
        }
    },
    delete_collection(){
        if (this.chosenCollection<0) return;
        this.collectionArr.splice(this.chosenCollection,1);
        this.collection.splice(this.chosenCollection,1);
        this.closeAlert()
    },
    quickJump_collection(chosen){
        let uri=this.collectionArr[chosen];
        File.get({
            uri:this.getRealUri(uri),
            success:()=>{
                uri=uri.slice(0,uri.lastIndexOf('/'));
                File.list({
                    uri:this.getRealUri(uri),
                    success:(data)=>{
                        let idx=0;
                        const name=this.collection[chosen];
                        data.fileList.forEach((item,id)=>{
                            if (item.uri==name) {
                                idx=id;
                                return;
                            }
                        });
                        this.jumpToList(uri,idx);
                    }
                })
            },
            fail:()=>{
                this.sendMsg('该路径不存在');
                this.chosenCollection=chosen;
                this.delete_collection()
            }
        })
    },
    jumpToList(uri,idx=-1){
        if (typeof uri!='string') {
            uri=null
        };
        Router.replace({
            uri:'/pages/file/fileList/fileList',
            params:{
                uri:uri,
                routerIdx:idx
            }
        })
    },
    jumpToSearch(){
        Router.replace({
            uri:'/pages/file/startSearch/startSearch'
        })
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/index/index',
                params:{
                    openIdx:0
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
    grabTouch(){}
}
