// Node.js script to test secret updates by checking agent logs

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

// --- Configuration ---
// API Token from original scripts (full token) - Needed for direct API calls
const API_TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg";
const BASE_URL = "https://agentverse.ai/v1/hosting";
const SECRET_NAME = "EXAMPLE_SECRET";
const INITIAL_VALUE = "value_A_" + Date.now();
const UPDATED_VALUE = "value_B_" + Date.now();
const LOG_CHECK_DELAY_MS = 15000; // Wait 15s for logs to hopefully appear
const AGENT_INTERVAL_S = 10.0; // Agent logs secret every 10s

const HEADERS = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
};

// Agent code that reads and logs the secret
const CODE_ARRAY = [
    {
        id: 0,
        name: "agent.py",
        value: `
import os
from uagents import Agent, Context

# Retrieve secret from environment variable
# Secrets added via API/avctl are typically exposed as env vars
secret_value = os.environ.get("${SECRET_NAME}", "SECRET_NOT_FOUND")

agent = Agent(name="secret_logger_agent", seed="secret_logger_seed_${Date.now()}")

@agent.on_interval(period=${AGENT_INTERVAL_S})
async def log_secret(ctx: Context):
    # Log the value retrieved at agent startup
    ctx.logger.info(f"Current value for ${SECRET_NAME}: {secret_value}")

# Also log immediately on startup (using correct decorator)
@agent.on_event("startup")
async def startup_log(ctx: Context):
     ctx.logger.info(f"Startup value for ${SECRET_NAME}: {secret_value}")

`,
        language: "python"
    },
    {
        id: 1,
        name: ".env",
        value: `AGENT_SEED=secret_logger_seed_${Date.now()}`, // Unique seed
        language: "dotenv"
    }
];
// ---------------------

const execPromise = promisify(exec);

// Helper function to handle fetch responses (copied from test_deployment.js)
async function handleResponse(response, stepName, expectJson = true, allowNonOkStatusCodes = []) {
    console.log(`--- ${stepName} ---`);
    console.log(`Status Code: ${response.status}`);
    let responseData = null;
    let rawText = '';
    try {
        rawText = await response.text();
        if (rawText) {
            if (expectJson) {
                try {
                    responseData = JSON.parse(rawText);
                    console.log("Response JSON:", JSON.stringify(responseData, null, 2));
                } catch (parseError) {
                    console.error("Error parsing JSON response:", parseError);
                    console.log("Raw Response Text:", rawText);
                }
            } else {
                 console.log("Response Body:", rawText);
            }
        } else {
            console.log("Response Body: (empty)");
        }
    } catch (readError) {
        console.error("Error reading response body:", readError);
    }
    const isAllowedNonOk = allowNonOkStatusCodes.includes(response.status);
    if (!response.ok && !isAllowedNonOk) {
        console.error(`!!! ${stepName} FAILED (HTTP ${response.status}) !!!`);
        if(rawText) console.log("Raw Response Text on Failure:", rawText);
        throw new Error(`${stepName} failed with status ${response.status}`);
    }
    return { data: responseData, text: rawText, response: response };
}

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to add secret
async function addSecret(agentAddress, name, value) {
    console.log(`\n--- Adding Secret: ${name}=${value} ---`);
    const addSecretPayload = { address: agentAddress, name: name, secret: value };
    const addSecretResponse = await fetch(`${BASE_URL}/secrets`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(addSecretPayload)
    });
    await handleResponse(addSecretResponse, `Add Secret ${name}`, true);
    console.log(`Secret ${name} add request sent.`);
}

// Helper function to fetch logs using avctl
async function fetchLogs(agentAddress) {
    console.log(`\n--- Fetching logs for ${agentAddress} using avctl ---`);
    const command = `avctl hosting logs -a ${agentAddress}`;
    console.log(`Executing: ${command}`);
    try {
        // Increase timeout in case logs take time
        const { stdout, stderr } = await execPromise(command, { timeout: 20000 });
        if (stderr) {
            console.warn("avctl logs reported errors/warnings:", stderr);
        }
        console.log("--- avctl Logs Output ---");
        const logOutput = stdout.trim();
        console.log(logOutput || "(No log output)");
        console.log("------------------------");
        return logOutput;
    } catch (error) {
        console.error(`!!! Failed to fetch logs using avctl for ${agentAddress} !!!`);
        console.error("Error:", error.message);
        if (error.stderr) console.error("avctl stderr:", error.stderr);
        if (error.stdout) console.error("avctl stdout (on error):", error.stdout);
        // Don't throw here, allow the main function to decide how to handle log fetch failure
        return null; // Indicate failure
    }
}

// Helper function to check logs for expected value
function checkLogsForValue(logs, expectedValue) {
    if (logs === null) {
        console.error("❌ Log Verification FAILED: Could not fetch logs.");
        return false;
    }
    // Check for the specific log message format
    const expectedLogLine = `Current value for ${SECRET_NAME}: ${expectedValue}`;
    const startupLogLine = `Startup value for ${SECRET_NAME}: ${expectedValue}`;

    if (logs.includes(expectedLogLine) || logs.includes(startupLogLine)) {
        console.log(`✅ Log Verification PASSED: Found expected value '${expectedValue}' in logs.`);
        return true;
    } else {
        console.error(`❌ Log Verification FAILED: Did not find expected value '${expectedValue}' in logs.`);
        console.log(`(Looking for lines like: '${expectedLogLine}' or '${startupLogLine}')`);
        return false;
    }
}


