import axios from "axios";

async function request(url, method, apiKey) {
    try {
        if (!url) {
            throw new Error("URL is required");
        }
        if (!method) {
            throw new Error("Method is required");
        }
        const normalizedMethod = method.toUpperCase();
        if (normalizedMethod !== "GET" && normalizedMethod !== "POST") {
            throw new Error(`Only GET and POST are supported, received: ${method}`);
        }
        const clientInstance = axios.create({
            baseURL: "",
        });

        if (apiKey !== undefined && apiKey !== null) {
            clientInstance.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
        }

        const requestHandle = async () => {
            return normalizedMethod === "GET"
                ? await clientInstance.get(url)
                : await clientInstance.post(url);
        };

        const result = await requestHandle().then(function (response) {
            const allData = {
                response: response.data ? response.data : null,
                responseStatus: response.status,
                statusText: response.statusText,
            };
            return allData;
        });

        return result.response;
    } catch (error) {
        console.error("Error sending request:", error.message, error.response?.data || "");
        throw error;
    }
}

export { request };