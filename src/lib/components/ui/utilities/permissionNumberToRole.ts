export const permissionNumberToRole = (permissionNumber: number) => {
    switch (permissionNumber) {
        case 1:
            return 'Administrator';
        case 1:
            return 'User';
        case 1:
            return 'Viewer';
        default:
            return 'Unknown';
    }
}