/**
 * A simple middleware to validate that required fields exist on the request body.
 * @param {string[]} requiredFields An array of field names that must be present.
 * @returns A middleware function for use in an API route.
 */
const validateBody = (requiredFields) => (req, res) => {
    for (const field of requiredFields) {
        if (!req.body[field]) {
            res.status(400).json({ message: `Missing required field: ${field}` });
            return false; // Indicates validation failed
        }
    }
    return true; // Indicates validation passed
};

module.exports = { validateBody };