# Deploying an Agent using the Agentverse Hosting API

## Introduction

The Hosting API empowers users to manage their Agents on Agentverse. From creating and updating Agents to control their states and access detailed logs, this API offers comprehensive tools for efficient Agents management. Users can also retrieve usage statistics, monitor individual Agent performance, and ensure that their Agents operate as intended with up-to-date code.

This documentation provides an in-depth overview of available endpoints, notable objects, and practical examples, enabling developers to interact with the API effectively. Whether you're creating new Agents or managing existing ones, this guide will help you unlock the full potential of the Hosting API.

You can see our dedicated object reference documentation [here](pages/references/agentverse/hosting.mdx). (Note: This link might be relative to the original documentation source).

## Prerequisites

*   **Agentverse API Token:** You need an API token for authorization. Obtain this from your Agentverse profile section.
*   **HTTP Client:** You'll need a tool or library to make HTTP requests (e.g., `curl`, Python `requests`).

## Deployment Steps

Deploying an agent typically involves these steps:

1.  **Create a New Agent:** Reserve an address and name for your agent on the platform.
2.  **Stop the Agent (If Running):** Ensure the agent is stopped before updating code.
3.  **Update the Agent's Code:** Upload the actual code your agent will execute.
4.  **Restart the Agent:** Start the agent again with the new code.

### Step 1: Create a New Agent

Use the `POST /v1/hosting/agents` endpoint to create a new agent instance. You need to provide a name for your agent.

**Endpoint:** `POST /v1/hosting/agents`

**Request Body:**

```json
{
  "name": "Your Agent Name Here"
}
```

**Example (`curl`):**

```bash
curl -X POST \
 -H "Authorization: bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg" \
 -H "Content-Type: application/json" \
 https://agentverse.ai/v1/hosting/agents \
 -d '{"name":"My New Deployed Agent"}'
```

**Successful Response (HTTP 200):**

The response will contain the details of the newly created agent, including its unique `address`. **Make sure to save this `address` for the next steps.**

```json
{
  "name": "My New Deployed Agent",
  "address": "agent1q...", // <-- Save this address!
  "running": false,
  "compiled": null, // Initially not compiled
  "revision": 1,
  "code_digest": null, // Initially no code
  "wallet_address": null // Or your associated wallet
}
```

### Step 2: Stop the Agent (If Running)

**Important:** Before updating an agent's code, it must be stopped. If you just created the agent, it's already stopped. If you are updating an existing, running agent, use the `POST /v1/hosting/agents/{address}/stop` endpoint first.

**Endpoint:** `POST /v1/hosting/agents/{address}/stop`

**Example (`curl`):**

```bash
# Replace {address} with the actual agent address
AGENT_ADDRESS="agent1q..." 

curl -X POST \
 -H "Authorization: bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg" \
 -H "Content-Type: application/json" \
 "https://agentverse.ai/v1/hosting/agents/${AGENT_ADDRESS}/stop"
```

**Successful Response (HTTP 200):**

The response shows the agent's status, with `"running": false`.

```json
[
  {
    "name": "My New Deployed Agent",
    "address": "agent1q...",
    "running": false, // Agent is now stopped
    ...
  }
]
```

### Step 3: Update the Agent's Code

Use the `PUT /v1/hosting/agents/{agentAddress}/code` endpoint to upload your agent's code. Replace `{agentAddress}` with the agent's address. **Remember the agent must be stopped first (Step 2).**

**Important Payload Format:** Contrary to some documentation examples, the API expects the `code` field in the request body to be a **JSON string** that *contains* the array of file objects, not the array itself.

**Endpoint:** `PUT /v1/hosting/agents/{agentAddress}/code`

**Conceptual Request Body Structure:**

```json
{
  "code": "[{\"id\":0,\"name\":\"agent.py\",\"value\":\"...code...\",\"language\":\"python\"}, ...]" 
}
```
*Note: The value for the `"code"` key is a single JSON string, containing the escaped array.*

**Example File Array (to be stringified before sending):**

```json
[
  {
    "id": 0,
    "name": "agent.py",
    "value": "\n# Congratulations on creating your first agent!\n#\n# This agent simply writes a greeting in the logs on a scheduled time interval.\n#\n# In this example we will use:\n# - 'agent': this is your instance of the 'Agent' class that we will give an 'on_interval' task\n# - 'ctx': this is the agent's 'Context', which gives you access to all the agent's important functions\n\n# A decorator (marked by the '@' symbol) just wraps the function defined under it in another function.\n# This decorator tells your agent to run the function on a time interval with the specified 'period' in seconds.\n# These functions must be 'async' because agents need to be able to perform many tasks concurrently.\n@agent.on_interval(period=3.0)\nasync def say_hello(ctx: Context):\n    # ctx.logger is a standard Python logger that can log text with various levels of urgency\n    # (exception, warning, info, debug). Here we will just use the 'info' level to write a greeting\n    ctx.logger.info(f\"Hello, I'm an agent and my address is {agent.address}.\")\n",
    "language": "python"
  },
  {
    "id": 1,
    "name": ".env",
    "value": "AGENT_SEED=YOUR_AGENT_SEED",
    "language": "python"
  }
]
```

**Example (`curl`):**

