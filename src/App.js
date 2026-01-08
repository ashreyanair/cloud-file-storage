import React, { useState, useEffect, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// --- PASTE YOUR AWS DETAILS HERE ---
const USER_POOL_ID = 'us-east-1_5n92XJhmp';      // Paste your User Pool ID
const CLIENT_ID = '6973f813af1c3s075cnfdmkqou';        // Paste your App Client ID
const API_URL = '/api'; // Using proxy to bypass CORS

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: USER_POOL_ID,
      userPoolClientId: CLIENT_ID,
    }
  }
});

// Inner component that uses authentication
function FileStorage({ signOut, user }) {
  const [role, setRole] = useState("");
  const [token, setToken] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  // Function to List Files
  const listFiles = useCallback(async (authToken) => {
    try {
      console.log("Token being sent (first 100 chars):", authToken.substring(0, 100) + "...");
      const res = await fetch(`${API_URL}/files`, {
        headers: { Authorization: authToken }
      });
      const data = await res.json();
      console.log("API Response:", data);
      if (Array.isArray(data)) setFiles(data);
    } catch (err) { console.error("Error listing files:", err); }
  }, []);

  // Check user and fetch session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;
        if (idToken) {
          const tokenStr = idToken.toString();
          setToken(tokenStr);
          setRole(idToken.payload['custom:role'] || 'user');
          listFiles(tokenStr);
        }
      } catch (e) {
        console.log("Error fetching session:", e);
      }
    }
    initSession();
  }, [listFiles]);

  // Function to Upload File
  async function upload() {
    if (!uploadFile || !token) return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(uploadFile);
    reader.onload = async (e) => {
      try {
        const res = await fetch(`${API_URL}/files`, {
          method: 'POST',
          headers: {
            Authorization: token,
            'file-name': uploadFile.name,
            'Content-Type': uploadFile.type
          },
          body: e.target.result
        });
        if (res.ok) {
          alert("Uploaded!");
          listFiles(token);
        } else {
          alert("Upload Failed. Check console.");
          console.error("Upload response:", res.status, await res.text());
        }
      } catch (err) { console.error(err); }
    };
  }

  // Function to Delete File (Admins Only)
  async function remove(fileId) {
    const res = await fetch(`${API_URL}/delete`, {
      method: 'POST',
      headers: { Authorization: token },
      body: JSON.stringify({ fileId })
    });
    if (res.status === 403) alert("Access Denied: Admins Only!");
    else listFiles(token);
  }

  // Function to Download File
  async function download(fileName) {
    const res = await fetch(`${API_URL}/download`, {
      method: 'POST',
      headers: { Authorization: token },
      body: JSON.stringify({ fileName })
    });
    const { downloadUrl } = await res.json();
    window.open(downloadUrl, "_blank");
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Secure Cloud Storage</h2>
        <button onClick={signOut}>Sign Out</button>
      </header>
      <p>Logged in as: <strong>{user?.signInDetails?.loginId}</strong></p>
      <p>Role: <strong style={{ color: role === 'admin' ? 'red' : 'blue' }}>{role || 'loading...'}</strong></p>
      <hr />

      {/* Upload Section: Hidden for Viewers */}
      {role !== 'viewer' && (
        <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 5, marginBottom: 20 }}>
          <h3>Upload New File</h3>
          <input type="file" onChange={e => setUploadFile(e.target.files[0])} />
          <button onClick={upload} style={{ marginLeft: 10, padding: '5px 15px', cursor: 'pointer' }}>Upload</button>
        </div>
      )}

      {/* File List */}
      <h3>My Files</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {files.map(f => (
          <li key={f.fileId} style={{ borderBottom: '1px solid #ccc', padding: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>{f.fileName} <small style={{ color: 'gray' }}>({f.uploadedBy})</small></span>
            <div>
              <button onClick={() => download(f.fileName)} style={{ marginRight: 10 }}>Download</button>
              
              {/* Delete Button: Only for Admins */}
              {role === 'admin' && (
                <button onClick={() => remove(f.fileId)} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px' }}>Delete</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <FileStorage signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}

export default App;