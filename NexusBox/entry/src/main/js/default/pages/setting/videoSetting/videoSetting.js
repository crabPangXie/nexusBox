import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';

export default {
    data: {
        font:$app.getData().font,
        videoAuto: false,
        videoControl:true
    },
    onInit() {
        //开页面读取各设置
        getData('video_auto',(v)=>{this.videoAuto=!!v},false);
        getData('video_control',(v)=>{this.videoControl=!!v},true);
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
        this.saveSettings();
    },
    onVideoAuto(e){
        this.videoAuto=e.checked;
    },
    onVideoControl(e){
        this.videoControl=e.checked;
    },
    saveSettings(){
        saveData('video_auto', this.videoAuto);
        saveData('video_control', this.videoControl);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:8
                }
            })
        };
    },
    grabTouch(){}
}
