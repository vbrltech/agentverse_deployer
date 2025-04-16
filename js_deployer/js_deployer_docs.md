# Agentverse Agent Deployment Script (Node.js / Fetch)

This document describes the `deploy_agent_fetch.js` script, which automates the deployment of an agent to Agentverse using the Hosting API via Node.js and the built-in `fetch` API. It also provides examples for other common Hosting API interactions.

## Purpose

The main script (`deploy_agent_fetch.js`) performs the necessary steps to create a new agent, upload its code, and start it on the Agentverse platform. It incorporates workarounds for specific API behaviors discovered during testing. This document also includes examples for listing, inspecting, stopping, deleting agents, and checking logs/usage.

## Prerequisites

*   **Node.js:** The script and examples are designed to be run with Node.js (version 18 or higher recommended, as it includes `fetch` natively).
*   **Agentverse API Token:** You need a valid API token from your Agentverse profile. The utility scripts (`deploy_agent_fetch.js`, `add_secret_fetch.js`) prioritize the `AGENTVERSE_API_TOKEN` environment variable but contain a hardcoded fallback token. The test scripts (`test_deployment.js`, `test_secret_verification.js`) use a hardcoded token directly.
*   **avctl (Optional but Recommended):** The Agentverse Command Line tool (`avctl`) is used by some verification scripts (`verify_secret_avctl.js`, `test_secret_verification.js`) to fetch logs or secret information. Ensure it's installed, configured, and authenticated (`avctl auth login`).

## Configuration (for `deploy_agent_fetch.js`)

The script contains several constants at the top that you might need to configure:

*   `AGENT_NAME`: The desired name for the agent being deployed. This corresponds to the `name` field in the `NewAgent` object sent during creation.
*   `API_TOKEN`: Your Agentverse API token. This script reads the `AGENTVERSE_API_TOKEN` environment variable first, but includes a hardcoded fallback token if the environment variable is not set. **It's strongly recommended to use the environment variable for security.**
*   `BASE_URL`: The base URL for the Agentverse Hosting API. Usually `https://agentverse.ai/v1/hosting`.
*   `CODE_ARRAY`: A JavaScript array containing objects that define the agent's code files. Each object should have:
    *   `id`: A unique numerical ID (usually starting from 0).
    *   `name`: The filename (e.g., `agent.py`, `agent.js`, `.env`).
    *   `value`: A string containing the actual code for the file. Use template literals (backticks ``) for multi-line code. **Important:** If your code includes `${...}` syntax for its own templating, escape the dollar sign like `\${...}` to prevent Node.js from interpreting it prematurely.
    *   `language`: The language identifier (e.g., `python`, `javascript`, `dotenv`).
    *   *Note:* This array structure is based on observed behavior and examples. The API documentation for `UpdateAgentCode Object` shows a simpler structure (`{"code": "single string"}`), but the API endpoint actually expects a *stringified version* of the `CODE_ARRAY` structure shown here. See "API Quirks Handled".

## How the Deployment Script (`deploy_agent_fetch.js`) Works

The script executes the following steps sequentially, interacting with specific Hosting API endpoints:

1.  **Create Agent:**
    *   **Endpoint:** `POST /agents`
    *   **Request Body:** Sends a `NewAgent Object` containing the `AGENT_NAME`.
        ```json
        { "name": "Your Agent Name Here" }
        ```
    *   **Response:** Expects an `Agent Object` containing the details of the newly created agent, including its unique `address`.
    *   *Note:* Includes a workaround to parse the agent address even if the API returns slightly malformed JSON (missing commas).

2.  **Update Code:**
    *   **Endpoint:** `PUT /agents/{agentAddress}/code`
    *   **Request Body:** Sends a JSON object where the `code` field contains a *stringified* version of the `CODE_ARRAY`.
        ```json
        { "code": "[{\"id\":0,...},{\"id\":1,...}]" }
        ```
    *   **Response:** Expects an `AgentCodeDigest Object` containing the `digest` of the uploaded code.
        ```json
        { "digest": "..." }
        ```
    *   *Note:* Waits for 5 seconds after this step to allow time for server-side compilation. Requires the agent to be stopped first (new agents start stopped).

3.  **Start Agent:**
    *   **Endpoint:** `POST /agents/{agentAddress}/start`
    *   **Request Body:** None.
    *   **Response:** Expects an `Agent Object` reflecting the agent's running state (`"running": true`) and the updated `code_digest`.

