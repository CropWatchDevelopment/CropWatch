export interface IAlertPoint {
    id: number;
    name: string;
    operator?: '>' | '<' | '=';
    value?: number;
    min?: number;
    max?: number;
    color: string;
};