```bash
# Replace {agentAddress} with the actual agent address
# 1. Define the code array as a shell variable (using single quotes to avoid complex escaping)
CODE_ARRAY='[{"id":0,"name":"agent.py","value":"\n# Congratulations on creating your first agent!\n#\n# This agent simply writes a greeting in the logs on a scheduled time interval.\n#\n# In this example we will use:\n# - '\''agent'\'': this is your instance of the '\''Agent'\'' class that we will give an '\''on_interval'\'' task\n# - '\''ctx'\'': this is the agent'\''s '\''Context'\'', which gives you access to all the agent'\''s important functions\n\n# A decorator (marked by the '\''@'\'' symbol) just wraps the function defined under it in another function.\n# This decorator tells your agent to run the function on a time interval with the specified '\''period'\'' in seconds.\n# These functions must be '\''async'\'' because agents need to be able to perform many tasks concurrently.\n@agent.on_interval(period=3.0)\nasync def say_hello(ctx: Context):\n    # ctx.logger is a standard Python logger that can log text with various levels of urgency\n    # (exception, warning, info, debug). Here we will just use the '\''info'\'' level to write a greeting\n    ctx.logger.info(f\"Hello, I'\''m an agent and my address is {agent.address}.\")\n","language":"python"},{"id":1,"name":".env","value":"AGENT_SEED=YOUR_AGENT_SEED","language":"python"}]'

# 2. Construct the final JSON payload with the code array as a string
#    We use printf for robust JSON string escaping (requires jq)
JSON_PAYLOAD=$(printf '{"code": %s}' "$(printf '%s' "$CODE_ARRAY" | jq -R -s @json)")

# 3. Send the request
curl -X PUT \
 -H "Authorization: bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg" \
 -H "Content-Type: application/json" \
 https://agentverse.ai/v1/hosting/agents/{agentAddress}/code \
 -d "$JSON_PAYLOAD"
```
*(Requires `jq` to be installed for robust JSON string escaping in the shell)*

**Example (Python `requests`):**

```python
import requests
import json 

# Replace with your actual agent address and token
agent_address = "agent1q..." 
token = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"

# Define the code payload as a Python list of dictionaries
code_array = [
    {
        "id": 0,
        "name": "agent.py",
        "value": (
            "\n# Congratulations on creating your first agent!\n#\n"
            "# This agent simply writes a greeting in the logs on a scheduled time interval.\n#\n"
            "# In this example we will use:\n"
            "# - 'agent': this is your instance of the 'Agent' class that we will give an 'on_interval' task\n"
            "# - 'ctx': this is the agent's 'Context', which gives you access to all the agent's important functions\n\n"
            "# A decorator (marked by the '@' symbol) just wraps the function defined under it in another function.\n"
            "# This decorator tells your agent to run the function on a time interval with the specified 'period' in seconds.\n"
            "# These functions must be 'async' because agents need to be able to perform many tasks concurrently.\n"
            "@agent.on_interval(period=3.0)\n"
            "async def say_hello(ctx: Context):\n"
            "    # ctx.logger is a standard Python logger that can log text with various levels of urgency\n"
            "    # (exception, warning, info, debug). Here we will just use the 'info' level to write a greeting\n"
            "    ctx.logger.info(f\"Hello, I'm an agent and my address is {agent.address}.\")\n"
        ),
        "language": "python"
    },
    {
        "id": 1,
        "name": ".env",
        "value": "AGENT_SEED=YOUR_AGENT_SEED",
        "language": "python" # Note: Language might typically be 'dotenv' or similar for .env files
    }
]

# Construct the final payload dictionary with the 'code' value as a JSON string
payload_dict = {
    "code": json.dumps(code_array) # Stringify the array
}

# Construct the URL
url = f"https://agentverse.ai/v1/hosting/agents/{agent_address}/code"

# Set the headers
headers = {
    "Authorization": f"bearer {token}",
    "Content-Type": "application/json" # Keep Content-Type as application/json
}

# Make the PUT request, sending the payload dictionary as raw data after JSON encoding it
response = requests.put(url, data=json.dumps(payload_dict), headers=headers)

# Check the response
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print("Code updated successfully!")
    try:
        print("Response JSON:", response.json())
    except json.JSONDecodeError:
        print("Response content is not valid JSON:", response.text)
else:
    print(f"Error updating code.")
    print("Response Text:", response.text)
```

**Successful Response (HTTP 200):**

The response contains the `digest` of the uploaded code.

```json
{
  "digest": "..." // Digest of the uploaded code
}
```
*(Note: The API response structure might differ slightly, the key is a 200 status and a digest)*

After updating the code, the agent platform will attempt to compile it. You can check the `compiled` status using the "Look up specific Agent" endpoint (`GET /v1/hosting/agents/{agentAddress}`).

### Step 4: Restart the Agent

Once the code has been successfully updated (Step 3), use the `POST /v1/hosting/agents/{address}/start` endpoint to start the agent again. Replace `{address}` with the agent's address.

**Endpoint:** `POST /v1/hosting/agents/{address}/start`

**Example (`curl`):**

```bash
# Replace {address} with the actual agent address
AGENT_ADDRESS="agent1q..." 

curl -X POST \
 -H "Authorization: bearer eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg" \
 -H "Content-Type: application/json" \
 "https://agentverse.ai/v1/hosting/agents/${AGENT_ADDRESS}/start"
```

**Successful Response (HTTP 200):**

The response shows the agent's status, with `"running": true`.

```json
[
  {
    "name": "My New Deployed Agent",
    "address": "agent1q...",
    "running": true, // Agent is now running
    "compiled": true, // Should be true if compilation succeeded
    "revision": 2, // Revision likely incremented
    "code_digest": "...", // Digest of the current code
    "wallet_address": "..."
  }
]
```

Your agent is now deployed and running on Agentverse!

## Optional: Checking Status and Logs

*   **Check Agent Status:** Use `GET /v1/hosting/agents/{agentAddress}` to retrieve the agent's current details (running state, compiled status, etc.).
*   **Get Latest Logs:** Use `GET /v1/hosting/agents/{address}/logs/latest` to fetch the most recent log entries from your running agent.
