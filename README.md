# Node.js RCE Mitigation: DevOps as the Last Line of Defense

This project demonstrates a critical Remote Code Execution (RCE) vulnerability in a Next.js application (specifically via Server Actions) and how **infrastructure hardening** effectively neutralizes the attack even when the code vulnerability remains.

It contrasts a standard "Unsafe" deployment with a hardened "Safe" deployment using **Distroless** images and **Read-Only Filesystems**.

## 🛡️ The Concept: "Defense in Depth"

Software vulnerabilities are inevitable. When code fails, your infrastructure must prevent the attacker from expanding their foothold.

### The Vulnerability
A **Critical RCE (CVE-2025-55182, aka React2Shell)** exists in the React Server Components (RSC) implementation used by Next.js.
*   **CVSS**: 10.0 (Critical)
*   **Root Cause**: Insecure deserialization of the "Flight" protocol allows an attacker to manipulate internal objects (via prototype pollution or similar mechanisms) during Server Action processing.
*   **Impact**: This allows arbitrary code execution (like `spawnSync`) without authentication.

### The Attack Vectors
1.  **Living off the Land (LotL)**: Using tools already present in the OS (`curl`, `wget`, `ls`, `cat`) to steal secrets or download malware.
    *   *Mechanism*: The exploit uses Node.js `child_process.spawnSync()`. This executes binaries **directly**, without needing a shell (`/bin/sh`).
2.  **Bring Your Own Land (BYOL)**: If standard tools are missing, the attacker uploads their own binary (e.g., a compiled Go executable), marks it executable (`chmod +x`), and runs it.

---

## 🏗️ Architecture Comparison

| Feature | ❌ Unsafe Environment (Port 3001) | ✅ Safe Environment (Port 3000) |
| :--- | :--- | :--- |
| **Base Image** | `node:20-alpine` (Contains `ls`, `curl`, `wget`, etc.) | `gcr.io/distroless/nodejs20-debian12` (No shell, no tools) |
| **Filesystem** | Writable (Standard Docker default) | **Read-Only** (`read_only: true`) |
| **Secrets** | `.env` file on disk (Vulnerable to `cat .env`) | **Environment Variables** (Injected at runtime) |
| **User** | `root` (Default) | Non-root (Enforced by Distroless) |

---

## 📝 Application Logs Analysis

The following logs demonstrate what the attack attempts look like from the application's perspective. This contrast vividly highlights the effectiveness of the security measures.

### Safe App Logs (`logs/server.safe.log`)
The logs show repeated failures (`ENOENT`).
*   **Why?** `spawnSync` tries to run `ls`, `id`, `curl`. The Distroless image simply **does not have these binaries**. It is not just about a missing shell; the tools themselves are gone.

```log
[Instrumentation] Logging initialized. Writing to: /app/logs/server.safe.log
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"step":"1. Write Initial Chunk to /tmp/hello_test","success":true}`'
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"step":"2. Verify Binary was Written","verification":{...},"success":true}`'
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"step":"4. Execute Binary","stdout":"","stderr":"","error_obj":{"message":"spawnSync /tmp/hello_test EACCES","code":"EACCES"},"success":true}`'
```

### Unsafe App Logs (`logs/server.unsafe.log`)
The logs confirm successful command execution and file system manipulation.

```log
[Instrumentation] Logging initialized. Writing to: /app/logs/server.unsafe.log
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"step":"1. Write Initial Chunk to /tmp/hello_test","success":true}`'
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"step":"4. Execute Binary","stdout":"Hello from Go binary!\\n","stderr":"","error_obj":null,"success":true}`'
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"command":"id","args":[],"stdout":"uid=0(root) gid=0(root) ...","stderr":"","status":0,"signal":null}`'
 ⨯ Error: NEXT_REDIRECT
    ... digest: '`{"command":"cat","args":["/app/.env"],"stdout":"","stderr":"cat: can\'t open \'/app/.env\': No such file or directory\n","status":1,"signal":null}`'
```
*(Note: In the unsafe logs, `cat /app/.env` fails above because the file is named `.env` in the root, but `ls -la` in the full logs would reveal the directory structure.)*

