// Node.js script to update an agent's avatar URL using fetch

// --- Configuration ---
const BASE_URL = "https://agentverse.ai/v1/hosting";

// --- Command Line Arguments ---
const agentAddress = process.argv[2];
const avatarUrl = process.argv[3];
const apiToken = process.argv[4];

// --- Input Validation ---
if (!agentAddress || !avatarUrl || !apiToken) {
    console.error("Error: Missing required arguments.");
    console.error("Usage: node update_agent_avatar.js <AGENT_ADDRESS> <AVATAR_URL> <API_TOKEN>");
    process.exit(1);
}

// --- API Request Setup ---
const updateUrl = `${BASE_URL}/agents/${agentAddress}`;
const headers = {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json"
};
const body = JSON.stringify({
    avatar_url: avatarUrl // Only include the avatar_url field
});

// --- Helper function to handle fetch responses ---
async function handleResponse(response, stepName) {
    console.log(`--- ${stepName} ---`);
    console.log(`Status Code: ${response.status}`);
    let responseData = null;
    let rawText = ''; // Store raw text
    try {
        rawText = await response.text();
        if (rawText) {
            try {
                responseData = JSON.parse(rawText);
                console.log("Response JSON:", JSON.stringify(responseData, null, 2));
            } catch (parseError) {
                console.error("Error parsing JSON response:", parseError);
                console.log("Raw Response Text:", rawText);
            }
        } else {
            console.log("Response Body: (empty)");
        }
    } catch (readError) {
        console.error("Error reading response body:", readError);
    }

    if (!response.ok) {
        console.error(`!!! ${stepName} FAILED (HTTP ${response.status}) !!!`);
        if (rawText) console.log("Raw Response Text on Failure:", rawText);
        process.exit(1); // Exit script on failure
    }
    return { data: responseData, text: rawText };
}

// --- Main Update Function ---
async function updateAvatar() {
    console.log(`Updating avatar for agent ${agentAddress} to ${avatarUrl}...`);

    try {
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: headers,
            body: body
        });

        await handleResponse(updateResponse, "Update Agent Avatar");

        console.log("-" * 20);
        console.log("Agent avatar update script finished successfully.");

    } catch (error) {
        console.error("!!! SCRIPT FAILED !!!");
        console.error(error);
        process.exit(1);
    }
}

// --- Run the update ---
updateAvatar();
