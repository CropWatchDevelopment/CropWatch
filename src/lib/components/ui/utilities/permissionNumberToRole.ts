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

