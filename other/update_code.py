import requests
import json # Import json library if you need to load payload from a string

# Replace with your actual agent address and token
agent_address = "agent1qvffmrygl87kn8tynfpvj074pw36fyvlfkw2j40w35gqpr37cldj247fjdt" 
token = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3NDc0MDc0NjksImlhdCI6MTc0NDgxNTQ2OSwiaXNzIjoiZmV0Y2guYWkiLCJqdGkiOiJkYjQ1M2VhNDEwNTU0NDZmZmE3OTMyNjkiLCJzY29wZSI6ImF2Iiwic3ViIjoiMDVkMmI5ODAxZmVhYzVmMTJmM2U2M2M0ZDhjNWVjMTA4YmU5NWFiOTQ4YTUxM2U0In0.RJ7_crqubp5KaVC6hwMZAlNOFDf70bhgJ8Fix7yt8xVD3lxmbS1OoTOSvk50IePy4TH2rJQYH0k56g3KGqYTgUSnOlRqFNj9FQCXGeLrT89KtGqSylvqmLezMS4owg0Yl9-Rn91kYCy18FikaJT44LTZlJ7uxTd6tZiACwxq-jKQkgFX6oLYUqd7nhOK57_QCBJ2SkfsYlBj0LQVyljmqUoL2s-HgsGx6JRmTmzwaShX7Js5tTT5AX-VEIxY-Sl2DoqbHxGYcSZaEAUDn7Qw7Pru4AOEhSCh7dGFhndfMe4ugDZFBhPnBkkZmr0buMUi7ESco0aGwCpT-41YjBzTLg"

# Define the code payload
payload = {
    "code": [
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
}

# Construct the URL
url = f"https://agentverse.ai/v1/hosting/agents/{agent_address}/code"

# Set the headers
headers = {
    "Authorization": f"bearer {token}",
    "Content-Type": "application/json"
}

# Convert the 'code' array to a JSON string
payload_stringified = {
    "code": json.dumps(payload["code"])
}

# Make the PUT request using the stringified payload
print(f"Sending PUT request to {url} with stringified code payload...")
# Send as data=json.dumps(payload_stringified) because requests.put with json= automatically sets Content-Type to application/json
# and handles the serialization, but here we need fine-grained control as we stringified part of the payload manually.
response = requests.put(url, data=json.dumps(payload_stringified), headers=headers)

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
