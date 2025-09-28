// export function formValidation(form: HTMLFormElement) {
//     const submit = form.querySelector('[type="submit"]') as HTMLButtonElement | HTMLInputElement | null;
//     if (submit) submit.disabled = true;
//     const validate = () => {
//         const valid = form.checkValidity();
//         if (submit) submit.disabled = !valid;
//     };
//     validate();
//     form.addEventListener('input', validate);
//     form.addEventListener('change', validate);
//     return {
//         destroy() {
//             form.removeEventListener('input', validate);
//             form.removeEventListener('change', validate);
//         }
//     };
// }

export function formValidation(form: HTMLFormElement) {
	const submit = form.querySelector('[type="submit"]') as
		| HTMLButtonElement
		| HTMLInputElement
		| null;

	const validate = () => {
		const valid = form.checkValidity();
		if (submit) submit.disabled = !valid;

		if (!valid) {
			const bad = form.querySelector<HTMLElement>(':invalid');
			if (bad) {
				const name = (bad as HTMLInputElement).name || bad.id || bad.tagName;
				const msg = (bad as HTMLInputElement).validationMessage;
				console.debug('[formValidation] invalid control:', { name, msg, node: bad });
			}
		}
	};

	// run once and on input/change
	validate();
	form.addEventListener('input', validate);
	form.addEventListener('change', validate);
	return {
		destroy() {
			form.removeEventListener('input', validate);
			form.removeEventListener('change', validate);
		}
	};
}
