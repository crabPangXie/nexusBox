import Vibrator from '@system.vibrator';
import { getData } from './storage';
let vibrateOn=true
getData('vibrate',(data)=>{
    vibrateOn=data
},true);
const vibrate=()=>{
    if (vibrateOn){
        Vibrator.vibrate({
            mode:'short'
        })
    }
};
export {vibrate}