import { browser } from "$app/environment";

export class UserState {
    #theme: 'light' | 'dark' = $state("dark");
    #temperatureNotation: 'celsius' | 'fahrenheit' | 'kelvin' = $state("celsius");

    constructor() {
        this.#temperatureNotation = browser ? localStorage.getItem('temperatureNotation') as 'celsius' || 'celsius' : 'celsius';
    }

    get theme(): 'light' | 'dark' {
        return this.#theme;
    }

    set theme(value: 'light' | 'dark') {
        this.#theme = value;
    }

    get temperatureNotation(): 'celsius' | 'fahrenheit' | 'kelvin' {
        return this.#temperatureNotation;
    }
    
}