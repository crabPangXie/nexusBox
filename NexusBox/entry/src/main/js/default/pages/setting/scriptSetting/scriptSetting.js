import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';
let timer_msg=null;

export default {
    data: {
        font:$app.getData().font,
        fontColor:'',
        fontIdx:0,
        fontList:[
            '#FFFFFF',
            '#00E5FF',
            '#ff00ffae',
            '#ff26ff00',
            '#FFD166',
            '#FF6BCE',
            '#A78BFA',
            '#4D9FFF',
            '#FF7A59'
        ],
        msg:{
            if:false,
            content:'',
        },
    },
    onInit() {
        getData('script_style',(v)=>{
            this.fontColor=v;
            this.fontList.forEach((e,i)=>{
                if (e==v) {
                    this.fontIdx=i
                }
            })
        },'#FFFFFF');
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
        clearTimeout(timer_msg);
        saveData('script_style',this.fontColor)
    },
    changeColor(idx){
        this.fontIdx=idx;
        this.fontColor=this.fontList[idx];
        this.closeMsg();
        if (idx==3) {
            this.sendMsg('黑客模式已开启')
        }
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:9
                }
            })
        };
    },
    sendMsg(msg){
        clearTimeout(timer_msg);
        this.msg.if=true;
        this.msg.content=msg;
        timer_msg=setTimeout(()=>{this.msg.if=false},1000)
    },
    closeMsg(){
        clearTimeout(timer_msg);
        this.msg.if=false;
    },
    grabTouch(){}
}
