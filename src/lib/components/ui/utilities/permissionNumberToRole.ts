export const permissionNumberToRole = (permissionNumber: number) => {
    switch (permissionNumber) {
        case 1:
            return 'Administrator';
        case 2:
            return 'User';
        case 3:
            return 'Viewer';
        default:
            return 'Unknown';
    }
}