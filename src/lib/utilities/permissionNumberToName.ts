export const PermissionNumberToName = (permissionNumber: number) => {
    switch (permissionNumber) {
        case 0:
            return 'No Permission';
        case 1:
            return 'Admin';
        case 2:
            return 'User';
        case 3:
            return 'View Only';
        default:
            return 'Unknown';
    }
}

export const PermissionNameToNumber = (permissionName: string) => {
    switch (permissionName) {
        case 'No Permission':
            return 0;
        case 'Admin':
            return 1;
        case 'User':
            return 2;
        case 'View Only':
            return 3;
        default:
            return -1;
    }
}