The script includes basic error handling: it checks the HTTP status code of each response and exits if a step fails. It also attempts to parse JSON responses and logs errors if parsing fails.

## How to Run the Deployment Script (`deploy_agent_fetch.js`)

1.  Ensure you have Node.js installed.
2.  Set the `AGENTVERSE_API_TOKEN` environment variable (recommended) or ensure the fallback token in the script is correct.
3.  Optionally, configure `AGENT_NAME` and `CODE_ARRAY` in the script if needed.
4.  Open your terminal in the directory containing the script (`js_deployer`).
5.  Run the script using the command:
    ```bash
    node deploy_agent_fetch.js
    ```
6.  The script will print status updates and responses for each step. If successful, it will end with "Agent deployment script finished successfully."

## Other Useful API Calls (Node.js Fetch Examples)

These examples show how to use `fetch` in Node.js for other common tasks. You would typically integrate these into your own scripts or applications. Remember to replace placeholders like `<your_token_here>` and specific agent addresses.

```javascript
// Common setup for examples
const API_TOKEN = "eyJhbGciOiJSUzI1NiJ9..."; // Use your actual token
const BASE_URL = "https://agentverse.ai/v1/hosting";
const HEADERS = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
};

// Helper function (similar to the one in deploy_agent_fetch.js)
async function handleResponse(response, stepName) {
    // ... (implementation as in deploy_agent_fetch.js) ...
    // Remember it returns { data, text }
}

// --- Example API Calls ---

// 1. List All Agents
async function listAgents() {
    const response = await fetch(`${BASE_URL}/agents`, {
        method: 'GET', // Method is uppercase string
        headers: HEADERS
    });
    const { data } = await handleResponse(response, "List Agents");
    // Expected 'data': Array of Agent Objects
    console.log("Agents:", data);
}

// 2. Get Specific Agent Details
async function getAgent(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}`, {
        method: 'GET',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Get Agent ${agentAddress}`);
    // Expected 'data': Agent Object (often wrapped in an array by this API)
    console.log("Agent Details:", data);
}

// 3. Stop an Agent
async function stopAgent(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}/stop`, {
        method: 'POST',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Stop Agent ${agentAddress}`);
    // Expected 'data': Agent Object showing "running": false
    console.log("Stop Response:", data);
}

// 4. Delete an Agent
async function deleteAgent(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}`, {
        method: 'DELETE',
        headers: HEADERS
    });
    // Delete often returns 200 OK with empty body or 204 No Content
    await handleResponse(response, `Delete Agent ${agentAddress}`); 
    console.log(`Agent ${agentAddress} delete request sent.`);
}

// 5. Get Agent Code
async function getAgentCode(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}/code`, {
        method: 'GET',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Get Code ${agentAddress}`);
    // Expected 'data': AgentCode Object (often wrapped in an array)
    // Note: The 'code' field might contain the stringified JSON array we sent
    console.log("Agent Code:", data);
}

// 6. Get Latest Logs
async function getLatestLogs(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}/logs/latest`, {
        method: 'GET',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Get Logs ${agentAddress}`);
    // Expected 'data': Array of AgentLog Objects
    console.log("Latest Logs:", data);
}

// 7. Delete Logs
async function deleteLogs(agentAddress) {
    const response = await fetch(`${BASE_URL}/agents/${agentAddress}/logs`, {
        method: 'DELETE',
        headers: HEADERS
    });
     // Delete often returns 200 OK with empty body or 204 No Content
    await handleResponse(response, `Delete Logs ${agentAddress}`);
    console.log(`Delete logs request sent for ${agentAddress}.`);
}

// --- Usage API Examples ---
// Note: GET requests typically do not have a request body. 
// If address is needed, it's usually part of the URL path or query parameters.
// The examples below assume address is NOT sent in the body for GET requests.

// 8. Get Current Usage (Overall)
async function getCurrentUsage() {
    const response = await fetch(`${BASE_URL}/usage/current`, {
        method: 'GET',
        headers: HEADERS
        // No body for GET
    });
    const { data } = await handleResponse(response, "Get Current Usage");
    // Expected 'data': Array containing usage object
    console.log("Current Usage:", data);
}

