import Router from '@system.router';
import Brightness from '@system.brightness';
import { getData, saveData } from '../../common/storage';

let oriX=0;
let oriY=0;
let lastMoveTime=0;
let gestureVelocityX=0;
let gestureVelocityY=0;
let gestureActive=false;
let timer_ani;
let timer_idx;
let timer_bar;
let timer_badge;

let gestureOn=true;
let clickTimeout;

let minX=-233;
let maxX=233;
let minY=-233;
let maxY=233;

const dragAxis=(offset,distance,min,max)=>{
    if ((distance>0&&offset>=max)||(distance<0&&offset<=min)) {
        const gap=Math.abs(offset-(distance>0?max:min));
        return Math.max(min-100,Math.min(max+100,offset+distance/(1+gap/60)));
    }
    return offset+distance;
};

const smoothVelocity=(velocity,distance,elapsed)=>velocity*0.55+distance/elapsed*33*0.45;

function easeOutBack(x){
    const c1=3.5;
    const c3=c1+1;
    return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);
}

export default {
    data: {
        backPage:'',
        offsetX:0,
        offsetY:0,
        zoom:100,
        idx:0,
        playList:[],
        uri:'/common/wallpaper/wallpaper.png',
        target:0,
        oriMode:-1,
        oriLight:0,
        setArr:[0,0,0],//缩放，亮度，图片idx
        curLight:-1,//上一页亮度，切图时沿用
        lightLock:false,//亮度锁定是否开启
        focusValue:10,
        barIf:false,
        barShow:false,
        title:'',
        modeCount:2,
        badgeShow:false,
        showPopup:false
    },
    onInit() {
        const firstOpen=this.oriMode==-1;
        if (this.curLight>=0) this.setArr[1]=this.curLight;
        if (firstOpen) {
            Brightness.getMode({success:(data)=>this.oriMode=data.mode});
        }
        if (this.playList.length) {
            this.uri=`internal://app/image/${this.playList[this.idx][0]}/image.png`
        };
        this.modeCount=this.playList.length>1?3:2;
        if (!this.title) {
            if (this.playList.length) {
                this.title=this.playList[this.idx][1]
            }else {
                this.title=this.uri.slice(Math.max(this.uri.lastIndexOf('/'),this.uri.lastIndexOf('\\'))+1)
            }
        }
        this.setArr[0]=(this.zoom-50)/2.5;
        minX=-233*this.zoom/100;
        maxX=233*this.zoom/100;
        minY=-233*this.zoom/100;
        maxY=233*this.zoom/100;
        if (this.playList.length>1) {
            this.setArr[2]=this.playList.length-1-this.idx;
        }
        if (firstOpen) {
            Brightness.getValue({success:(light)=>{
                this.oriLight=light.value;
                getData('lightLock',(arr)=>{
                    if (arr[1]) {
                        getData('light',(v)=>{
                            this.setArr[1]=v;
                            this.lightLock=true;
                            Brightness.setValue({
                                value:Math.round(1+v*254/100),
                                success:()=>Brightness.setMode({mode:0})
                            })
                        },50);
                    }else {
                        this.setArr[1]=Math.round(light.value/255*100)
                    }
                },[false,false,false]);
            }});
        }else {
            getData('lightLock',(arr)=>{this.lightLock=!!arr[1]},[false,false,false]);
        }
        getData('image_gesture',(v)=>{gestureOn=!!v},true);
    },
    onShow(){
        getData('tips_image',(shown)=>{
            if (!shown) {
                this.showPopup=true;
                this.barIf=true;
                this.barShow=true;
            }else {
                if (this.$refs.slider.rotation) {
                    this.$refs.slider.rotation()
                };
            }
        },false);
        //刚打开时触发序号弹窗（先卸载再挂载重播动画）
        if (this.playList.length>1) {
            this.playBadge()
        }
    },
    playBadge(){
        clearTimeout(timer_badge);
        this.badgeShow=true;
        timer_badge=setTimeout(()=>{
            this.badgeShow=false;
        },600)
    },
    onHide(){
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation({focus:false})
        };
    },
    onDestroy(){
        if (this.lightLock) saveData('light',Math.round(this.setArr[1]));
        clearTimeout(clickTimeout);
        clearInterval(timer_ani);
        clearTimeout(timer_idx);
        clearTimeout(timer_bar);
        clearTimeout(timer_badge);
    },
    resetBarTimer(){
        if (!this.barShow) {
            clearTimeout(timer_bar);
            return
        }
        clearTimeout(timer_bar);
        timer_bar=setTimeout(()=>{
            this.closeBar()
        },4000)
    },
    openBar(){
        this.barIf=true;
        this.barShow=true;
        this.resetBarTimer()
    },
    clickPage(e){
        if (gestureOn) {
            clearTimeout(clickTimeout);
            if (clickTimeout){
                this.clickFn(e.globalX);
                clickTimeout=null;
            }else {
                clickTimeout=setTimeout(()=> {{
                    if(!this.barShow)this.openBar();
                    else this.closeBar();
                    clickTimeout=null;
                }},200)
            }
        }else {
            if(!this.barShow)this.openBar();
            else this.closeBar();
        }
    },
    clickFn(x){
        if (x>=136&&x<=330){
            this.springTo();
        }else {
            if (this.playList.length<2) return;
            const next=(this.idx+(x>233?-1:1)+this.playList.length)%this.playList.length;//首尾循环
            this.playBadge();
            Router.replace({
                uri:'/pages/imageViewer/imageViewer',
                params:{
                    backPage:this.backPage,
                    offsetX:this.offsetX,
                    offsetY:this.offsetY,
                    zoom:this.zoom,
                    idx:next,
                    playList:this.playList,
                    target:this.target,
                    curLight:this.setArr[1],
                    oriMode:this.oriMode,
                    oriLight:this.oriLight
                }
            })
        };
    },
    applyZoom(value){
        //只改缩放，与当前 target 无关（走 listenSlider 会误改亮度/序号）
        this.zoom=50+value*5;
        this.setArr[0]=value*2;
        minX=-233*this.zoom/100;
        maxX=233*this.zoom/100;
        minY=-233*this.zoom/100;
        maxY=233*this.zoom/100;
        this.fix()
    },
    springTo() {
        //四档切换，50，100，200，300
        clearInterval(timer_ani);
        const startValue = this.setArr[0]/2;//当前缩放档位（与 target 无关，避免档位串味）
        const delta =(startValue<10?10:startValue<30?30:startValue<50?50:0)-startValue;
        if (delta === 0) return;
        const startTime = Date.now();
        timer_ani = setInterval(() => {
            const progress = Math.min((Date.now() - startTime) / 200, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            this.focusValue = startValue + delta * eased;
            if (progress >= 1) {
                if (this.focusValue == startValue+delta) {
                    clearInterval(timer_ani);
                }else {
                    this.focusValue = startValue+delta;
                };
            };
            this.applyZoom(this.focusValue)
        }, 33);
    },
    closeBar(){
        clearTimeout(timer_bar);
        this.barShow=false
    },
    confirmPopup(){
        this.showPopup=false;
        saveData('tips_image',true);
        if (this.$refs.slider.rotation) {
            this.$refs.slider.rotation()
        };
        this.openBar()
    },
    grabTouch(){
        this.resetBarTimer()
    },
    changTarget(){
        this.target=(this.target+1)%this.modeCount;
        this.focusValue=this.setArr[this.target];
        this.resetBarTimer()
    },
    listenSlider(e){
        this.resetBarTimer();
        this.focusValue=e.value;
        if (this.target==0) {
            this.applyZoom(e.value)
        }else if (this.target==1) {
            Brightness.setValue({
                value:Math.round(1+e.value*254/50),
                success:()=>Brightness.setMode({mode:0})
            });
            this.setArr[1]=e.value*2
        }else if (this.target==2) {
            this.setArr[2]=e.value;
            this.playBadge();//拖动序号时同步触发弹窗
            clearTimeout(timer_idx);
            timer_idx=setTimeout(()=>{
                this.jumpIdx()
            },500)
        }
    },
    jumpIdx(){
        if (!this.playList.length) return;
        if (this.setArr[2]!=this.playList.length-1-this.idx) {
            Router.replace({
                uri:'/pages/imageViewer/imageViewer',
                params:{
                    backPage:this.backPage,
                    offsetX:this.offsetX,
                    offsetY:this.offsetY,
                    zoom:this.zoom,
                    idx:this.playList.length-1-this.setArr[2],
                    playList:this.playList,
                    target:this.target,
                    curLight:this.setArr[1],
                    oriMode:this.oriMode,
                    oriLight:this.oriLight
                }
            })
        }
    },
    fix(){
        if (this.offsetX>maxX) {
            this.offsetX=maxX;
        }else if (this.offsetX<minX){
            this.offsetX=minX;
        };
        if (this.offsetY>maxY) {
            this.offsetY=maxY;
        }else if (this.offsetY<minY){
            this.offsetY=minY;
        };
    },
    touchStart(e){
        clearInterval(timer_ani);
        gestureActive=true;
        oriX=e.globalX;
        oriY=e.globalY;
        lastMoveTime=e.timestamp||Date.now();
        gestureVelocityX=0;
        gestureVelocityY=0;
    },
    touchMove(e){
        const distanceX=e.globalX-oriX;
        const distanceY=e.globalY-oriY;
        const beforeX=this.offsetX;
        const beforeY=this.offsetY;
        this.offsetX=dragAxis(this.offsetX,distanceX,minX,maxX);
        this.offsetY=dragAxis(this.offsetY,distanceY,minY,maxY);
        const now=e.timestamp||Date.now();
        const elapsed=Math.max(1,now-lastMoveTime);
        gestureVelocityX=smoothVelocity(gestureVelocityX,this.offsetX-beforeX,elapsed);
        gestureVelocityY=smoothVelocity(gestureVelocityY,this.offsetY-beforeY,elapsed);
        lastMoveTime=now;
        oriX=e.globalX;
        oriY=e.globalY;
    },
    touchEnd(){
        if (!gestureActive)return;
        gestureActive=false;
        this.inertia(gestureVelocityX*0.9,gestureVelocityY*0.9);
        gestureVelocityX=0;
        gestureVelocityY=0;
    },
    inertia(velocityX,velocityY){
        clearInterval(timer_ani);
        velocityX=Math.max(-36,Math.min(36,velocityX));
        velocityY=Math.max(-36,Math.min(36,velocityY));
        const frictionForce=10;
        const reboundDuration=500;
        let reboundX=this.offsetX<minX||this.offsetX>maxX;
        let reboundY=this.offsetY<minY||this.offsetY>maxY;
        let reboundStartX=this.offsetX;
        let reboundStartY=this.offsetY;
        let reboundTargetX=this.offsetX<minX?minX:maxX;
        let reboundTargetY=this.offsetY<minY?minY:maxY;
        let reboundTimeX=reboundX?Date.now():0;
        let reboundTimeY=reboundY?Date.now():0;
        let finished=false;
        const oneFrame=()=>{
            const now=Date.now();
            if (reboundX) {
                const progress=Math.min(1,(now-reboundTimeX)/reboundDuration);
                this.offsetX=reboundStartX+(reboundTargetX-reboundStartX)*easeOutBack(progress);
                velocityX=0;
            }
            if (reboundY) {
                const progress=Math.min(1,(now-reboundTimeY)/reboundDuration);
                this.offsetY=reboundStartY+(reboundTargetY-reboundStartY)*easeOutBack(progress);
                velocityY=0;
            }
            if (!reboundX||!reboundY) {
                const speed=Math.sqrt(velocityX*velocityX+velocityY*velocityY);
                if (speed<=frictionForce) {
                    velocityX=0;
                    velocityY=0;
                }else {
                    const frictionScale=(speed-frictionForce)/speed;
                    velocityX*=frictionScale;
                    velocityY*=frictionScale;
                }
                if (!reboundX)this.offsetX+=velocityX;
                if (!reboundY)this.offsetY+=velocityY;
            }
            if (!reboundX&&(this.offsetX<minX||this.offsetX>maxX)) {
                reboundX=true;
                reboundStartX=this.offsetX;
                reboundTargetX=this.offsetX<minX?minX:maxX;
                reboundTimeX=now;
            }
            if (!reboundY&&(this.offsetY<minY||this.offsetY>maxY)) {
                reboundY=true;
                reboundStartY=this.offsetY;
                reboundTargetY=this.offsetY<minY?minY:maxY;
                reboundTimeY=now;
            }
            if (reboundX&&now-reboundTimeX>=reboundDuration) {
                this.offsetX=reboundTargetX;
                velocityX=0;
                reboundX=false;
            }
            if (reboundY&&now-reboundTimeY>=reboundDuration) {
                this.offsetY=reboundTargetY;
                velocityY=0;
                reboundY=false;
            }
            const settledX=!reboundX&&this.offsetX>=minX&&this.offsetX<=maxX&&Math.abs(velocityX)<0.25;
            const settledY=!reboundY&&this.offsetY>=minY&&this.offsetY<=maxY&&Math.abs(velocityY)<0.25;
            if (settledX&&settledY) {
                this.fix();
                finished=true;
                clearInterval(timer_ani);
            }
        };
        oneFrame();
        if (!finished)timer_ani=setInterval(oneFrame,33);
    },
    close(){
        Brightness.setValue({
            value:this.oriLight,
            success:()=>{
                if (this.oriMode==0) Brightness.setMode({mode:0});
            }
        });
        let obj={};
        if (this.backPage=='/pages/cardList/cardList') {
            obj={
                type:'image',
                backRecord:true
            }
        }else if (this.backPage=='/pages/file/fileList/fileList') {
            obj={
                backKey:true
            }
        };
        Router.replace({
            uri:this.backPage,
            params:obj
        })
    },
}
