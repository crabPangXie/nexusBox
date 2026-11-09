import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';

export default {
    data: {
        font:$app.getData().font,
        gestureOn: true,
    },
    onInit() {
        //开页面读取各设置
        getData('image_gesture',(v)=>{this.gestureOn=!!v},true);
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
    onGesture(e){
        this.gestureOn=e.checked;
    },
    saveSettings(){
        saveData('image_gesture', this.gestureOn);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:7
                }
            })
        };
    },
    grabTouch(){}
}
