import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';

let gestureBackChanged = false;

export default {
    data: {
        font:$app.getData().font,
        gestureBack: false
    },
    onInit() {
        getData('gesture_back', (v) => {
            if (!gestureBackChanged) this.gestureBack = v === true;
        }, false);
    },
    onShow(){
        const list = this.$refs && this.$refs.list;
        if (list && list.rotation) {
            list.rotation()
        };
    },
    onHide(){
        const list = this.$refs && this.$refs.list;
        if (list && list.rotation) {
            list.rotation({focus:false})
        };
    },
    onGestureBackChange(e){
        gestureBackChanged = true;
        this.gestureBack = e.checked;
        saveData('gesture_back', this.gestureBack);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:10
                }
            })
        };
    }
}
