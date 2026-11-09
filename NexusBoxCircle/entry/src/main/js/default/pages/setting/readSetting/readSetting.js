import Router from '@system.router';
import { getData, saveData } from '../../../common/storage';
import { vibrate } from '../../../common/vibrate';

let timer_ani;
let timer_press;

export default {
    data: {
        font:$app.getData().font,
        api:$app.getData().apiVersion,
        style:{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        },
        styleIdx:0,
        styleList:[
            {n:'古文',b:'#EBDEBD',c:'#302D28'},
            {n:'素笺',b:'#F4F0E7',c:'#302D28'},
            {n:'青岚',b:'#DDEBDE',c:'#263A38'},
            {n:'月白',b:'#F5F7F2',c:'#242424'},
            {n:'松影',b:'#1F2926',c:'#E5EFE7'},
            {n:'墨潮',b:'#20252B',c:'#E6E1D5'},
            {n:'暮紫',b:'#2D2A36',c:'#F0EAF5'},
            {n:'古文',b:'#EBDEBD',c:'#302D28'},
            {n:'素笺',b:'#F4F0E7',c:'#302D28'},
            {n:'青岚',b:'#DDEBDE',c:'#263A38'},
            {n:'月白',b:'#F5F7F2',c:'#242424'},
            {n:'松影',b:'#1F2926',c:'#E5EFE7'},
            {n:'墨潮',b:'#20252B',c:'#E6E1D5'},
            {n:'暮紫',b:'#2D2A36',c:'#F0EAF5'}
        ],
        fontIdx:0,
        fontAni:0,
        previewTexts : '',
        slideRead: false,//阅读器模式：on=hyper滑动阅读, off=normal
        slideReadAni:0,
        autoSpeed: 0,
        autoDuration: 5,
        autoSpeedAni: 0,
        appear:1,
        backPage:'',//返回目标页（阅读器等传入）
        temp:null,//临时保存阅读页面数据，返回时原样回传
        fileMode:false,
    },
    onInit() {
        //开页面读取各设置
        getData('text_type',(t)=>{
            this.slideRead=(t=='hyper');
            this.slideReadAni=Number(this.slideRead)
        },'hyper');
        getData('text_styleIdx',(t)=>{
            this.styleIdx=t?t:7;
        },0);
        getData('text_fontIdx',(t)=>{
            this.fontIdx=t;
            this.fontAni=t
        },0);
        getData('text_style',(t)=>{this.style=t},{
            bgdColor:'#EBDEBD',
            size:24,
            color:'#302D28',
            font:'HarmonyOSHans-Medium'
        });
        getData('text_speed',(data)=>{
            //自动翻页速度：打开页面重新初始化（temp不再传递）
            this.autoSpeed=data;
            this.autoSpeedAni=Number(data)
        },0);
        getData('text_duration',(data)=>{
            //自动翻页速度：打开页面重新初始化（temp不再传递）
            this.autoDuration=Math.max(1,Math.min(8,data||5));
        },5);
        const texts=[
            "海内存知己，天涯若比邻",
            "滚滚长江东逝水，浪花淘尽英雄",
            "落霞与孤鹜齐飞，秋水共长天一色",
            "路漫漫其修远兮，吾将上下而求索",
            "山重水复疑无路，柳暗花明又一村",
            "天若有情天亦老，人间正道是沧桑",
            "雄关漫道真如铁，而今迈步从头越",
            "两岸猿声啼不住，轻舟已过万重山",
            "苟利国家生死以，岂因祸福避趋之",
            "不畏浮云遮望眼，自缘身在最高层",
            "人生若只如初见，何事秋风悲画扇",
            "春江潮水连海平，海上明月共潮生",
            "长风破浪会有时，直挂云帆济沧海",
            "纸上得来终觉浅，绝知此事要躬行"
        ];
        this.previewTexts=texts[Math.floor(Math.random()*texts.length)];
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
        clearInterval(timer_ani);
        clearTimeout(timer_ani);
        clearInterval(timer_press)
    },
    //switch事件：只改内存状态，关页面统一保存
    changeFont(value){
        this.fontIdx=value;
        this.springTo(Number(value),'fontAni');
        this.style.font=['HarmonyOSHans-Medium','HarmonyOS_Sans_SCGB2312-Bold'][value]
    },
    changeSlideRead(value){
        this.slideRead=value;
        this.springTo(Number(value),'slideReadAni')
    },
    changeAutoSpeed(value){
        this.autoSpeed=value;
        this.springTo(value,'autoSpeedAni')
    },
    changeAutoDuration(d){
        this.autoDuration=Math.max(1,Math.min(8,this.autoDuration+d))
    },
    pressAutoDuration(d){
        clearInterval(timer_press);
        vibrate();
        timer_press=setInterval(()=>this.changeAutoDuration(d),33)
    },
    releaseAutoDuration(){
        clearInterval(timer_press)
    },
    changeSize(d){
        this.style.size=Math.max(24,Math.min(45,this.style.size+d))
    },
    pressSize(d){
        clearInterval(timer_press);
        vibrate();
        timer_press=setInterval(()=>this.changeSize(d),33)
    },
    releaseSize(){
        clearInterval(timer_press)
    },
    changeTheme(e){
        let idx=e.index;
        this.style.bgdColor=this.styleList[idx].b;
        this.style.color=this.styleList[idx].c;
        this.styleIdx=idx%7;
    },
    saveSettings(){
        saveData('text_type', this.slideRead?'hyper':'normal');
        saveData('text_styleIdx', this.styleIdx%7);
        saveData('text_fontIdx', this.fontIdx);
        saveData('text_style', this.style);
        saveData('text_speed', this.autoSpeed);
        saveData('text_duration', this.autoDuration);
    },
    close(e){
        if (e.direction=='right'||e.type=='click') {
            //阅读器类型跟随设置：滑动阅读→hyper，否则→normal
            if (this.backPage=='/pages/textViewer/hyper/hyper'||this.backPage=='/pages/textViewer/normal/normal') {
                if (this.fileMode||this.temp.totalPage<=0)this.backPage='/pages/textViewer/normal/normal';
                else this.backPage=this.slideRead?'/pages/textViewer/hyper/hyper':'/pages/textViewer/normal/normal';
                Router.replace({
                    uri:this.backPage,
                    params:this.temp
                });
            }else {
                Router.replace({
                    uri:'/pages/setting/setting',
                    params:{
                        item:6
                    }
                })
            }
        };
    },
    springTo(target, prop, time = 300, callback) {
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
                timer_ani=null;
                callback?.();
            }
        }, 33);
    },
    grabTouch(){}
}
