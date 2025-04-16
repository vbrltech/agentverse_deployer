// Node.js script to verify an agent's secret using avctl

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

// --- Configuration ---
const AGENT_ADDRESS = "agent1qglzz69858az0969h6j39k5vzm0x9m6p6uyw8uq96fxzvvtf7yu8wwswpy6";
const SECRET_NAME_TO_VERIFY = "EXAMPLE_SECRET";
const EXPECTED_SECRET_VALUE = "another_new_value_789"; // Updated expected value
// ---------------------

const execPromise = promisify(exec);

async function verifySecret() {
    console.log(`Verifying secret '${SECRET_NAME_TO_VERIFY}' for agent ${AGENT_ADDRESS} using avctl...`);

    // Corrected command using the -a flag for the address
    const command = `avctl hosting get secrets -a ${AGENT_ADDRESS}`;
    console.log(`Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
            console.warn("avctl reported errors/warnings:", stderr);
            // Continue processing stdout if possible, as sometimes non-fatal errors are printed to stderr
        }

        console.log("\n--- avctl Output ---");
        console.log(stdout.trim());
        console.log("--------------------\n");

        // --- Output Parsing Logic ---
        // This assumes avctl outputs secrets in a parsable format, potentially line by line.
        // Example expected format (adjust regex if needed): "Name: SECRET_NAME, Value: SECRET_VALUE"
        // Or maybe just lines like: "SECRET_NAME: SECRET_VALUE"
        let found = false;
        let actualValue = null;
        const lines = stdout.trim().split('\n');

        // Regex to capture name and value, allowing for variations in spacing and separators (:, =)
        // It looks for the specific secret name at the start of a line or after "Name:"
        const secretRegex = new RegExp(`(?:^|Name:\\s*)${SECRET_NAME_TO_VERIFY}\\s*[:=]\\s*(.*)`, 'i');

        for (const line of lines) {
            const match = line.trim().match(secretRegex);
            if (match && match[1]) {
                found = true;
                // Extract the value, potentially trimming quotes if avctl adds them
                actualValue = match[1].trim().replace(/^['"]|['"]$/g, '');
                break; // Found the secret, no need to check further lines
            }
        }
        // --- End Parsing Logic ---


        if (!found) {
            console.error(`❌ Verification FAILED: Secret '${SECRET_NAME_TO_VERIFY}' not found in avctl output.`);
            process.exitCode = 1;
        } else if (actualValue === EXPECTED_SECRET_VALUE) {
            console.log(`✅ Verification PASSED: Secret '${SECRET_NAME_TO_VERIFY}' has the expected value ('${EXPECTED_SECRET_VALUE}').`);
        } else {
            console.error(`❌ Verification FAILED: Secret '${SECRET_NAME_TO_VERIFY}' has value '${actualValue}', expected '${EXPECTED_SECRET_VALUE}'.`);
            process.exitCode = 1;
        }

    } catch (error) {
        console.error(`!!! SCRIPT FAILED executing avctl command !!!`);
        console.error("Error:", error.message);
        if (error.stderr) {
             console.error("avctl stderr:", error.stderr);
        }
         if (error.stdout) {
             console.error("avctl stdout (on error):", error.stdout);
        }
        console.error("\nPlease ensure 'avctl' is installed, configured, and in your system's PATH.");
        process.exitCode = 1;
    }
}

verifySecret();
