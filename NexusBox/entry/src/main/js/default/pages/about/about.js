import App from '@system.app';
import Router from '@system.router';

let timer_msg=null;
let timer_clear=null;
let timer_earth=null;
let earthIdx=0;

const EARTH_FRAMES=[
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　你　好世界你・・・　　　　　　\n　　　　・・　　　　　　好世界　　你好　世　・・　　　　\n　　　・・　　　　　　　　　界你　　好　世界你・・　　　\n　　・・　　　　　　　　好世界你好世界你　好世界・・　　\n　・・　　　　　　　你好世界你好世界你好世界你好世・・　\n　・・　　　　　　　界你好世界你好世界你好世　界　・・　\n　・　　　　　　　　　你好世界你好世界你好世界你　　・　\n　・好世　　　　　　　　　　　　界你好世界你好世　　・　\n　・界你好　　　　　　　　　　　世界你好世界你　　　・　\n　・好世界你　　　　　　　　　　　好世界你好　　　　・　\n　・・世界你　　　　　　　　　　　好世界你好　世　・・　\n　・・界你好　　　　　　　　　　　世界你好　　　　・・　\n　　・・世　　　　　　　　　　　　界你好　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　你好世界你好世界・・・　　　　　　\n　　　　・・　　　　你好　　世界　　你好世界・・　　　　\n　　　・・　　　　　你好世　　　　界你好世界你・・　　　\n　　・・　　　　好世界你好世界你好世界你　好世界・・　　\n　・・　　　　你好世界你好世界你好世　界你好　　世・・　\n　・・　　　　界你好世界你好世界你好世界你　　　　・・　\n　・　　　　　好世界你好世界你好世界你好世　　　　界・　\n　・　　　　　　　　　　你好世界你好世界　　　　　　・　\n　・你　　　　　　　　　好世界你好世界　　　　　　　・　\n　・你　　　　　　　　　　好世界你好世　　　　　　　・　\n　・・　　　　　　　　　　界你好世界你　好　　　　・・　\n　・・　　　　　　　　　　世界你好世　界　　　　　・・　\n　　・・　　　　　　　　　　你好世　　　　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　你好世界你好世界你・・・　　　　　　\n　　　　・・　好世　　界你　　好　世界你好世・・　　　　\n　　　・・　　界你　　　　好世界你好世界你好世・・　　　\n　　・・　界你好世界你好世界你好世界你好世界你好・・　　\n　・・　世界你好世界你好世界　你好世界　　你好世界・・　\n　・・　你好世界你好世界你好世　界　　　　　你　　・・　\n　・　　好世界你好世界你好世界你好　　　　　　　　　・　\n　・　　　　　　世界你好世界你好世　　　　　　　　　・　\n　・　　　　　　界你好世界你好　　　　　　　　　　　・　\n　・　　　　　　　世界你好世界　　　　　　　　　　　・　\n　・・　　　　　　你好世界你好　世　　　　　　　　・・　\n　・・　　　　　　界你好世界　　你　　　　　　　　・・　\n　　・・　　　　　　好世界　　　　　　　　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世界你好・・・　　　　　　\n　　　　・・　世界你　　好　世界你好世界你好・・　　　　\n　　　・・世　　界　　你好世界你好世界你好世界・・　　　\n　　・・你好世界你好世界你好世界你好世界你好世界・・　　\n　・・你好世界你好世　界你好世　　界你好世　界你好・・　\n　・・世界你好世界你好世界　　　　　你好　　　世界・・　\n　・你好世界你好世界你好世　　　　　　界　　　你　　・　\n　・　　　好世界你好世界　　　　　　　　　　　你　好・　\n　・　　　世界你好世界　　　　　　　　　　　　　你好・　\n　・　　　世界你好世界　　　　　　　　　　　　　　　・　\n　・・　　你好世界你好　世　　　　　　　　　　　　・・　\n　・・　　　界你好世　　界　　　　　　　　　　　　・・　\n　　・・　　　你好世　　　　　　　　　　　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世界你好・・・　　　　　　\n　　　　・・世　　界　你好世界你好世界你好世・・　　　　\n　　　・・　　　界你好世界你好世界你好世界你　・・　　　\n　　・・好世界你好　世界你好世界你好世界你好世　・・　　\n　・・界你好世界你好世　　界你好世　界你好　　　　・・　\n　・・世界你好　世　　　　　界你　　　　好世　　　・・　\n　・界你好世界你好　　　　　　世　　　　　　　　　　・　\n　・界你好世界你　　　　　　　　　　　　　　　好　　・　\n　・世界你好世　　　　　　　　　　　　　　界你　　　・　\n　・　好世界你　　　　　　　　　　　　　　　　　　　・　\n　・・好世界你　好　　　　　　　　　　　　　　　世・・　\n　・・界你好　　世　　　　　　　　　　　　　　界你・・　\n　　・・好世　　　　　　　　　　　　　　　　界你・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世界你好・・・　　　　　　\n　　　　・・世　界你好世界你好世界你好世界　・・　　　　\n　　　・・你好世界你好世界你好世界你好　　世　・・　　　\n　　・・界你　好世界你好世界你好世界你好　　　　・・　　\n　・・世界你好世　　界你好　世界你好世　　　　　　・・　\n　・・界你好　　　　世界　　　　你好　　　　　　　・・　\n　・世界你好　　　　　　　　　　　世　　　　　　　　・　\n　・界你好　　　　　　　　　　　　　　世　　　　　　・　\n　・界你　　　　　　　　　　　　　好　世　　界你好　・　\n　・世界　　　　　　　　　　　　　　　　　　　　你　・　\n　・・好　世　　　　　　　　　　　　　　　界你　好・・　\n　・・世　界　　　　　　　　　　　　　你好世界你好・・　\n　　・・　　　　　　　　　　　　　　　世界你好世・・　　\n　　　・・　　　　　　　　　　　　　　　　　界・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世界你好・・・　　　　　　\n　　　　・・世界你好世界你好世界你好　世　　・・　　　　\n　　　・・界你好世界你好世界你好　世　界　　　・・　　　\n　　・・你好世界你好世界你好世界你　　　　　　　・・　　\n　・・好世　界你好世　界你好世　　　　　　　　　　・・　\n　・・　　　　界　　　　你好　　　　　　　　　　　・・　\n　・世　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　界　　你　　　　　　　　　　・　\n　・　　　　　　　　　　好世　界　　　　你好　　　　・　\n　・　　　　　　　　　　　　　　　　　　　世界　　　・　\n　・・　　　　　　　　　　　　　　　你好　世　　　・・　\n　・・　　　　　　　　　　　　　界你好世界你　　　・・　\n　　・・　　　　　　　　　　　好世界你好世界　　・・　　\n　　　・・　　　　　　　　　　　　　　　你　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世　　　・・・　　　　　　\n　　　　・・界你好世界你好世界　你　　　　　・・　　　　\n　　　・・好世界你好世界你　好世界　　　　　　・・　　　\n　　・・你好世界你好世界你　　　　　　　　　　　・・　　\n　・・　好世　界你好世　　　　　　　　　　　　　　・・　\n　・・　界　　　你好　　　　　　　　　　　　　　　・・　\n　・　　世　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　界　　你　　　　　　　　　　　　　　・　\n　・　　　　　　好　世界你　好世界你　　　　　　　　・　\n　・　　　　　　　　　　　　　　　好　　　　　　　　・　\n　・・　　　　　　　　　　　世界　　　　　　你　　・・　\n　・・　　　　　　　　　好世界你好世界　　　　　　・・　\n　　・・　　　　　　　　你好世界你好世界　　　　・・　　\n　　　・・　　　　　　　　　　　你好世　　　　・・　　　\n　　　　・・　　　　　　　　　　　界　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你　　　　　・・・　　　　　　\n　　　　・・好世界你好世　界　　　　　　　　・・　　　　\n　　　・・你好世界　　　你　　　　　　　　　　・・　　　\n　　・・好世界你好　　　　　　　　　　　　　　　・・　　\n　・・世界你好　　　　　　　　　　　　　　　　　　・・　\n　・・　　世界　　　　　　　　　　　　　　　　　　・・　\n　・　　你　　　　　　　　　　　　　　　　　　　　　・　\n　・　　好　　世　　　　　　　　　　　　　　　　　　・　\n　・　　　界　你好　世界你好　　　　　　　　　　　　・　\n　・　　　　　　　　　　　世　　　　　　　　　　　　・　\n　・・　　　　　　　界你　好　　　　　　　　　　　・・　\n　・・　　　　　世界你好世界你　　　　　　　　　　・・　\n　　・・　　　　好世界你好世界你　　　　　　　　・・　　\n　　　・・　　　　　　　　好世　　　　界　　　・・　　　\n　　　　・・　　　　　　　　你　　　好　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好　　　　　　　　・・・　　　　　　\n　　　　・・世界你　好　　　　　　　　　　　・・　　　　\n　　　・・世界　　你　　　　　　　　　　　　　・・　　　\n　　・・好世　　　　　　　　　　　　　　　　　　・・　　\n　・・界　　　　　　　　　　　　　　　　　　　　　・・　\n　・・你　好　　　　　　　　　　　　　　　　　　　・・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・世　界　　　　　　　　　　　　　　　　　　　　　・　\n　・你好　　世界你　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　好世　　　　　　　　　　　　　　　・　\n　・・　　　界你　好　　　　　　　　　　　　　　　・・　\n　・・　　世界你好世界　　　　　　　　　　　　　　・・　\n　　・・　你好世界你好世　　　　　　　　　　　　・・　　\n　　　・・　　　　　界你　　　　　　　　　　　・・　　　\n　　　　・・　　　　　好　　　世　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　・・你　　　　　　　　　　　　　　　・・　　　　\n　　　・・　好　　　　　　　　　　　　　　　　・・　　　\n　　・・　　　　　　　　　　　　　　　　　　　　・・　　\n　・・　　　　　　　　　　　　　　　　　　　　　　・・　\n　・・　　　　　　　　　　　　　　　　　　　　　　・・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・世界　你　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・・好世　界　　　　　　　　　　　　　　　　　　・・　\n　・・你好世界你　　　　　　　　　　　　　　　　　・・　\n　　・・好世界你好　　　　　　　　　　　　　　　・・　　\n　　　・・　　世界　　　　　　　　　　　　　　・・　　　\n　　　　・・　　你　　　好　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　・・　　　　　　　　　　　　　　你好・・　　　　\n　　　・・　　　　　　　　　　　　　　　　世界・・　　　\n　　・・　　　　　　　　　　　　　　　　　　　你・・　　\n　・・　　　　　　　　　　　　　　　　　　　　　好・・　\n　・・　　　　　　　　　　　　　　　　　　　　　　・・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・世　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・・界　　　　　　　　　　　　　　　　　　　　　・・　\n　・・你好　　　　　　　　　　　　　　　　　　　　・・　\n　　・・世界　　　　　　　　　　　　　　　　　　・・　　\n　　　・・你　　　好　　　　　　　　　　　　　・・　　　\n　　　　・・　　　世　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　　　　你好世・・・　　　　　　\n　　　　・・　　　　　　　　　　　界你好世界・・　　　　\n　　　・・　　　　　　　　　　　　　你好世界你・・　　　\n　　・・　　　　　　　　　　　　　　　　好世界　・・　　\n　・・　　　　　　　　　　　　　　　　　　　你　　・・　\n　・・　　　　　　　　　　　　　　　　　　　　　好・・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・　　　　　　　　　　　　　　　　　　　　　　　　・　\n　・・　　　　　　　　　　　　　　　　　　　　　　・・　\n　・・　　　　　　　　　　　　　　　　　　　　　　・・　\n　　・・　　　　　　　　　　　　　　　　　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　　你好世界你・・・　　　　　　\n　　　　・・　　　　　　　　好世界你好世界你・・　　　　\n　　　・・　　　　　　　　　　好世界你好世界　・・　　　\n　　・・　　　　　　　　　　　　你好世界　　　　・・　　\n　・・　　　　　　　　　　　　　　　你好　　　　　・・　\n　・・　　　　　　　　　　　　　　　　　　世界　　・・　\n　・　　　　　　　　　　　　　　　　　　　　　你好世・　\n　・　　　　　　　　　　　　　　　　　　　　　　界你・　\n　・　　　　　　　　　　　　　　　　　　　　　　好世・　\n　・　　　　　　　　　　　　　　　　　　　　　　界你・　\n　・・　　　　　　　　　　　　　　　　　　　　　好・・　\n　・・　　　　　　　　　　　　　　　　　　　　　世・・　\n　　・・　　　　　　　　　　　　　　　　　　　　・・　　\n　　　・・　　　　　　　　　　　　　　　　　　・・　　　\n　　　　・・　　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　你好世界你好世界・・・　　　　　　\n　　　　・・　　　　　你好世界你好世界你　　・・　　　　\n　　　・・　　　　　　　好世界你好世界你　　　・・　　　\n　　・・　　　　　　　　　好世界　　　　　　　　・・　　\n　・・　　　　　　　　　　　　你　　　　　　　　　・・　\n　・・　　　　　　　　　　　　　　好世　　　　　　・・　\n　・　　　　　　　　　　　　　　　　　界你好世界　　・　\n　・　　　　　　　　　　　　　　　　　　　你好世界　・　\n　・　　　　　　　　　　　　　　　　　　你好世界你好・　\n　・　　　　　　　　　　　　　　　　　　　世界你好世・　\n　・・　　　　　　　　　　　　　　　　　　界你好世・・　\n　・・　　　　　　　　　　　　　　　　　　　界你好・・　\n　　・・　　　　　　　　　　　　　　　　　世界你・・　　\n　　　・・　　　　　　　　　　　　　　　好世界・・　　　\n　　　　・・　　　　　　　　　　　　　你好　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好　世界你・・・　　　　　　\n　　　　・・　　好世界你好世界你好　　　　　・・　　　　\n　　　・・　　　世界你好世界你好世　　　　　　・・　　　\n　　・・　　　　　　界你好　　　　　　　　　　　・・　　\n　・・　　　　　　　　世　　　　界　　　　　　　　・・　\n　・・　　　　　　　　　　你好　　　　　　　　　　・・　\n　・　　　　　　　　　　　　　世界你好世界　　　　　・　\n　・　　　　　　　　　　　　　　　你好世界你好　　　・　\n　・　　　　　　　　　　　　　　世界你好世界你好　　・　\n　・　　　　　　　　　　　　　　　世界你好世界你好　・　\n　・・　　　　　　　　　　　　　　世界你好世界你　・・　\n　・・　　　　　　　　　　　　　　　好世界你好　　・・　\n　　・・　　　　　　　　　　　　　　世界你好　　・・　　\n　　　・・　　　　　　　　　　　　世界你　　　・・　　　\n　　　　・・　　　　　　　　　　　好　　　　・・　　　　\n　　　　　　・・・　　　　　　　世　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好世界你好世　　　・・・　　　　　　\n　　　　・・界你好世界你好世　　　　　　　　・・　　　　\n　　　・・　界你好世界你好　　　　　　　　　　・・　　　\n　　・・　　世界你　　　　　　　　　　　　　　　・・　　\n　・・　　　　好世　　　界　　　　　　　　　　　你・・　\n　・・　　　　　　好世　　　　　　　　　　　　　　・・　\n　・　　　　　　　　　界你好世界你　　　　　　　　好・　\n　・　　　　　　　　　　　世界你好世界　　　　　　　・　\n　・　　　　　　　　　　你好世界你好世界你　　　　　・　\n　・　　　　　　　　　　好世界你好世界你好世　　　　・　\n　・・　　　　　　　　　　界你好世界你好世　　　　・・　\n　・・　　　　　　　　　　　界你好世界你　　　　　・・　\n　　・・　　　　　　　　　　好世界你好　　　　　・・　　\n　　　・・　　　　　　　　　世界你　　　　　　・・　　　\n　　　　・・　　　　　　　　好　　　　　　　・・　　　　\n　　　　　　・・・　　　　　世　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你　好世界　　　　　・・・　　　　　　\n　　　　・・你好世界你　　　　　　　　　　好・・　　　　\n　　　・・世界你好世　　　　　　　　　　　　　・・　　　\n　　・・界你　　好　　　　　　　　　　　　　世界・・　　\n　・・　你　　　　　　　　　　　　　　　　　好世界・・　\n　・・　　　你好　　　　　　　　　　　　　　世界你・・　\n　・　　　　　好世界你好　　　　　　　　　　　世界你・　\n　・　　　　　　　好世界你好世　　　　　　　　　　　・　\n　・　　　　　　界你好世界你好世界　　　　　　　　　・　\n　・　　　　　　你好世界你好世界你好　　　　　　　　・　\n　・・　　　　　　世界你好世界你好　　　　　　　　・・　\n　・・　　　　　　　　世界你好世界　　　　　　　　・・　\n　　・・　　　　　　你好世界你　　　　　　　　　・・　　\n　　　・・　　　　　　好世　　　　　　　　　　・・　　　\n　　　　・・　　　　　界　　　　　　　　　　・・　　　　\n　　　　　　・・・　　你　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・你好　　　　　　　世・・・　　　　　　\n　　　　・・界你　　　　　　　　　　好世　界・・　　　　\n　　　・・你好　　　　　　　　　　　　世界你　・・　　　\n　　・・　好　　　　　　　　　　　　　世界你好世・・　　\n　・・　　界　　　　　　　　　　　　你好世界你好世・・　\n　・・界　　　　　　　　　　　　　　你好世界你好世・・　\n　・　　　界你好　　　　　　　　　　　世界你好世界你・　\n　・　　　好世界你好世　　　　　　　　　　　　　界你・　\n　・　　　好世界你好世界你　　　　　　　　　　　好世・　\n　・　　　界你好世界你好世界　　　　　　　　　　你好・　\n　・・　　　世界你好世界你　　　　　　　　　　　好・・　\n　・・　　　　世界你好世界　　　　　　　　　　　你・・　\n　　・・　　　好世界你　　　　　　　　　　　　好・・　　\n　　　・・　　世界你　　　　　　　　　　　　　・・　　　\n　　　　・・　　好　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・世　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　",
"　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　・・・　　　　　　你好世界・・・　　　　　　\n　　　　・・　　　　　　　　　　你好　　世　・・　　　　\n　　　・・　　　　　　　　　　　界你好　　世　・・　　　\n　　・・　　　　　　　　　　　界你好世界你好世界・・　　\n　・・　　　　　　　　　　　你好世界你好世界你好　・・　\n　・・　　　　　　　　　　　世界你好世界你好世界你・・　\n　・　好世　　　　　　　　　　界你好世界你好世界你好・　\n　・世界你好世　　　　　　　　　　　　　界你好世界你・　\n　・好世界你好世界　　　　　　　　　　　你好世界你　・　\n　・好世界你好世界你　　　　　　　　　　　好世界你　・　\n　・・好世界你好世　　　　　　　　　　　　界你好世・・　\n　・・　界你好世界　　　　　　　　　　　　你好世　・・　\n　　・・界你好世　　　　　　　　　　　　　界你　・・　　\n　　　・・好世　　　　　　　　　　　　　　　　・・　　　\n　　　　・・界　　　　　　　　　　　　　　　・・　　　　\n　　　　　　・・・　　　　　　　　　　・・・　　　　　　\n　　　　　　　　・・・・・・・・・・・・　　　　　　　　\n　　　　　　　　　　　　　　　　　　　　　　　　　　　　"
];

