export function formValidation(form: HTMLFormElement) {
    const submit = form.querySelector('[type="submit"]') as HTMLButtonElement | HTMLInputElement | null;
    if (submit) submit.disabled = true;
    const validate = () => {
        const valid = form.checkValidity();
        if (submit) submit.disabled = !valid;
    };
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
