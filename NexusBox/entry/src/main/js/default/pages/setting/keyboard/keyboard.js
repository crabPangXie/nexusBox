import Router from '@system.router';

const textArr = ['QQ弹弹会拉丝的动画。','超超超超级全的词库。', '上滑键入，快人亿步。', '光标移动，长文本随心改。', '自带剪切板，三方可接入。','输入偏好，越用越懂你。'];
let timer_text = null;
let timer_hold = null;
let timer_bar = null;

export default {
    data: {
        font: $app.getData().font,
        text: '',
        showBar: false,
    },
    onShow() {
        this.stopTyping();
        this.welcome();
        timer_bar = setInterval(() => this.showBar = !this.showBar, 500);
        const swiper = this.$refs && this.$refs.swiper;
        if (swiper && typeof swiper.rotation === 'function') {
            swiper.rotation();
        }
    },
    onHide() {
        this.stopTyping();
        this.releaseRotation();
    },
    onDestroy() {
        this.stopTyping();
    },
    welcome() {
        let i = -1;
        const makeAnimation = () => {
            this.text = '';
            i++;
            const phrase = textArr[i % textArr.length];
            timer_text = setInterval(() => {
                if (this.text.length >= phrase.length) {
                    clearInterval(timer_text);
                    timer_text = null;
                    timer_hold = setTimeout(() => {
                        timer_hold = null;
                        makeAnimation();
                    }, 1000);
                } else {
                    this.text += phrase[this.text.length];
                }
            }, 150);
        };
        makeAnimation();
    },
    stopTyping() {
        clearInterval(timer_text);
        clearTimeout(timer_hold);
        clearInterval(timer_bar);
        timer_text = null;
        timer_hold = null;
        timer_bar = null;
        this.showBar = false;
    },
    releaseRotation() {
        const swiper = this.$refs && this.$refs.swiper;
        if (swiper && typeof swiper.rotation === 'function') {
            swiper.rotation({ focus: false });
        }
    },
    close(e = { type: 'click' }) {
        if (e.direction === 'right' || e.type === 'click') {
            this.stopTyping();
            Router.replace({
                uri: '/pages/setting/setting',
                params:{
                    item:13
                }
            });
        }
    },
}
