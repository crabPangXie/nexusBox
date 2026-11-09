import Router from '@system.router';

export default {
    data: {
        font:$app.getData().font,
        from:'',
    },
    onInit() {
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
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            if (this.from=='text'||this.from=='script'||this.from=='note') {
                Router.replace({
                    uri:'/pages/rowList/rowList',
                    params:{
                        type:this.from
                    }
                })
            }else if (this.from=='image'||this.from=='video') {
                Router.replace({
                    uri:'/pages/cardList/cardList',
                    params:{
                        type:this.from
                    }
                })
            }else {
                Router.replace({
                    uri:'/pages/setting/setting',
                    params:{
                        item:11
                    }
                })
            }
        };
    },
    grabTouch(){}
}
