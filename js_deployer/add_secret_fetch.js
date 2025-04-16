// Node.js script to add a secret to an agent using fetch

import { argv } from 'node:process'; // To access command-line arguments

// --- Configuration ---
// API Token should ideally be an environment variable for security
const API_TOKEN = process.env.AGENTVERSE_API_TOKEN || "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"; // Fallback token
const BASE_URL = "https://agentverse.ai/v1/hosting";

const HEADERS = {
    "Authorization": `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
};
// ---------------------

// Helper function to handle fetch responses (simplified for this script)
async function handleResponse(response, stepName) {
    console.log(`--- ${stepName} ---`);
    console.log(`Status Code: ${response.status}`);
    const text = await response.text(); // Read text first
    if (text) {
        console.log("Response Body:", text); // Log raw text
    } else {
        console.log("Response Body: (empty)");
    }

    if (!response.ok) {
        console.error(`!!! ${stepName} FAILED (HTTP ${response.status}) !!!`);
        process.exit(1); // Exit script on failure
    }
    // No need to return data for this specific call (usually empty body on success)
}

// Main function to add secret
async function addSecret(agentAddress, secretName, secretValue) {
    if (!agentAddress || !secretName || !secretValue) {
        console.error("Usage: node add_secret_fetch.js <agent_address> <secret_name> <secret_value>");
        console.error("Please provide agent address, secret name, and secret value as command-line arguments.");
        process.exit(1);
    }
     // Check if token is missing or still the placeholder
     if (!API_TOKEN || API_TOKEN.includes("<")) { // Check includes placeholder too
        console.error("Error: API_TOKEN is not set or is a placeholder.");
        console.error("Please set the AGENTVERSE_API_TOKEN environment variable or replace the placeholder in the script.");
        process.exit(1);
    }

    // Headers are defined globally using the token (either from env var or fallback)

    console.log(`Adding secret '${secretName}' to agent ${agentAddress}...`);

    const payload = {
        address: agentAddress,
        name: secretName,
        secret: secretValue
    };

    try {
        const response = await fetch(`${BASE_URL}/secrets`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(payload) // Body needs to be stringified
        });
        await handleResponse(response, "Add Secret");
        console.log("---------------------");
        console.log("Secret add request finished successfully.");

    } catch (error) {
        console.error("!!! SCRIPT FAILED !!!");
        console.error(error);
        process.exit(1);
    }
}

// Get arguments from command line (skip first two: node path and script path)
const args = argv.slice(2);
const agentAddressArg = args[0];
const secretNameArg = args[1];
const secretValueArg = args[2];

// Run the function
addSecret(agentAddressArg, secretNameArg, secretValueArg);
