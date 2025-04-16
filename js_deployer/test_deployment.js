// Node.js script to test agent deployment and secret addition

// --- Configuration ---
// API Token from original scripts (full token)
const API_TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg";
const BASE_URL = "https://agentverse.ai/v1/hosting";
const TEST_SECRET_NAME = "TEST_SECRET_AUTO";
const TEST_SECRET_VALUE = "test_value_" + Date.now(); // Unique value per run

const HEADERS = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
};

// Example code payload (copied from deploy_agent_fetch.js) - PYTHON AGENT CODE
const CODE_ARRAY = [
    {
        id: 0,
        name: "agent.py", // Python file name
        value: `
# Test agent deployed by test_deployment.js
from uagents import Agent, Context

agent = Agent(name="test_agent", seed="test_agent_seed_auto")

@agent.on_interval(period=60.0) # Run infrequently
async def log_message(ctx: Context):
    ctx.logger.info(f"Test agent {agent.address} is running.")
`,
        language: "python"
    },
    {
        id: 1,
        name: ".env",
        value: `AGENT_SEED=test_agent_seed_auto_${Date.now()}`, // Unique seed
        language: "dotenv" // More appropriate language type for .env
    }
];
// ---------------------

// Helper function to handle fetch responses (adapted from deploy_agent_fetch.js)
// Added allowNonOkStatusCodes parameter
async function handleResponse(response, stepName, expectJson = true, allowNonOkStatusCodes = []) {
    console.log(`--- ${stepName} ---`);
    console.log(`Status Code: ${response.status}`);
    let responseData = null;
    let rawText = ''; // Store raw text
    try {
        // Read text ONCE
        rawText = await response.text();

        if (rawText) {
            if (expectJson) {
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
                 console.log("Response Body:", rawText); // Log raw text for non-JSON expected responses
            }
        } else {
            console.log("Response Body: (empty)");
        }
    } catch (readError) {
        // Error reading the response body itself
        console.error("Error reading response body:", readError);
    }

    // Check if the status code is explicitly allowed, even if not 'ok' (2xx)
    const isAllowedNonOk = allowNonOkStatusCodes.includes(response.status);

    if (!response.ok && !isAllowedNonOk) { // Throw error only if not ok AND not explicitly allowed
        console.error(`!!! ${stepName} FAILED (HTTP ${response.status}) !!!`);
        // Log raw text even on failure if available
        if(rawText) console.log("Raw Response Text on Failure:", rawText);
        // Don't exit here, let the main function handle errors/cleanup
        // process.exit(1);
        throw new Error(`${stepName} failed with status ${response.status}`);
    }
    // Return parsed data (if successful JSON), raw text, and the original response object
    return { data: responseData, text: rawText, response: response };
}


// Helper function to fetch agent details
// Pass allowNonOkStatusCodes to handleResponse
async function getAgentDetails(agentAddress, allowNonOkStatusCodes = []) {
    console.log(`--- Fetching details for agent ${agentAddress} ---`);
    let response;
    try {
        response = await fetch(`${BASE_URL}/agents/${agentAddress}`, {
            method: 'GET',
            headers: HEADERS // Reuse headers
        });
    } catch (fetchError) {
        console.error(`!!! Network error fetching agent details for ${agentAddress}: ${fetchError.message}`);
        // Return a status that indicates a network failure, e.g., 599 or similar
        return { details: null, rawText: null, status: 599 }; // Indicate network error
    }

    // Use handleResponse for consistency, expect JSON
    // Pass the allowed non-ok codes
    const { data, text, response: originalResponse } = await handleResponse(response, "Get Agent Details", true, allowNonOkStatusCodes);

    // Return the data and the original response object to check status code outside
    return { details: data, rawText: text, status: originalResponse.status };
}

