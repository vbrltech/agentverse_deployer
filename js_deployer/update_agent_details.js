// Node.js script to update agent details (name, readme, avatar_url, short_description) using fetch

// --- Configuration ---
const BASE_URL = "https://agentverse.ai/v1/hosting";

// --- Command Line Arguments ---
const agentAddress = process.argv[2];
const apiToken = process.argv[3];
const args = process.argv.slice(4); // Get arguments after address and token

// --- Input Validation ---
if (!agentAddress || !apiToken) {
    console.error("Error: Missing required arguments (agent address or API token).");
    console.error("Usage: node update_agent_details.js <AGENT_ADDRESS> <API_TOKEN> [--name \"New Name\"] [--readme \"New Readme\"] [--avatar_url \"new_url\"] [--short_description \"New Desc\"]");
    process.exit(1);
}

// --- Parse Flags and Build Update Data ---
const updateData = {};
const validFlags = ["--name", "--readme", "--avatar_url", "--short_description"];

for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    if (!validFlags.includes(flag)) {
        console.warn(`Warning: Ignoring unrecognized flag '${flag}'`);
        continue;
    }
    if (value === undefined) {
        console.error(`Error: Missing value for flag '${flag}'`);
        process.exit(1);
    }

    // Convert flag to API field name (e.g., --avatar_url -> avatar_url)
    const fieldName = flag.substring(2); // Remove "--"
    updateData[fieldName] = value;
}

if (Object.keys(updateData).length === 0) {
    console.error("Error: No update flags provided. Please specify at least one field to update (e.g., --name \"New Name\").");
    console.error("Usage: node update_agent_details.js <AGENT_ADDRESS> <API_TOKEN> [--name \"New Name\"] [--readme \"New Readme\"] [--avatar_url \"new_url\"] [--short_description \"New Desc\"]");
    process.exit(1);
}

// --- API Request Setup ---
const updateUrl = `${BASE_URL}/agents/${agentAddress}`;
const headers = {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json"
};
const body = JSON.stringify(updateData);

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
async function updateDetails() {
    console.log(`Updating details for agent ${agentAddress}...`);
    console.log("Update data:", updateData);

    try {
        const updateResponse = await fetch(updateUrl, {
            method: 'PUT',
            headers: headers,
            body: body
        });

        await handleResponse(updateResponse, "Update Agent Details");

        console.log("-" * 20);
        console.log("Agent details update script finished successfully.");

    } catch (error) {
        console.error("!!! SCRIPT FAILED !!!");
        console.error(error);
        process.exit(1);
    }
}

// --- Run the update ---
updateDetails();
