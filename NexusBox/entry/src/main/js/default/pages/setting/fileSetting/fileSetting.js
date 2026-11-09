import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';

export default {
    data: {
        font:$app.getData().font,
        shareAuto: false,//闪传模式（分享自动）
    },
    onInit() {
        //开页面读取各设置
        getData('share_auto',(v)=>{this.shareAuto=!!v},true);
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
    onShareAuto(e){
        console.log(JSON.stringify(e))
        this.shareAuto=e.checked;
    },
    saveSettings(){
        saveData('share_auto', this.shareAuto);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:5
                }
            })
        };
    },
    grabTouch(){}
}
