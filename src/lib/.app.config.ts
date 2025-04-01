import { createLocaleSettings } from "svelte-ux";

const themes: string[] = [
    'light',
    'dark',
];

export const appConfigDefaults = {
    // fallbackLocale: 'fr',
    localeFormats: {
        fr: createLocaleSettings({
            locale: 'fr',
            formats: {
                dates: {
                    baseParsing: 'dd/MM/yyyy',
                    ordinalSuffixes: {
                        one: 'er',
                    },
                },
                numbers: {
                    defaults: {
                        currency: 'EUR',
                    },
                },
            },
            dictionary: {
                Ok: 'Valider',
                Cancel: 'Annuler',
                Date: {
                    Start: 'Début',
                    End: 'Fin',
                    Empty: 'Vide',

                    Day: 'Jour',
                    DayTime: 'Jour & Heure',
                    Time: 'Heure',
                    Week: 'Semaine',
                    Month: 'Mois',
                    Quarter: 'Trimestre',
                    CalendarYear: 'Année',
                    FiscalYearOct: 'Année fiscale (octobre)',
                    BiWeek: 'Bi-hebdomadaire',

                    PeriodDay: {
                        Current: "Aujourd'hui",
                        Last: 'Hier',
                        LastX: 'Les {0} derniers jours',
                    },
                    PeriodWeek: {
                        Current: 'Cette semaine',
                        Last: 'La semaine dernière',
                        LastX: 'Les {0} dernières semaines',
                    },
                    PeriodBiWeek: {
                        Current: 'Cette quinzaine',
                        Last: 'La quinzaine dernière',
                        LastX: 'Les {0} dernières quinzaines',
                    },
                    PeriodMonth: {
                        Current: 'Ce mois-ci',
                        Last: 'Le mois dernier',
                        LastX: 'Les {0} derniers mois',
                    },
                    PeriodQuarter: {
                        Current: 'Ce trimestre',
                        Last: 'Le trimestre dernier',
                        LastX: 'Les {0} derniers trimestres',
                    },
                    PeriodQuarterSameLastyear: "Même trimestre l'année dernière",
                    PeriodYear: {
                        Current: 'Cette année',
                        Last: "L'année dernière",
                        LastX: 'Les {0} dernières années',
                    },
                    PeriodFiscalYear: {
                        Current: 'Cette année fiscale',
                        Last: "L'année fiscale dernière",
                        LastX: 'Les {0} dernières années fiscales',
                    },
                },
            },
        }),
    },

    components: {
        AppLayout: {
            classes: {
                aside: 'border-r',
                nav: 'bg-surface-300 py-2 h-full flex',
            },
        },
        AppBar: {
            classes:
                `bg-primary
                text-primary-content
                shadow-md
                [text-shadow:1px_1px_2px_theme(colors.primary-700)]
                `,
        },
        NavItem: {
            classes: {
                root: 'text-sm text-surface-content/70 pl-6 py-2 hover:bg-surface-100/70 relative',
                active:
                    'text-primary bg-surface-100 font-medium before:absolute before:bg-primary before:rounded-full before:w-1 before:h-2/3 before:left-[6px] shadow z-10',
            },
        },
    },
    themes: {
        light: ['light'], // Example light themes
        dark: ['dark', 'dark'],   // Example dark themes
    },
}