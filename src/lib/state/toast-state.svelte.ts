export class ToastState {
    open = false;
    title = '';
    message = '';
    icon = '';
    type = 'success';
    timeout = 5000;
    timer: NodeJS.Timeout;


    static instance: ToastState;
    static getInstance() {
        if (!ToastState.instance) {
            ToastState.instance = new ToastState();
        }
        return ToastState.instance;
    }

    constructor() {
        this.timer = setTimeout(() => {
            this.open = false;
        }, this.timeout);
    }

    show(message: string, type = 'success', timeout = 5000) {
        this.message = message;
        this.type = type;
        this.timeout = timeout;
        this.open = true;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.open = false;
        }, this.timeout);
    }
}
