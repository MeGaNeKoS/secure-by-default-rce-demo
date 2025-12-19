export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic imports to avoid Edge Runtime errors
    const fs = await import('fs');
    const path = await import('path');

    const logDir = path.join(process.cwd(), 'logs');
    const logFilename = process.env.LOG_FILE || 'server.log';
    const logFile = path.join(logDir, logFilename);

    // Ensure logs directory exists
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (err) {
        // Ignore error if directory already exists
      }
    }

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Function to write to both file and original stdout/stderr
    const hookStream = (stdStream: any) => {
      const originalWrite = stdStream.write;
      stdStream.write = function (chunk: any, encoding: any, callback: any) {
        logStream.write(chunk, encoding);
        return originalWrite.apply(stdStream, arguments);
      };
    };

    hookStream(process.stdout);
    hookStream(process.stderr);

    console.log(`[Instrumentation] Logging initialized. Writing to: ${logFile}`);
  }
}