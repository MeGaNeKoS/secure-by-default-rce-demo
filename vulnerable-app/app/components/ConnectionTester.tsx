'use client';

import { useState } from 'react';
import { checkGoogleConnection, getSystemInfo } from '../actions';

export default function ConnectionTester() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  
  const [sysInfoStatus, setSysInfoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sysInfo, setSysInfo] = useState<any>(null);

  const handleTest = async () => {
    setStatus('loading');
    setResult('Initiating secure server-side connection...');
    
    try {
      const data = await checkGoogleConnection();
      if (data.success) {
        setStatus('success');
        setResult(data.message);
      } else {
        setStatus('error');
        setResult(data.message);
      }
    } catch (err) {
      setStatus('error');
      setResult('An unexpected error occurred while invoking the Server Action.');
    }
  };

  const handleSysInfo = async () => {
    setSysInfoStatus('loading');
    try {
      const data = await getSystemInfo();
      if (data.success) {
        setSysInfoStatus('success');
        setSysInfo(data);
      } else {
        setSysInfoStatus('error');
      }
    } catch (err) {
      setSysInfoStatus('error');
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transition-colors duration-200 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Secure Connectivity Test
        </h2>
        
        <p className="mb-6 text-gray-600 dark:text-gray-300 text-sm">
          Click the button below to invoke a protected Server Action. This will securely fetch data from an external source (Google) without exposing the logic to the client.
        </p>

        <button
          onClick={handleTest}
          disabled={status === 'loading'}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            status === 'loading'
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg'
          }`}
        >
          {status === 'loading' ? 'Processing...' : 'Test Connection'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-md border ${
            status === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
              : status === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'
          }`}>
            <p className="font-mono text-sm break-all">{result}</p>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          System Internals
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300 text-sm">
          Retrieve environment secrets and system info. This proves the app has access, even if RCE is blocked.
        </p>
        
        <button
          onClick={handleSysInfo}
          disabled={sysInfoStatus === 'loading'}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-all transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            sysInfoStatus === 'loading'
              ? 'bg-purple-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 shadow-md hover:shadow-lg'
          }`}
        >
          {sysInfoStatus === 'loading' ? 'Retrieving Info...' : 'Reveal Secrets & System Info'}
        </button>

        {sysInfo && (
          <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-md border border-gray-700 font-mono text-xs overflow-x-auto">
            <div className="mb-3">
              <span className="text-green-400">$ echo $SECRET_API_KEY</span>
              <br/>
              <span className="text-yellow-300">{sysInfo.secret}</span>
            </div>
            
            <div className="mb-3">
              <span className="text-green-400">$ id</span>
              <br/>
              <span>{sysInfo.idOutput}</span>
            </div>

            <div>
              <span className="text-green-400">$ ls -lah {sysInfo.cwd}</span>
              <br/>
              <pre>{sysInfo.lsOutput}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
