/**
 * Parses a standard Axios error from a Twitch API call and returns a clean error message.
 * @param {Error} error The error object from a catch block.
 * @param {string} defaultMessage A fallback message if a specific one can't be found.
 * @returns {string} The parsed error message.
 */
function handleTwitchApiError(error, defaultMessage) {
    const errorMessage = error.response?.data?.message || defaultMessage;
    console.error("Twitch API Error:", errorMessage);
    return errorMessage;
}

module.exports = { handleTwitchApiError };