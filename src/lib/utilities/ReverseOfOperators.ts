export const ReverseOperator = (value: string) => {
    switch (value) {
        case '>':
            return '<';
        case '<':
            return '>';
        case '>=':
            return '<=';
        case '<=':
            return '>=';
        case '==':
            return '!=';
        case '!=':
            return '==';
        default:
            return '';
    }
}