import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';

export default {
    data: {
        font:$app.getData().font,
        lightLock:[false,false,false],
        light:50
    },
    onInit() {
        //开页面读取各设置
        getData('lightLock',(arr)=>{this.lightLock=arr},[false,false,false]);
        getData('light',(v)=>{
            this.light=v
        },50);
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
    setLight(){
        Router.replace({
            uri:'/pages/setting/adjust/adjust',
            params:{
                target:'light'
            }
        })
    },
    changeLock(idx){
        this.lightLock[idx]=!this.lightLock[idx]
    },
    saveSettings(){
        saveData('lightLock', this.lightLock);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/setting/setting',
                params:{
                    item:2
                }
            })
        };
    },
    grabTouch(){}
}