var W=[
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0.27,32/128,48/128,20/30,74/128,24/30,22/30,26/128,11/30,11/30,57/128,0.57,8/30,15/30,31/128,52/128,
    147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,8/30,35/128,74/128,74/128,74/128,58/128,
    126/128,21/30,20/30,20/30,22/30,77/128,73/128,91/128,23/30,35/128,62/128,90/128,73/128,111/128,96/128,99/128,
    78/128,99/128,20/30,74/128,75/128,95/128,87/128,126/128,87/128,82/128,75/128,11/30,52/128,11/30,15/30,56/128,
    41/128,17/30,79/128,64/128,79/128,17/30,11/30,79/128,18/30,8/30,8/30,70/128,8/30,26/30,18/30,18/30,
    79/128,79/128,12/30,14/30,12/30,18/30,16/30,24/30,66/128,69/128,61/128,49/128,26/128,49/128,74/128,0
];
W[0xB7]=15/30;
W[0xB1]=17/30;W[0xD7]=17/30;W[0xF7]=17/30;
W[0x3C0]=18/30;
W[0x2018]=41/128;W[0x2019]=41/128;W[0x201C]=15/30;W[0x201D]=15/30;
W[0x2014]=1;W[0x2026]=1;W[0x3001]=1;W[0x3002]=1;
W[0x300A]=1;W[0x300B]=1;W[0x3010]=1;W[0x3011]=1;
W[0x221A]=22/30;W[0x221E]=1;
W[0x2248]=17/30;W[0x2260]=17/30;W[0x2264]=17/30;W[0x2265]=17/30;
W[0x2211]=17/30;
W[0xFF01]=1;W[0xFF08]=1;W[0xFF09]=1;W[0xFF0C]=1;
W[0xFF1A]=1;W[0xFF1B]=1;W[0xFF1F]=1;W[0xFFE5]=1;
function getFontWidth(char) {
    const width=W[char.charCodeAt(0)];
    return width!==undefined?Math.ceil(width*30-1e-6)/30:1;
};
export default {
    data: {
        width: $app.getData().windowWidth,
        height: $app.getData().windowHeight,
        api: $app.getData().apiVersion,
        screen: $app.getData().screenShape,
        font:$app.getData().font,
        devVersion:$app.getDevVersion(),
        upDate: '腕连工具箱1.0震撼发布！',
        lines: 0,
        version:'',
        msg:{
            if:false,
            content:'',
        },
        alertShow:0,
        alertIf:false,

        name:'',
        gestureIdx:0,
        earthOn:false,
        earth:'',
        letterIf:false,
        letterShow:false,
    },
    onInit() {
        this.handledUpdate();
        this.version=App.getInfo().versionName;
    },
    onShow(){
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    onHide(){
        clearInterval(timer_earth);
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    onDestroy(){
        clearTimeout(timer_msg);
        clearInterval(timer_clear);
        clearInterval(timer_earth);
    },
    handledUpdate(){
        let maxCharsInLine = Math.floor(360 / 30);
        let result = '';
        let charInLineCount = 0;
        for (var i = 0; i < this.upDate.length; i++) {
            var ch = this.upDate[i];
            if (ch === '\r') continue;   // 忽略回车
            if (ch === '\n') {           // 保留原有换行
                result += '\n';
                charInLineCount = 0;
                continue;
            };
            var w = getFontWidth(ch);
            // 如果当前字符加上去会超出宽度 → 先插入一个 \n
            if (charInLineCount + w > maxCharsInLine && charInLineCount > 0) {
                result += '\n';
                charInLineCount = 0;
            };
            result += ch;
            charInLineCount += w;
        };
        this.upDate=result;
        this.lines=this.upDate.split('\n').length;
    },
    showAlert(idx){
        this.alertShow=idx;
        this.alertIf=true;
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
    },
    closeAlert(){
        this.alertShow=false;
        if (this.$refs.list.rotation) {
            this.$refs.list.rotation()
        };
    },
    sendMsg(msg){
        clearTimeout(timer_msg);
        this.msg.if=true;
        this.msg.content=msg;
        timer_msg=setTimeout(()=>{this.msg.if=false},4000)
    },
    closeMsg(){
        clearTimeout(timer_msg);
        clearInterval(timer_clear);
        this.msg.if=false;
    },
    swipeAlert(e){
        if (e.direction=='right'&&e.distance>=100) {
            this.closeAlert()
        }
    },
    swipe(e){
        if (e.direction=='right'&&e.distance>=100) {
            this.back()
        }
    },
    back(){
        Router.replace({
            uri:'/pages/setting/setting',
            params:{
                item:12
            }
        })
    },
    egg(){
        if (!this.earthOn) {
            this.earthOn=true;
            this.earth=EARTH_FRAMES[0];
            earthIdx=0;
            timer_earth=setInterval(()=>{
                earthIdx=(earthIdx+1)%EARTH_FRAMES.length;
                this.earth=EARTH_FRAMES[earthIdx];
            },140);
        };
        this.openLetter()
    },
    openLetter(){
        this.letterIf=true;
        this.letterShow=true;
        if (this.$refs.list&&this.$refs.list.rotation) {
            this.$refs.list.rotation({focus:false})
        };
        setTimeout(()=>{
            if (this.letterShow&&this.$refs.letter&&this.$refs.letter.rotation) {
                this.$refs.letter.rotation()
            }
        },120)
    },
    closeLetter(){
        this.letterShow=false;
        if (this.$refs.letter&&this.$refs.letter.rotation) {
            this.$refs.letter.rotation({focus:false})
        };
        if (this.$refs.list&&this.$refs.list.rotation) {
            this.$refs.list.rotation()
        }
    },
    grabClick() {
        console.log('搂住')
    }
}
