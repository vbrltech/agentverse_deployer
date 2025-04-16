import requests
import json
import time
import sys

# --- Configuration ---
AGENT_NAME = "My Python Deployed Agent"
API_TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"
BASE_URL = "https://agentverse.ai/v1/hosting"

HEADERS = {
    "Authorization": f"bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Example code payload (as Python list of dicts)
CODE_ARRAY = [
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
        "value": "AGENT_SEED=YOUR_AGENT_SEED_PYTHON", # Slightly different seed for clarity
        "language": "python" 
    }
]
# ---------------------

def handle_response(response, step_name):
    """Checks response status and prints details."""
    print(f"--- {step_name} ---")
    print(f"Status Code: {response.status_code}")
    try:
        response_json = response.json()
        print("Response JSON:", json.dumps(response_json, indent=2))
        if response.status_code >= 400:
            print(f"!!! {step_name} FAILED !!!")
            sys.exit(1) # Exit script on failure
        return response_json
    except json.JSONDecodeError:
        print("Response content is not valid JSON:", response.text)
        if response.status_code >= 400:
             print(f"!!! {step_name} FAILED !!!")
             sys.exit(1) # Exit script on failure
        return None # Or handle non-JSON success differently if needed

# === Step 1: Create Agent ===
print(f"Creating agent '{AGENT_NAME}'...")
create_payload = {"name": AGENT_NAME}
create_response = requests.post(f"{BASE_URL}/agents", json=create_payload, headers=HEADERS)
create_data = handle_response(create_response, "Create Agent")

if not create_data or 'address' not in create_data:
     print("!!! Could not extract agent address from creation response. Exiting. !!!")
     sys.exit(1)

agent_address = create_data['address']
print(f"Agent created successfully. Address: {agent_address}")
print("-" * 20)

# === Step 2: Stop Agent (Generally not needed for new agents, but good practice) ===
# New agents are created in a stopped state. If updating an existing agent, 
# you would uncomment and potentially add logic to check if it's running first.
# print(f"Ensuring agent {agent_address} is stopped...")
# stop_response = requests.post(f"{BASE_URL}/agents/{agent_address}/stop", headers=HEADERS)
# handle_response(stop_response, "Stop Agent")
# print("-" * 20)
# time.sleep(2) # Add a small delay if needed after stopping

# === Step 3: Update Code ===
print(f"Updating code for agent {agent_address}...")
# Construct the payload with the 'code' value as a JSON string
update_payload_dict = {
    "code": json.dumps(CODE_ARRAY) # Stringify the array
}
update_response = requests.put(
    f"{BASE_URL}/agents/{agent_address}/code", 
    data=json.dumps(update_payload_dict), # Send the dict containing the stringified code
    headers=HEADERS
)
handle_response(update_response, "Update Code")
print("Code update request sent. Waiting a few seconds for compilation...")
print("-" * 20)
time.sleep(5) # Give time for compilation attempt

# === Step 4: Restart Agent ===
print(f"Starting agent {agent_address}...")
start_response = requests.post(f"{BASE_URL}/agents/{agent_address}/start", headers=HEADERS)
handle_response(start_response, "Start Agent")
print("-" * 20)

print("Agent deployment script finished.")
