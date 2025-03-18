export const validateResetValue = (criterion) => {
    if (criterion.operator === '>' || criterion.operator === '>=') {
        if (criterion.reset_value >= criterion.trigger_value) {
            // Failed to validate
        }
    } else if (criterion.operator === '<' || criterion.operator === '<=') {
        if (criterion.reset_value <= criterion.trigger_value) {
            // Failed to validate
        }
    }
};