// Main test function
async function runSecretVerificationTest() {
    console.log("--- Starting Agent Secret Verification Test ---");
    let agentAddress = null;
    const AGENT_NAME = "Test Secret Logger - " + Date.now();
    let testPassed = true; // Track overall success

    try {
        // === Step 1: Create Agent ===
        console.log(`\n--- Step 1: Create Agent: ${AGENT_NAME} ---`);
        const createResponse = await fetch(`${BASE_URL}/agents`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ name: AGENT_NAME }) });
        const { data: createData, text: createRawText } = await handleResponse(createResponse, "Create Agent", true);
        const match = createRawText.match(/"address":\s*"([^"]*)"/);
        if (match && match[1]) { agentAddress = match[1]; console.log(`Agent created: ${agentAddress}`); }
        if (!agentAddress) throw new Error("Agent address extraction failed.");

        // === Step 2: Update Code ===
        console.log(`\n--- Step 2: Update Code ---`);
        const updatePayloadDict = { code: JSON.stringify(CODE_ARRAY) };
        const updateResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/code`, { method: 'PUT', headers: HEADERS, body: JSON.stringify(updatePayloadDict) });
        await handleResponse(updateResponse, "Update Code", true);
        console.log("Waiting for compilation...");
        await delay(5000);

        // === Step 3: Add Initial Secret ===
        await addSecret(agentAddress, SECRET_NAME, INITIAL_VALUE);

        // === Step 4: Start Agent ===
        console.log(`\n--- Step 4: Start Agent ---`);
        const startResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/start`, { method: 'POST', headers: HEADERS });
        await handleResponse(startResponse, "Start Agent", true);
        console.log(`Agent start request sent. Waiting ${LOG_CHECK_DELAY_MS / 1000}s for agent to start and log...`);
        await delay(LOG_CHECK_DELAY_MS); // Wait for agent to potentially log the initial value

        // === Step 5: Verify Initial Log ===
        const initialLogs = await fetchLogs(agentAddress);
        if (!checkLogsForValue(initialLogs, INITIAL_VALUE)) {
            testPassed = false; // Mark test as failed but continue to cleanup
            console.warn("Continuing to secret update step despite initial log verification failure...");
        }

        // === Step 6: Update Secret ===
        await addSecret(agentAddress, SECRET_NAME, UPDATED_VALUE);
        console.log(`Secret updated. Waiting ${LOG_CHECK_DELAY_MS / 1000}s for agent to potentially restart and log new value...`);
        // Note: Agent might need a restart to pick up env var changes, but let's see if it updates dynamically first.
        // If this fails, we might need to add stop/start steps around the secret update.
        await delay(LOG_CHECK_DELAY_MS);

        // === Step 7: Verify Updated Log ===
        const updatedLogs = await fetchLogs(agentAddress);
         if (!checkLogsForValue(updatedLogs, UPDATED_VALUE)) {
             // Check if maybe the old value is still there (agent didn't pick up change)
             if (checkLogsForValue(updatedLogs, INITIAL_VALUE)) {
                 console.warn("WARNING: Agent is still logging the OLD secret value. Secret update might require agent restart.");
             }
             testPassed = false; // Mark test as failed
         }

        // === Final Result ===
        if (testPassed) {
             console.log("\n✅✅✅ Secret Update Verification Test Passed (via logs) ✅✅✅");
        } else {
             console.error("\n❌❌❌ Secret Update Verification Test FAILED (via logs) ❌❌❌");
        }

    } catch (error) {
        console.error("\n❌❌❌ TEST SCRIPT FAILED (Unhandled Error) ❌❌❌");
        console.error("Error:", error.message);
        testPassed = false; // Ensure cleanup knows the test failed
    } finally {
        // === Step 8: Cleanup - Delete Agent ===
        if (agentAddress) {
            console.log(`\n--- Step 8: Cleanup - Delete Agent ${agentAddress} ---`);
            try {
                const deleteResponse = await fetch(`${BASE_URL}/agents/${agentAddress}`, { method: 'DELETE', headers: HEADERS });
                await handleResponse(deleteResponse, "Delete Agent Request", false);
                console.log("Agent delete request successful.");
                // Optional: Add validation for deletion (fetch details, expect 404)
            } catch (deleteError) {
                console.warn(`!!! Agent Deletion FAILED: ${deleteError.message}. Manual cleanup might be required.`);
                // Don't override exit code if test already failed
                if (testPassed) process.exitCode = 1;
            }
        } else {
            console.log("\n--- Step 8: Cleanup Skipped (No agent address) ---");
        }

        console.log("\n--- Agent Secret Verification Test Finished ---");
        if (!testPassed && !process.exitCode) {
             process.exitCode = 1; // Ensure failure exit code if test failed
        }
    }
}

runSecretVerificationTest();