// Helper function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function runTest() {
    console.log("--- Starting AgentVerse Deployment Test ---");

    // Removed environment variable check as token is hardcoded

    let agentAddress = null;
    let expectedCodeDigest = null; // Variable to store the code digest
    const AGENT_NAME = "Test Deploy Agent - " + Date.now(); // Unique name for each test run

    try {
        // === Step 1: Create Agent ===
        console.log(`\n--- Step 1: Create Agent: ${AGENT_NAME} ---`);
        const createResponse = await fetch(`${BASE_URL}/agents`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ name: AGENT_NAME })
        });
        const { data: createData, text: createRawText } = await handleResponse(createResponse, "Create Agent", true);

        // Attempt to extract address even from potentially malformed JSON using the returned raw text
        if (createResponse.ok && createRawText) {
             // Regex to find the address reliably
             const match = createRawText.match(/"address":\s*"([^"]*)"/);
             if (match && match[1]) {
                 agentAddress = match[1];
                 console.log(`Agent created successfully. Address: ${agentAddress}`);
             }
        }
        if (!agentAddress) {
            // Error was already thrown by handleResponse if !createResponse.ok
            // This handles cases where response is ok but address isn't found
            console.error("!!! Could not extract agent address from creation response text. !!!");
            console.log("Raw Response:", createRawText);
            throw new Error("Agent address extraction failed.");
        }

        // === Step 1a: Validate Agent Creation ===
        console.log(`\n--- Step 1a: Validate Agent Creation ---`);
        const { details: createValidationDetails, status: createValidationStatus } = await getAgentDetails(agentAddress);
        if (createValidationStatus !== 200 || !createValidationDetails || createValidationDetails.name !== AGENT_NAME) {
            console.error(`!!! Validation Failed: Agent name mismatch or fetch error. Expected: ${AGENT_NAME}, Got: ${createValidationDetails?.name}, Status: ${createValidationStatus}`);
            throw new Error("Agent creation validation failed.");
        }
        console.log(`Validation Passed: Agent name '${createValidationDetails.name}' matches.`);
        console.log("-" * 20);


        // === Step 2: Update Code ===
        console.log(`\n--- Step 2: Update Code for Agent ${agentAddress} ---`);
        const updatePayloadDict = {
            code: JSON.stringify(CODE_ARRAY) // Stringify the array
        };
        const updateResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/code`, {
            method: 'PUT',
            headers: HEADERS,
            body: JSON.stringify(updatePayloadDict) // Stringify the outer object
        });
        // Expect JSON response containing the digest
        const { data: updateData, text: updateText } = await handleResponse(updateResponse, "Update Code", true);

        // Extract code digest from response
        if (updateData && updateData.digest) {
            expectedCodeDigest = updateData.digest;
            console.log(`Code update successful. Expected Digest: ${expectedCodeDigest}`);
        } else {
            console.error("!!! Could not extract code digest from update response. !!!");
            console.log("Raw Response:", updateText);
            // Don't necessarily fail here, but validation step will fail
        }
        console.log("Waiting for compilation...");
        await delay(5000); // 5 second delay

        // === Step 2a: Validate Code Update ===
        console.log(`\n--- Step 2a: Validate Code Update ---`);
        if (!expectedCodeDigest) {
             console.warn("!!! Validation Skipped: Could not determine expected code digest from Step 2. !!!");
        } else {
            const { details: updateValidationDetails, status: updateValidationStatus } = await getAgentDetails(agentAddress);
            if (updateValidationStatus !== 200 || !updateValidationDetails || updateValidationDetails.code_digest !== expectedCodeDigest) {
                console.error(`!!! Validation Failed: Code digest mismatch or fetch error. Expected: ${expectedCodeDigest}, Got: ${updateValidationDetails?.code_digest}, Status: ${updateValidationStatus}`);
                throw new Error("Code update validation failed.");
            }
            console.log(`Validation Passed: Code digest '${updateValidationDetails.code_digest}' matches expected.`);
        }
        console.log("-" * 20);


        // === Step 3: Start Agent ===
        console.log(`\n--- Step 3: Start Agent ${agentAddress} ---`);
        const startResponse = await fetch(`${BASE_URL}/agents/${agentAddress}/start`, {
            method: 'POST',
            headers: HEADERS
            // No body needed for start
        });
        await handleResponse(startResponse, "Start Agent", true); // API might return agent details on start
        console.log("Agent start request sent.");

         // === Step 3a: Validate Agent Start ===
        console.log(`\n--- Step 3a: Validate Agent Start ---`);
        await delay(2000); // Short delay to allow state update
        const { details: startValidationDetails, status: startValidationStatus } = await getAgentDetails(agentAddress);
        if (startValidationStatus !== 200 || !startValidationDetails || startValidationDetails.running !== true) {
            console.error(`!!! Validation Failed: Agent running status is not true or fetch error. Got running=${startValidationDetails?.running}, Status: ${startValidationStatus}`);
            throw new Error("Agent start validation failed.");
        }
        console.log(`Validation Passed: Agent running status is true.`);
        console.log("-" * 20);


        // === Step 4: Add Secret ===
        console.log(`\n--- Step 4: Add Secret '${TEST_SECRET_NAME}' to Agent ${agentAddress} ---`);
        const addSecretPayload = {
            address: agentAddress,
            name: TEST_SECRET_NAME,
            secret: TEST_SECRET_VALUE
        };
        const addSecretResponse = await fetch(`${BASE_URL}/secrets`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(addSecretPayload)
        });
        await handleResponse(addSecretResponse, "Add Secret", true); // API might return secret details
        console.log("Secret added successfully (verified by status code).");
        // Note: No direct agent detail validation for secret addition in this test.
        console.log("-" * 20);


        // === Test Passed ===
        console.log("\n✅✅✅ All Steps and Validations Passed Successfully ✅✅✅");


    } catch (error) {
        console.error("\n❌❌❌ TEST SCRIPT FAILED ❌❌❌");
        console.error("Error:", error.message);
        // Ensure cleanup runs even on failure
    } finally {
        // === Step 5: Cleanup - Delete Agent ===
        if (agentAddress) {
            console.log(`\n--- Step 5: Cleanup - Delete Agent ${agentAddress} ---`);
            let deleteSucceeded = false;
            try {
                const deleteResponse = await fetch(`${BASE_URL}/agents/${agentAddress}`, {
                    method: 'DELETE',
                    headers: HEADERS // Reuse headers
                });
                // Use handleResponse, expect no JSON body, allow non-ok status for validation later
                 await handleResponse(deleteResponse, "Delete Agent Request", false);
                 if (deleteResponse.ok) {
                    console.log("Agent delete request successful (Status 200).");
                    deleteSucceeded = true;
                 } else {
                     // Error already logged by handleResponse
                     console.warn(`Agent delete request returned non-OK status: ${deleteResponse.status}`);
                 }

            } catch (deleteRequestError) {
                // This catches network errors etc. during the delete request itself
                console.warn(`!!! Agent Deletion Request FAILED: ${deleteRequestError.message}. Manual cleanup might be required for agent ${agentAddress}. !!!`);
                // Don't set exit code here, let validation handle it
            }

            // === Step 5a: Validate Agent Deletion ===
             console.log(`\n--- Step 5a: Validate Agent Deletion ---`);
             if (!deleteSucceeded) {
                  console.warn("!!! Validation Skipped: Delete request did not succeed in Step 5. !!!");
                  process.exitCode = 1; // Ensure script exits with error if delete failed
              } else {
                  await delay(2000); // Delay to allow deletion processing
                  // Pass [404] to allow the 404 status without throwing an error
                  const { status: deleteValidationStatus } = await getAgentDetails(agentAddress, [404]);
                  if (deleteValidationStatus === 404) {
                      console.log(`Validation Passed: Agent details fetch returned 404 (Not Found).`);
                  } else {
                     console.error(`!!! Validation Failed: Agent details fetch did not return 404. Status: ${deleteValidationStatus}. Manual cleanup likely required.`);
                     process.exitCode = 1; // Exit with error code if cleanup validation fails
                 }
             }

        } else {
            console.log("\n--- Step 5 & 5a: Cleanup and Validation Skipped (No agent address captured) ---");
        }

        console.log("\n--- AgentVerse Deployment Test Finished ---");
        // process.exit() is implicitly called with process.exitCode (0 if not set, 1 if set above)
    }
}

// Run the test
runTest();
