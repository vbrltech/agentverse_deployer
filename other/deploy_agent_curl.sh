#!/bin/bash

# --- Configuration ---
AGENT_NAME="My Curl Deployed Agent"
API_TOKEN="eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"
BASE_URL="https://agentverse.ai/v1/hosting"

# Check if jq is installed
if ! command -v jq &> /dev/null
then
    echo "Error: jq is not installed. Please install jq (e.g., 'brew install jq' or 'sudo apt-get install jq')."
    exit 1
fi

# Example code payload (as bash variable)
# Using single quotes and escaping internal single quotes for easier definition
CODE_ARRAY='[{"id":0,"name":"agent.py","value":"\n# Congratulations on creating your first agent!\n#\n# This agent simply writes a greeting in the logs on a scheduled time interval.\n#\n# In this example we will use:\n# - '\''agent'\'': this is your instance of the '\''Agent'\'' class that we will give an '\''on_interval'\'' task\n# - '\''ctx'\'': this is the agent'\''s '\''Context'\'', which gives you access to all the agent'\''s important functions\n\n# A decorator (marked by the '\''@'\'' symbol) just wraps the function defined under it in another function.\n# This decorator tells your agent to run the function on a time interval with the specified '\''period'\'' in seconds.\n# These functions must be '\''async'\'' because agents need to be able to perform many tasks concurrently.\n@agent.on_interval(period=3.0)\nasync def say_hello(ctx: Context):\n    # ctx.logger is a standard Python logger that can log text with various levels of urgency\n    # (exception, warning, info, debug). Here we will just use the '\''info'\'' level to write a greeting\n    ctx.logger.info(f\"Hello, I'\''m an agent and my address is {agent.address}.\")\n","language":"python"},{"id":1,"name":".env","value":"AGENT_SEED=YOUR_AGENT_SEED_CURL","language":"python"}]'
# ---------------------

# Function to make curl requests and check status
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local step_name=$4

    echo "--- $step_name ---"
    echo "URL: $url"
    if [[ -n "$data" ]]; then
        echo "Data: $data"
    fi

    # Add -v for verbose output
    if [[ -n "$data" ]]; then
        RESPONSE=$(curl -v -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
             -H "Authorization: bearer $API_TOKEN" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$url")
    else
         RESPONSE=$(curl -v -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
             -H "Authorization: bearer $API_TOKEN" \
             -H "Content-Type: application/json" \
             "$url")
    fi

    # Extract status code and body
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
    BODY=$(echo "$RESPONSE" | sed '$d') # Remove last line (status code)

    echo "Status Code: $HTTP_STATUS"
    echo "Response Body: $BODY"

    if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
        echo "!!! $step_name FAILED (HTTP $HTTP_STATUS) !!!"
        # Return non-zero status to indicate failure
        return 1
    fi
    # Return zero status for success
    return 0
}

# === Step 1: Create Agent ===
CREATE_PAYLOAD=$(printf '{"name": "%s"}' "$AGENT_NAME")
# Use command substitution to capture BODY directly if make_request succeeds
if ! CREATE_BODY=$(make_request "POST" "$BASE_URL/agents" "$CREATE_PAYLOAD" "Step 1: Create Agent"); then
    exit 1 # Exit if make_request failed
fi

# Extract agent address using grep and string manipulation (more resilient to malformed JSON)
# Extracts the value associated with "address": up to the next quote
# Clean potential trailing newline/carriage return characters as well
AGENT_ADDRESS=$(echo "$CREATE_BODY" | grep -o '"address":"[^"]*"' | cut -d':' -f2 | tr -d '"\r\n')

if [[ -z "$AGENT_ADDRESS" ]]; then
    echo "!!! Could not extract agent address from creation response. Exiting. !!!"
    exit 1
fi
echo "Agent created successfully. Address: $AGENT_ADDRESS"

# === Step 2: Stop Agent (Generally not needed for new agents) ===
# New agents start stopped. If updating, uncomment this section.
# echo "Ensuring agent $AGENT_ADDRESS is stopped..."
# make_request "POST" "$BASE_URL/agents/$AGENT_ADDRESS/stop" "" "Step 2: Stop Agent"
# sleep 2

# === Step 3: Update Code ===
# 1. Escape the CODE_ARRAY using jq
ESCAPED_CODE_ARRAY=$(printf '%s' "$CODE_ARRAY" | jq -R -s @json)
# 2. Construct the final payload string directly, ensuring jq output is treated literally
UPDATE_PAYLOAD="{\"code\": ${ESCAPED_CODE_ARRAY}}"
# 3. Make the request
if ! make_request "PUT" "${BASE_URL}/agents/${AGENT_ADDRESS}/code" "$UPDATE_PAYLOAD" "Step 3: Update Code"; then
    exit 1 # Exit if make_request failed
fi
echo "Code update request sent. Waiting a few seconds for compilation..."
sleep 5

# === Step 4: Restart Agent ===
if ! make_request "POST" "${BASE_URL}/agents/${AGENT_ADDRESS}/start" "" "Step 4: Restart Agent"; then
    exit 1 # Exit if make_request failed
fi

echo "Agent deployment script finished."