---

## 💥 POC Results

### 1. Standard RCE (Living off the Land)
Attempting to run standard shell commands.

-   **Unsafe**: ✅ Success. Attacker can run `id`, `ls`, `cat .env`, and access sensitive data.
-   **Safe**: ❌ Blocked. `spawnSync /bin/sh ENOENT`. There is no shell to execute commands.

### 2. Advanced Attack (Bring Your Own Land)
Attempting to bypass "missing tools" by uploading a custom binary.

-   **Unsafe**: ✅ Success.
    1.  Attacker chunks a binary (to bypass payload limits).
    2.  Writes it to `/tmp/malware`.
    3.  Runs `chmod +x`.
    4.  Executes the binary.
-   **Safe**: ❌ Blocked.
    -   **Write Failed**: `EROFS: read-only file system`.
    -   The attacker cannot drop files anywhere, effectively neutralizing the BYOL attack.

### 3. "True Fileless" Execution Analysis
Can an attacker load a binary into a variable and execute it directly from memory?

-   **Concept**: Concatenate chunks of a binary into a global JavaScript variable (e.g., `global.payload = "..."`), then execute it.
-   **Reality**: **Failed**.
    -   Node.js `child_process` functions (`spawn`, `exec`) **require a file path**. They cannot execute a buffer or string directly.
    -   To bypass this on Linux, one needs `memfd_create` (a syscall to create an anonymous file in RAM).
    -   **The Barrier**: Node.js does not expose `memfd_create` natively. Accessing it would require a C++ addon (like `ffi-napi`) to be pre-installed in `node_modules`.
    -   **Distroless Impact**: Since the image lacks compilers (`gcc`, `make`), an attacker cannot build this addon on the fly.

---

## 🔐 Best Practices Demonstrated

### 1. Use Distroless Images
"Distroless" images contain *only* your application and its runtime dependencies. They do not contain package managers, shells, or standard UNIX tools.
*   **Why?** If an attacker gets RCE, they cannot look around (`ls`), download files (`curl`), or escalate privileges easily.

### 2. Read-Only Filesystems
Configure your container runtime to mount the root filesystem as read-only.
*   **Why?** It prevents attackers from downloading (BYOL) or modifying your application code (persistence).
*   **How?** In `docker-compose.yml`:
    ```yaml
    read_only: true
    tmpfs:
      - /tmp:noexec # CRITICAL: explicitly block execution!
    ```
    *Observation*: With this setup, our POC shows that the attacker *can* write the binary to `/tmp` (write success), but execution fails with `EACCES` (Permission Denied) because of the `noexec` flag. This balances functionality (writable tmp) with security.

### 3. Native Environment Variables (The "Export" Space)
Do **not** ship `.env` files in your container images. If an attacker can read files (e.g., `cat .env`), your secrets are compromised.
*   **Secure Approach**: Inject variables directly into the process environment at runtime (e.g., via Kubernetes Secrets, AWS Parameter Store, or Docker's `environment` key).
*   **Why?** It makes it much harder for an attacker to dump all secrets at once compared to reading a single file.

---

## 🚀 How to Run

1.  **Start the Environment**:
    Both the safe and unsafe applications are defined in a single `docker-compose.yml` file.
    ```bash
    docker compose up --build -d
    ```

2.  **Run the Exploits**:
    You can run the exploits against the specific ports to see the difference.

    *   **Targeting Unsafe App (Port 3001)**:
        ```bash
        # 1. Standard RCE (LotL) - SUCCEEDS
        python exploit/poc.py http://localhost:3001

        # 2. Advanced Attack (BYOL) - SUCCEEDS
        python exploit/poc_advanced.py http://localhost:3001
        ```

    *   **Targeting Safe App (Port 3000)**:
        ```bash
        # 1. Standard RCE (LotL) - FAILS (ENOENT)
        python exploit/poc.py http://localhost:3000

        # 2. Advanced Attack (BYOL) - FAILS (EACCES/EROFS)
        python exploit/poc_advanced.py http://localhost:3000
        ```

3.  **Clean Up**:
    ```bash
    docker compose down
    ```
        