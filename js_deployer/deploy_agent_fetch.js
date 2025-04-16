// Node.js script to deploy an agent using fetch

const AGENT_NAME = "My Fetch Deployed Agent";
// API Token should ideally be an environment variable for security
const API_TOKEN = process.env.AGENTVERSE_API_TOKEN || "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"; // Fallback token
const BASE_URL = "https://agentverse.ai/v1/hosting";

const HEADERS = {
    "Authorization": `Bearer ${API_TOKEN}`, // Correct format: Bearer <token>
    "Content-Type": "application/json"
};

// Example code payload (as JS array of objects) - PYTHON AGENT CODE
const CODE_ARRAY = [
    {
        id: 0,
        name: "agent.py", // Python file name
        value: `
# Congratulations on creating your first agent!
#
# This agent simply writes a greeting in the logs on a scheduled time interval.
#
# In this example we will use:
# - 'agent': this is your instance of the 'Agent' class that we will give an 'on_interval' task
# - 'ctx': this is the agent's 'Context', which gives you access to all the agent's important functions

# A decorator (marked by the '@' symbol) just wraps the function defined under it in another function.
# This decorator tells your agent to run the function on a time interval with the specified 'period' in seconds.
# These functions must be 'async' because agents need to be able to perform many tasks concurrently.
@agent.on_interval(period=3.0)
async def say_hello(ctx: Context):
    # ctx.logger is a standard Python logger that can log text with various levels of urgency
    # (exception, warning, info, debug). Here we will just use the 'info' level to write a greeting
    ctx.logger.info(f"Hello, I'm an agent and my address is {agent.address}.")
`,
        language: "python" // Correct language
    },
    {
        id: 1,
        name: ".env",
        value: "AGENT_SEED=YOUR_AGENT_SEED_FETCH_PY", // Updated seed name
        language: "python" // Keep as python or use 'dotenv' if supported
    }
];

// Helper function to handle fetch responses
async function handleResponse(response, stepName) {
    console.log(`--- ${stepName} ---`);
    console.log(`Status Code: ${response.status}`);
    let responseData = null;
    let rawText = ''; // Store raw text
    try {
        // Read text ONCE
        rawText = await response.text(); 
        
        if (rawText) {
            try {
                 // Attempt to parse JSON from the read text
                responseData = JSON.parse(rawText); 
                console.log("Response JSON:", JSON.stringify(responseData, null, 2));
            } catch (parseError) {
                 // Log parsing errors, especially if API returns malformed JSON
                console.error("Error parsing JSON response:", parseError);
                console.log("Raw Response Text:", rawText); // Log raw text on parse error
            }
        } else {
            console.log("Response Body: (empty)");
        }
    } catch (readError) {
        // Error reading the response body itself
        console.error("Error reading response body:", readError);
    }

    if (!response.ok) {
        console.error(`!!! ${stepName} FAILED (HTTP ${response.status}) !!!`);
        // Log raw text even on failure if available
        if(rawText) console.log("Raw Response Text on Failure:", rawText); 
        process.exit(1); // Exit script on failure
    }
    // Return both parsed data (if successful) and the raw text
    return { data: responseData, text: rawText }; 
}

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main deployment function
async function deployAgent() {
     // Check if token is missing or still the placeholder
     if (!API_TOKEN || API_TOKEN.includes("<")) { // Check includes placeholder too
        console.error("Error: API_TOKEN is not set or is a placeholder.");
        console.error("Please set the AGENTVERSE_API_TOKEN environment variable or replace the placeholder in the script.");
        process.exit(1);
    }

    // Headers are defined globally using the token (either from env var or fallback)

    let agentAddress = null;

    try {
        // === Step 1: Create Agent ===
        console.log(`Creating agent '${AGENT_NAME}'...`);
        const createResponse = await fetch(`${BASE_URL}/agents`, {
            method: 'POST', // Methods are strings
            headers: HEADERS,
            body: JSON.stringify({ name: AGENT_NAME }) // Body needs to be stringified
        });
        // Destructure the returned object from handleResponse
        const { data: createData, text: createRawText } = await handleResponse(createResponse, "Create Agent");

        // Attempt to extract address even from potentially malformed JSON using the returned raw text
        if (createResponse.ok && createRawText) {
             // Hacky extraction due to potential missing commas in API response
             const match = createRawText.match(/"address":"([^"]*)"/);
             if (match && match[1]) {
                 agentAddress = match[1];
                 console.log(`Agent created successfully. Address: ${agentAddress}`);
             }
        }
       
        if (!agentAddress) {
            console.error("!!! Could not extract agent address from creation response. Exiting. !!!");
            process.exit(1);
        }
        console.log("-" * 20);

        // === Step 2: Stop Agent (Skip for new agent) ===
        // console.log(`Ensuring agent ${agentAddress} is stopped... (Skipped for new agent)`);
        // console.log("-" * 20);

        // === Step 3: Update Code ===
        console.log(`Updating code for agent ${agentAddress}...`);
        // Construct the payload with the 'code' value as a JSON string
        const updatePayloadDict = {
            code: JSON.stringify(CODE_ARRAY) // Stringify the array
        };
        const updateResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/code`, {
            method: 'PUT',
            headers: HEADERS,
            body: JSON.stringify(updatePayloadDict) // Stringify the outer object
        });
        await handleResponse(updateResponse, "Update Code");
        console.log("Code update request sent. Waiting a few seconds for compilation...");
        console.log("-" * 20);
        await delay(5000); // 5 second delay

        // === Step 4: Restart Agent ===
        console.log(`Starting agent ${agentAddress}...`);
        const startResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/start`, {
            method: 'POST',
            headers: HEADERS
            // No body needed for start
        });
        await handleResponse(startResponse, "Start Agent");
        console.log("-" * 20);

        console.log("Agent deployment script finished successfully.");

    } catch (error) {
        console.error("!!! SCRIPT FAILED !!!");
        console.error(error);
        process.exit(1);
    }
}

// Run the deployment
deployAgent();
