import Sensor from '@system.sensor';
import Router from '@system.router';

let value=[];
let maxValue=1;
let minValue=0;
let subscriptionId=0;
let multiUpdateCount=0;
let compassThrottleTimer=null;
let compassThrottleData=null;
let compassThrottleSubscription=0;
let sensorList={
    '加速度':{
        fn:'subscribeAccelerometer',
        value:['x','y','z'],
        color:['#FF5B5B','#5BCE8E','#5B9BFF'],
    },
    '陀螺仪':{
        fn:'subscribeGyroscope',
        value:['x','y','z'],
        color:['#FF5B5B','#5BCE8E','#5B9BFF']
    },
    '设备方向':{
        fn:'subscribeDeviceOrientation',
        value:['alpha','beta','gamma'],
        color:['#FF5B5B','#5BCE8E','#5B9BFF']
    },
    '指南针':{
        fn:'subscribeCompass',
        value:['direction'],
        color:['#5B9BFF']
    },
    '距离':{
        fn:'subscribeProximity',
        value:['distance'],
        color:['#5B9BFF']
    },
    '光强':{
        fn:'subscribeLight',
        value:['intensity'],
        color:['#5B9BFF']
    },
    '计步':{
        fn:'subscribeStepCounter',
        value:['steps'],
        color:['#5B9BFF']
    },
    '气压':{
        fn:'subscribeBarometer',
        value:['pressure'],
        color:['#5B9BFF']
    },
    '心率':{
        fn:'subscribeHeartRate',
        value:['heartRate'],
        color:['#FF5B5B']
    },
    '佩戴':{
        fn:'subscribeOnBodyState',
        value:['value'],
        color:['#5B9BFF']
    }
};
let sensorInterval={
    '加速度':'normal',
    '陀螺仪':'normal',
    '设备方向':'normal'
};
let nowSen='';
export default {
    data: {
        font:$app.getData().font,
        sensorName: '加速度',
        canvasIdx:0,
        canvasIf:[true,true,true],
        canvasShow:[false,false,false],

        valueArr:[],
        nameArr:[],
        colorArr:[],

        selectShow:false,//选择弹窗if（挂载）
        selectIf:false,//选择弹窗show（动画）
        optionList:['加速度','陀螺仪','设备方向','指南针','距离','光强','计步','气压','心率','佩戴'],
        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {

    },
    onShow() {
        this.subSensor('加速度-normal')
    },
    onHide() {
        this.unSubSensor();
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onDestroy() {
        this.unSubSensor()
        clearTimeout(this.msg.timer)
    },
    subSensor(sen){
        nowSen=sen;
        this.closeSelect();
        const currentSubscription=subscriptionId;
        const i=sen.indexOf('-');
        let interval='';
        if (i!==-1) {
            interval=sen.slice(i+1);
            sen=sen.slice(0,i)
        }else {
            interval=sensorInterval[sen]||''
        };
        this.sensorName=sen;
        this.nameArr=sensorList[sen].value;
        this.colorArr=sensorList[sen].color;
        let vArr=[];
        for (let i = 0; i < this.nameArr.length; i++) {
            value.push([]);
            vArr.push('--')
        };
        this.valueArr=vArr;
        const handleData=(data)=>{
                let vArr=[];
                const l =this.nameArr.length>1?21:31;
                this.nameArr.forEach((element,idx)=>{
                    const arr=value[idx];
                    const v=data[element];
                    if (this.nameArr.length>1) {
                        maxValue=Math.max(maxValue,Math.abs(v))
                    }else {
                        maxValue=Math.max(maxValue,v);
                        minValue=Math.min(minValue,v)||v;
                    }
                    arr.unshift(v);
                    vArr.push(v);
                    if (arr.length>l)arr.length=l
                });
                if (this.nameArr.length>1) {
                    multiUpdateCount++;
                    if (multiUpdateCount%2!==0) return;
                }
                this.valueArr=vArr;
                if (this.nameArr[0]=='value')return;
                if (this.nameArr.length>1) {
                    this.drawSymmetric()
                }else {
                    this.drawNormal()
                }
        };
        let obj={
            success:(data)=>{
                if (currentSubscription!==subscriptionId) return;
                if (sensorList[sen].fn==='subscribeCompass') {
                    compassThrottleData=data;
                    compassThrottleSubscription=currentSubscription;
                    if (compassThrottleTimer!==null) return;
                    compassThrottleTimer=setTimeout(()=>{
                        compassThrottleTimer=null;
                        const pendingData=compassThrottleData;
                        compassThrottleData=null;
                        if (pendingData!==null && compassThrottleSubscription===subscriptionId) {
                            handleData(pendingData);
                        }
                    },200);
                    return;
                }
                handleData(data);
            },
            fail:()=>{
                this.sendMsg('设备不支持此传感器')
            }
        };
        if (interval) {
            obj.interval=interval
        };
        try {
            Sensor[sensorList[sen].fn](obj)
        }catch (e){
            this.sendMsg('设备不支持此传感器')
        }
    },
    unSubSensor(){
        subscriptionId++;
        this.nameArr=[];
        this.valueArr=[];
        this.colorArr=[];
        value=[];
        maxValue=1;
        minValue=0;
        multiUpdateCount=0;
        if (compassThrottleTimer!==null) {
            clearTimeout(compassThrottleTimer);
            compassThrottleTimer=null;
        }
        compassThrottleData=null;
        compassThrottleSubscription=subscriptionId;
        try{Sensor.unsubscribeAccelerometer()}catch(e){};
        try{Sensor.unsubscribeCompass()}catch(e){};
        try{Sensor.unsubscribeProximity()}catch(e){};
        try{Sensor.unsubscribeLight()}catch(e){};
        try{Sensor.unsubscribeStepCounter()}catch(e){};
        try{Sensor.unsubscribeBarometer()}catch(e){};
        try{Sensor.unsubscribeHeartRate()}catch(e){};
        try{Sensor.unsubscribeOnBodyState()}catch(e){};
        try{Sensor.unsubscribeDeviceOrientation()}catch(e){};
        try{Sensor.unsubscribeGyroscope()}catch(e){};
        this.canvasShow[this.canvasIdx]=true;
        this.canvasShow[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+1)%3]=true;
        this.canvasIdx=(this.canvasIdx+1)%3
    },
    drawSymmetric(){
        //绘制新的一帧
        //获取当前帧canvas2D对象
        const canvas=this.$refs['canvas'+this.canvasIdx].getContext('2d');
        canvas.fillStyle= '#b3ffffff';
        canvas.lineWidth=3;
        canvas.font='24px HarmonyOSHans-Medium'
        canvas.fillText(this.formatChartValue(maxValue),0,0)
        canvas.fillText(this.formatChartValue(-maxValue),0,200-25)
        const d=maxValue*2;
        this.colorArr.forEach((element,idx)=>{
            canvas.beginPath();
            canvas.strokeStyle=element;
            //根据当前value绘制，360/30点位=12px间隔
            //根据最大最小值确认位置
            value[idx].forEach((element,idx)=>{
                if (idx)canvas.lineTo(360-idx*18,200-200*(element+maxValue)/d)
                else canvas.moveTo(360,200-200*(element+maxValue)/d)
            });
            canvas.stroke();
        });
        //绘制完成，关闭上一帧，同时销毁，提前开启下一帧
        this.canvasShow[this.canvasIdx]=true;
        this.canvasShow[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+1)%3]=true;
        this.canvasIdx=(this.canvasIdx+1)%3
    },
    drawNormal(){
        //绘制新的一帧
        //获取当前帧canvas2D对象
        const canvas=this.$refs['canvas'+this.canvasIdx].getContext('2d');
        canvas.fillStyle= '#b3ffffff';
        canvas.lineWidth=3;
        canvas.font='24px HarmonyOSHans-Medium'
        canvas.fillText(this.formatChartValue(maxValue),0,0)
        canvas.fillText(this.formatChartValue(minValue),0,200-24)

        canvas.strokeStyle=this.colorArr[0];
        //根据当前value绘制，360/30点位=12px间隔
        //根据最大最小值确认位置
        const d=(maxValue-minValue)||1;
        canvas.beginPath();
        value[0].forEach((element,idx)=>{
            if (idx)canvas.lineTo(360-idx*12,200-200*(element-minValue)/d)
            else canvas.moveTo(360,200-200*(element-minValue)/d)
        });
        canvas.stroke();

        //绘制完成，关闭上一帧，同时销毁，提前开启下一帧
        this.canvasShow[this.canvasIdx]=true;
        this.canvasShow[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+2)%3]=false;
        this.canvasIf[(this.canvasIdx+1)%3]=true;
        this.canvasIdx=(this.canvasIdx+1)%3
    },

    //选择弹窗：打开立即停止传感器，关闭恢复
    openSelect() {
        this.unSubSensor();
        this.selectShow = true;
        this.selectIf = true;
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    closeDirectly(){
        this.subSensor(nowSen);
    },
    closeSelect(e={type:'click'}) {
        if (e.direction=='right'||e.type=='click') {
            this.selectShow = false;
            if (this.$refs.list.rotation) {
                this.$refs.list.rotation({focus:false})
            };
        }
    },
    formatValue(value) {
        if (typeof value=='boolean') return value?'true':'false';
        if (!isFinite(value)) return '--';
        return String(Number(value.toPrecision(8)));
    },
    formatChartValue(value) {
        if (!isFinite(value)) return '--';
        return String(Number(value.toPrecision(6)));
    },
    sendMsg(msg,interval=1000){
        clearTimeout(this.msg.timer);
        this.msg.content=msg;
        this.msg.timer=setTimeout(()=>this.closeMsg(),interval)
    },
    closeMsg(){
        clearTimeout(this.msg.timer);
        this.msg.content='';
        this.msg.timer=null
    },
    close(e) {
        if (e.direction == 'right' || e.type == 'click') {
            this.unSubSensor();
            Router.replace({
                uri: '/pages/device/index/index'
            })
        };
    }
}
