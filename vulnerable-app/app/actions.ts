'use server';

import axios from '@/lib/axios-instance';
import fs from 'fs';
import path from 'path';

export async function checkGoogleConnection() {
  try {
    const start = Date.now();
    const response = await axios.get('https://www.google.com', {
      timeout: 5000,
      validateStatus: () => true, // Accept all status codes so we don't throw on 404/500
    });
    const duration = Date.now() - start;

    return {
      success: true,
      statusCode: response.status,
      duration: duration,
      message: `Successfully connected to Google in ${duration}ms (Status: ${response.status})`
    };
  } catch (error: any) {
    return {
      success: false,
      statusCode: 0,
      duration: 0,
      message: `Connection failed: ${error.message}`
    };
  }
}

export async function getSystemInfo() {
  try {
    // 1. Retrieve Secret
    const secret = process.env.SECRET_API_KEY || 'Not Found';

    // 2. Emulate 'id' command
    const uid = process.getuid ? process.getuid() : 'N/A';
    const gid = process.getgid ? process.getgid() : 'N/A';
    const idOutput = `uid=${uid}(root) gid=${gid}(root) groups=${gid}(root)`;

    // 3. Emulate 'ls -lah' properly
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd);
    let lsOutput = `total ${files.length}\n`;

    // Helper to convert mode to string
    const modeToString = (stats: fs.Stats) => {
      const mode = stats.mode;
      let str = stats.isDirectory() ? 'd' : '-';
      
      // User
      str += (mode & 0o400) ? 'r' : '-';
      str += (mode & 0o200) ? 'w' : '-';
      str += (mode & 0o100) ? 'x' : '-';
      
      // Group
      str += (mode & 0o040) ? 'r' : '-';
      str += (mode & 0o020) ? 'w' : '-';
      str += (mode & 0o010) ? 'x' : '-';
      
      // Other
      str += (mode & 0o004) ? 'r' : '-';
      str += (mode & 0o002) ? 'w' : '-';
      str += (mode & 0o001) ? 'x' : '-';
      
      return str;
    };
    
    // Add . and ..
    const statDot = fs.statSync(cwd);
    lsOutput += `${modeToString(statDot)} ${statDot.uid} ${statDot.gid} ${statDot.size} . \n`;
    lsOutput += `${modeToString(statDot)} ${statDot.uid} ${statDot.gid} ${statDot.size} .. \n`;

    files.forEach(file => {
      try {
        const filePath = path.join(cwd, file);
        const stats = fs.statSync(filePath);
        lsOutput += `${modeToString(stats)} ${stats.uid} ${stats.gid} ${stats.size.toString().padEnd(6)} ${file}\n`;
      } catch (e) {
        lsOutput += `?????????? ? ? ? ? ${file}\n`;
      }
    });

    return {
      success: true,
      secret,
      idOutput,
      lsOutput,
      cwd
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to retrieve info: ${error.message}`
    };
  }
}
