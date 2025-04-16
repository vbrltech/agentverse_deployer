import requests
import json
import sys

# --- Configuration ---
AGENT_ADDRESS = "agent1qws4hyn96l9htmfdh6r6jg39py88xn9wrl0fpjrjrp9mc4ncr0xrx6ttk89" # From the last successful deployment
API_TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"
BASE_URL = "https://agentverse.ai/v1/hosting"

HEADERS = {
    "Authorization": f"bearer {API_TOKEN}",
    "Content-Type": "application/json"
}
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
        return None 

# === Get Latest Logs ===
print(f"Fetching latest logs for agent {AGENT_ADDRESS}...")
log_url = f"{BASE_URL}/agents/{AGENT_ADDRESS}/logs/latest"
log_response = requests.get(log_url, headers=HEADERS)
handle_response(log_response, "Get Latest Logs")
print("-" * 20)

print("Log fetching script finished.")
