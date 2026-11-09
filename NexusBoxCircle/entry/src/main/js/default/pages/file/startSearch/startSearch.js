import Router from '@system.router';
const textArr=['海量数据，一搜即知','纵览全局，尽在掌握','全盘检索，精准触达','搜全盘，见未来','一键溯源，全局在握','懂你所想，搜你所需','全局视野，从容管理','搜寻，即刻启程','文件万千，一触即达','深度索引，快人一步']
let timer_text,timer_bar

export default {
    data: {
        font:$app.getData().font,
        text:'',
        showBar:false,
    },
    onInit() {
        this.welcome();
        timer_bar=setInterval(()=>this.showBar=!this.showBar,500)
    },
    onDestroy() {
        clearInterval(timer_text);
        clearTimeout(timer_text);
        clearInterval(timer_bar);
    },
    welcome(){
        let i =-1;
        let j=0;
        let makeAnimation=()=>{
            this.text='';
            j = 0;
            i++;
            timer_text=setInterval(()=>{
                if (this.text.length>=textArr[i%textArr.length].length){
                    clearInterval(timer_text);
                    timer_text =  setTimeout(()=>{
                        makeAnimation();
                    },1000);
                } else {
                    this.text+=textArr[i%textArr.length][j++]
                }
            },150)
        };
        makeAnimation();
    },
    search(){
        Router.replace({
            uri:'/pages/keyboard/keyboard',
            params:{
                targetPage:'/pages/file/fileSearch/fileSearch',
                backPage:'/pages/file/startSearch/startSearch',
                targetKey:'keyWord',
                prompt:'请输入搜索内容',//提示词
                maxLen:128,//最大长度
                forbidden:"\"*+,:;<=>?[]\\",//非法字符，不推荐长文本场景使用
                allowNewline:false,//是否允许换行
                keyType:1,//0中文1小写2大写3字符
            }
        })
    },
    close(e={type:'click'}){
        if (e.direction=='right'||e.type=='click') {
            Router.replace({
                uri:'/pages/file/index/index'
            })
        }
    },

}
