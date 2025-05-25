const validateBaseAccess = async (user, baseId) => {
    // Admin and logistics officers have access to all bases
    if (user.role === 'admin' || user.role === 'logistics_officer') {
        return true;
    }

    // For base commanders, check if they have a base assigned
    if (!user.base) {
        return false;
    }

    // Compare base IDs
    return user.base.toString() === baseId.toString();
};

module.exports = {
    validateBaseAccess
}; 