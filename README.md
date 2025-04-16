# Agentverse Deployer Examples

This repository contains various scripts and examples demonstrating how to interact with the Agentverse Hosting API for deploying, managing, and testing agents. It provides implementations using Node.js, `curl`, and Python.

## Project Structure

```
.
├── js_deployer/             # Node.js implementations using fetch API
│   ├── add_secret_fetch.js
│   ├── deploy_agent_fetch.js
│   ├── js_deployer_docs.md  # Detailed documentation for Node.js scripts
│   ├── test_deployment.js
│   ├── test_secret_verification.js
│   └── verify_secret_avctl.js
├── other/                   # Implementations using curl and Python
│   ├── deploy_agent_curl.sh
│   ├── deploy_agent_guide.md # General deployment guide with curl/Python examples
│   ├── deploy_agent_requests.py
│   ├── get_logs.py
│   └── update_code.py
└── README.md                # This file
```

## Overview

The project is divided into two main approaches:

1.  **`js_deployer`**: Contains Node.js scripts that utilize the built-in `fetch` API (Node.js v18+) for interacting with the Agentverse Hosting API.
    *   `deploy_agent_fetch.js`: Deploys a new agent (create, update code, start).
    *   `add_secret_fetch.js`: Adds or updates a secret for an agent.
    *   `test_deployment.js`: An end-to-end test script for the deployment and secret addition workflow, including validation and cleanup.
    *   `test_secret_verification.js`: Tests secret updates by deploying an agent that logs the secret value and verifying logs using `avctl`.
    *   `verify_secret_avctl.js`: Attempts to verify secret existence (by name) using `avctl`.
    *   See `js_deployer/js_deployer_docs.md` for detailed usage instructions and API examples.

2.  **`other`**: Contains examples using `curl` and Python's `requests` library.
    *   `deploy_agent_curl.sh`: A shell script likely implementing the `curl` deployment steps.
    *   `deploy_agent_requests.py`: A Python script likely implementing the `requests` deployment steps.
    *   `get_logs.py`: A Python script likely for fetching agent logs.
    *   `update_code.py`: A Python script likely focused on the code update step.
    *   See `other/deploy_agent_guide.md` for a general guide and specific `curl`/Python examples.

## Prerequisites

Depending on the scripts you intend to use, you might need:

*   **Agentverse API Token:** Obtainable from your Agentverse profile. Scripts may look for the `AGENTVERSE_API_TOKEN` environment variable or use hardcoded fallbacks (use environment variables for security).
*   **Node.js:** Version 18+ recommended for native `fetch` support (for `js_deployer` scripts).
*   **curl:** Command-line tool for transferring data with URLs (for `deploy_agent_curl.sh`).
*   **Python 3:** With the `requests` library installed (`pip install requests`) (for Python scripts in `other/`).
*   **jq:** Command-line JSON processor (potentially required by `deploy_agent_curl.sh` for robust JSON handling).
*   **avctl:** The Agentverse Command Line tool, installed and authenticated (`avctl auth login`) (required by `verify_secret_avctl.js` and `test_secret_verification.js`).

## Key API Considerations

*   **Code Payload Format:** When updating agent code (`PUT /agents/{address}/code`), the API expects the `code` field in the JSON payload to be a *stringified* JSON array of file objects, not the raw array itself. The provided scripts handle this correctly.
*   **Stopping Agent Before Code Update:** An agent must be stopped before its code can be updated. Ensure you include a "stop" step if updating an existing, running agent.

## Getting Started

1.  Clone this repository.
2.  Ensure you have the necessary prerequisites installed for the scripts you want to use.
3.  Set up your Agentverse API Token (preferably via the `AGENTVERSE_API_TOKEN` environment variable).
4.  Navigate to the relevant subdirectory (`js_deployer` or `other`).
5.  Consult the corresponding documentation (`js_deployer_docs.md` or `deploy_agent_guide.md`) for detailed instructions on configuring and running the scripts.
