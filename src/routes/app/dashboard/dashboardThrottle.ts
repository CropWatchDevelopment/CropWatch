export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	wait: number,
	{ trailing = false } = {}
) {
	let last = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: any[] | null = null;

	return function (this: any, ...args: any[]) {
		const now = Date.now();
		const remaining = wait - (now - last);

		if (remaining <= 0) {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			last = now;
			fn.apply(this, args);
		} else if (trailing) {
			lastArgs = args;
			if (!timer) {
				timer = setTimeout(() => {
					last = Date.now();
					timer = null;
					fn.apply(this, lastArgs!);
					lastArgs = null;
				}, remaining);
			}
		}
	} as T;
}
