function calculateNPKRatio(N: number, P: number, K: number): string {
    // Calculate the base ratio by dividing each value by the smallest of the three
    const base = Math.min(N, P, K);

    // Calculate the simplified ratio for each nutrient
    const ratioN = Math.round(N / base);
    const ratioP = Math.round(P / base);
    const ratioK = Math.round(K / base);

    // Return the ratio as a string in the format "N:P:K"
    return `${ratioN}:${ratioP}:${ratioK}`;
}