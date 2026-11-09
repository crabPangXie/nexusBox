import Storage from '@system.storage';
import Device from '@system.device';
const saveData=(key,value)=>{
    Storage.set({
        key:key,
        value:JSON.stringify(value),
    })
};
const getData=(key,callback,preset)=>{
    Storage.get({
        key:key,
        default:preset!==undefined?JSON.stringify(preset):'null',
        success:(data)=>{callback(JSON.parse(data))}
    })
};
const getDevice=(obj)=>{
    const saveDevice=()=>{
        Device.getInfo({
            success:(data)=>{
                let font='HarmonyOSHans-Medium';
                if (data.apiVersion>=12){
                    font='HarmonyOS_Sans_SCGB2312-Bold'
                }else if (data.apiVersion>=10&&data.screenShape=='rect'){
                    font='HarmonyOSSans-Bold'
                };
                saveData("device",{
                    windowHeight:data.windowHeight,
                    windowWidth:data.windowWidth,
                    screenShape:data.screenShape,
                    apiVersion:data.apiVersion,
                    font:font
                });
                getDevice(obj);
            }
        })
    };
    getData("device",(data)=>{
        if (!data||(Object.keys(data).length!=Object.keys(obj).length)){
            saveDevice();
            return
        };
        for(let name in data){
            obj[name]=data[name]
        };
    })
};

export {saveData,getData,getDevice}