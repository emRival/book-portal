// Dynamic API URL based on the current window location
// This allows the app to work from any IP address (e.g., 192.168.x.x)
const getApiUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = 3055; // Backend port is fixed in docker-compose
    return `${protocol}//${hostname}:${port}`;
};

export const API_BASE_URL = getApiUrl();