// 9. Get Usage by Month (Overall)
async function getUsageByMonth(year, month) {
    const response = await fetch(`${BASE_URL}/usage/${year}/${month}`, {
        method: 'GET',
        headers: HEADERS
        // No body for GET
    });
    const { data } = await handleResponse(response, `Get Usage ${year}-${month}`);
     // Expected 'data': Array containing usage object
    console.log(`Usage ${year}-${month}:`, data);
}

// 10. Get Current Usage for Specific Agent
async function getCurrentAgentUsage(agentAddress) {
    const response = await fetch(`${BASE_URL}/usage/agents/${agentAddress}/current`, {
        method: 'GET',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Get Current Usage ${agentAddress}`);
    // Expected 'data': Array containing agent usage object
    console.log(`Current Usage ${agentAddress}:`, data);
}

// 11. Get Usage by Month for Specific Agent
async function getAgentUsageByMonth(agentAddress, year, month) {
    const response = await fetch(`${BASE_URL}/usage/agents/${agentAddress}/${year}/${month}`, {
        method: 'GET',
        headers: HEADERS
    });
    const { data } = await handleResponse(response, `Get Usage ${agentAddress} ${year}-${month}`);
    // Expected 'data': Array containing agent usage object
    console.log(`Usage ${agentAddress} ${year}-${month}:`, data);
}

// Example calls (uncomment and replace placeholders to run)
// listAgents();
// getAgent("agent1q...");
// stopAgent("agent1q...");
// deleteAgent("agent1q...");
// getAgentCode("agent1q...");
// getLatestLogs("agent1q...");
// deleteLogs("agent1q...");
// getCurrentUsage();
// getUsageByMonth("2023", "8");
// getCurrentAgentUsage("agent1q...");
// getAgentUsageByMonth("agent1q...", "2023", "3");


// 12. Add a Secret to an Agent
async function addSecret(agentAddress, secretName, secretValue) {
    const payload = {
        address: agentAddress,
        name: secretName,
        secret: secretValue
    };
    const response = await fetch(`${BASE_URL}/secrets`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(payload)
    });
    // Add secret usually returns 200 OK with empty body
    await handleResponse(response, `Add Secret ${secretName} to ${agentAddress}`);
    console.log(`Secret ${secretName} add request sent for ${agentAddress}.`);
}

// Example call for adding a secret:
// addSecret("agent1q...", "MY_API_KEY", "some_secret_value_12345");

```

## Using the `add_secret_fetch.js` Script

Secrets are used to store sensitive information (like API keys) securely within an agent, preventing them from being exposed directly in the agent's code or to end-users. A separate script, `add_secret_fetch.js`, is provided specifically for adding secrets to an agent via the Hosting API. **Editing** a secret is done by running this script again with the same agent address and secret name, but providing the new desired value; this overwrites the existing secret.

### How it Works

1.  Reads the Agent Address, Secret Name, and Secret Value from command-line arguments.
2.  Reads the `API_TOKEN` from the `AGENTVERSE_API_TOKEN` environment variable first, or uses the hardcoded fallback token if the environment variable is not set.
3.  Sends a `POST` request to the `/secrets` endpoint with the provided details in the JSON body:
    ```json
    {
        "address": "agent_address_from_arg",
        "name": "secret_name_from_arg",
        "secret": "secret_value_from_arg"
    }
    ```
4.  Prints the status code and response body. Exits if the request fails.

### How to Run `add_secret_fetch.js`

1.  Ensure you have Node.js installed.
2.  Set the `AGENTVERSE_API_TOKEN` environment variable (recommended) or ensure the fallback token in the script is correct.
    ```bash
    # Example for bash/zsh
    export AGENTVERSE_API_TOKEN="your_actual_api_token_here"
    ```
3.  Open your terminal in the directory containing the script (`js_deployer`).
5.  Run the script using the command, providing the required arguments:
    ```bash
    node add_secret_fetch.js <agent_address> <secret_name> <secret_value>
    ```
    *   Replace `<agent_address>` with the target agent's address.
    *   Replace `<secret_name>` with the name you want to give the secret (e.g., `OPENAI_KEY`). This name is typically used within the agent code to retrieve the secret value.
    *   Replace `<secret_value>` with the actual secret string. Be mindful of shell special characters if entering the value directly; using quotes (`"my secret value"`) is recommended.
6.  The script will confirm if the request was sent successfully (usually a 200 OK status).

*(Note: Secrets can also be managed using the `avctl` command-line tool via `avctl hosting add secrets`, `avctl hosting delete secrets`, and `avctl hosting get secrets`. The `get secrets` command currently only lists secret names, not values.)*

## Using the `test_deployment.js` Script (End-to-End Test)

To provide a comprehensive test of the core deployment and secret addition workflow, the `test_deployment.js` script was created. It combines the functionalities of `deploy_agent_fetch.js` and `add_secret_fetch.js` into a single, automated test sequence with validation checks.

### Purpose

This script performs an end-to-end test:
1. Creates a new agent with a unique name.
2. Updates the agent's code.
3. Starts the agent.
4. Adds a test secret to the agent.
5. **Validates** the outcome of each step by fetching agent details and checking relevant properties (name, code digest, running status).
6. Cleans up by deleting the agent.
7. **Validates** the deletion by confirming the agent is no longer accessible (expects a 404).

### How it Works

1.  Uses a **hardcoded API token** (taken from the original `deploy_agent_fetch.js` and `add_secret_fetch.js` scripts). It does **not** require the `AGENTVERSE_API_TOKEN` environment variable.
2.  Generates a unique agent name and secret value for each run using `Date.now()`.
3.  Follows the create -> update -> start -> add secret sequence.
4.  Includes helper functions `handleResponse` (modified to allow specific non-2xx status codes like 404 for validation) and `getAgentDetails` to fetch agent status.
5.  After creation, it fetches details and verifies the agent `name`.
6.  After code update, it fetches details and verifies the `code_digest`.
7.  After starting, it fetches details and verifies the `running` status is `true`.
8.  After the delete request, it attempts to fetch details again and verifies the status code is `404` (Not Found).
9.  Uses `try...catch...finally` to ensure the cleanup (delete) step runs even if an earlier step fails.
10. Sets `process.exitCode = 1` if any validation or the delete step fails, ensuring the script signals failure appropriately.

### How to Run `test_deployment.js`

1.  Ensure you have Node.js installed.
2.  No environment variable setup is needed as the API token is hardcoded in the script.
3.  Open your terminal in the directory containing the script (`js_deployer`).
4.  Run the script using the command:
    ```bash
    node test_deployment.js
    ```
5.  The script will print detailed status updates for each step and validation check. If successful, it will end with "✅✅✅ All Steps and Validations Passed Successfully ✅✅✅" followed by the cleanup validation messages.

## Using `verify_secret_avctl.js` (Verify Secret Existence via `avctl`)

This script attempts to verify that a secret exists for a specific agent by using the `avctl` command-line tool.

### Purpose

*   Executes `avctl hosting get secrets -a <agent_address>`.
*   Parses the output to check if the specified secret name is listed.
*   **Limitation:** Due to the current behavior of `avctl hosting get secrets` (which only lists secret names, not values), this script **cannot verify the actual value** of the secret. It only confirms the secret's existence by name.

### How it Works

1.  Uses hardcoded values for `AGENT_ADDRESS`, `SECRET_NAME_TO_VERIFY`, and `EXPECTED_SECRET_VALUE` (though the expected value isn't actually verifiable from the output).
2.  Executes the `avctl hosting get secrets -a ...` command using Node.js `child_process`.
3.  Parses the `stdout` of the `avctl` command, looking for the `SECRET_NAME_TO_VERIFY`.
4.  Reports success if the name is found, failure otherwise.

### How to Run `verify_secret_avctl.js`

1.  Ensure Node.js is installed.
2.  Ensure `avctl` is installed, configured, and **authenticated** (run `avctl auth login` interactively first).
3.  Modify the constants (`AGENT_ADDRESS`, `SECRET_NAME_TO_VERIFY`) in the script if needed.
4.  Open your terminal in the directory containing the script (`js_deployer`).
5.  Run the script:
    ```bash
    node verify_secret_avctl.js
    ```
6.  The script will report if the secret name was found in the `avctl` output.

## Using `test_secret_verification.js` (Verify Secret Update via Logs)

This script provides a more robust way to verify secret updates by deploying an agent specifically designed to log the secret's value.

### Purpose

This script performs an end-to-end test to confirm secret updates are reflected in the agent's runtime environment:
1. Creates a new agent with code that reads a specific secret (`EXAMPLE_SECRET` by default) from its environment and logs the value on startup and at intervals.
2. Adds the secret with an initial value.
3. Starts the agent.
4. Fetches agent logs using `avctl hosting logs` and verifies the initial value is present.
5. Updates the secret with a new value using the API.
6. Fetches agent logs again and verifies the new value is present.
7. Cleans up by deleting the agent.

### How it Works

1.  Uses a hardcoded API token for direct API calls (create, update code, add secret, start, delete).
2.  Uses `avctl` (via `child_process`) to fetch agent logs. Requires `avctl` to be authenticated.
3.  Includes agent code (`agent.py`) that reads the secret from `os.environ.get()` and logs it.
4.  Waits for specified delays (`LOG_CHECK_DELAY_MS`) after starting the agent and updating the secret to allow time for logs to be generated and potentially for the agent to restart/pick up changes.
5.  Parses the log output fetched via `avctl` to check for the expected secret value.
6.  Reports overall success or failure based on whether the expected values were found in the logs at the correct stages.
7.  Includes cleanup steps in a `finally` block.

### How to Run `test_secret_verification.js`

1.  Ensure Node.js is installed.
2.  Ensure `avctl` is installed, configured, and **authenticated** (run `avctl auth login` interactively first).
3.  Modify constants (`SECRET_NAME`, delays, etc.) in the script if needed.
4.  Open your terminal in the directory containing the script (`js_deployer`).
5.  Run the script:
    ```bash
    node test_secret_verification.js
    ```
6.  The script will print detailed status updates, log fetching results, and verification outcomes.

## API Objects Reference (Relevant Subset)

Based on the provided documentation:

### Agent Object (Received on Create/Start/Get)

*   `name` (string): The agent's given name.
*   `address` (string): The unique address/public key of the agent. **(Extracted by the script)**
*   `running` (boolean): Current running state.
*   `compiled` (boolean | null): Code compilation status.
*   `revision` (integer): Incremented on updates.
*   `code_digest` (string | null): Digest of the current code. **(Updated after Step 2)**
*   `wallet_address` (string | null): Associated wallet address.
*   *(Other fields like `domain`, `code_update_timestamp`, `creation_timestamp`, etc. may also be present)*

### NewAgent Object (Sent on Create)

*   `name` (string): Name for the new agent.

### AgentCode Object (Received on Get Code)

*   `digest` (string): Digest of the code.
*   `code` (string): The code itself (potentially the stringified JSON array).
*   `timestamp` (string, date-time): Timestamp of the code update.

### AgentCodeDigest Object (Received on Code Update)

*   `digest` (string): Digest of the successfully uploaded code.

### AgentLog Object (Received on Get Logs)

*   `log_timestamp` (string, date-time): Timestamp of the log entry.
*   `log_entry` (string): Log entry text.
*   *(Other fields like `log_type`, `log_level` may also be present)*

### UpdateAgentCode Object (Sent on Code Update - *API Behavior Differs*)

*   `code` (string): **API Documentation Sample shows a single code string.** However, the **actual API endpoint requires a *stringified JSON array* of file objects** (like `CODE_ARRAY` in the script) to be sent within this field.

### Secret Object (Sent on Add Secret)

*   `address` (string): Address of the agent to add the secret to.
*   `name` (string): Name for the secret.
*   `secret` (string): The actual secret value.

## API Quirks Handled by Script/Examples

*   **Code Payload Stringification:** The `PUT /agents/{agentAddress}/code` endpoint requires the array of file objects (`CODE_ARRAY`) to be sent as a JSON *string* within the main payload's `code` field, differing from the `UpdateAgentCode Object` documentation sample. The script handles this using `JSON.stringify(CODE_ARRAY)`.
*   **Malformed JSON Response:** The `POST /agents` creation endpoint sometimes returns JSON without commas between key-value pairs. The script uses a regular expression fallback (`match(/"address":"([^"]*)"/)`) to extract the agent address if standard JSON parsing fails on the creation response.
*   **Agent Must Be Stopped for Code Update:** While not explicitly handled in the main deployment script (as it assumes deploying a *new* agent which starts stopped), remember that if you adapt this script or examples to update an *existing* agent, you must add a step to call the `POST /agents/{agentAddress}/stop` endpoint before calling the `PUT /agents/{agentAddress}/code` endpoint.
*   **GET Requests with Body:** The provided snippets for usage endpoints (`GET /usage/...`) included a `body`. Standard HTTP GET requests do not have a body; data is typically passed via path parameters (like `/usage/{year}/{month}`) or query parameters. The examples above omit the body for GET requests.
