import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileList, setFileList] = useState([]);

  //fetch list of uploaded files
  useEffect(() => {
    axios.get('http://localhost:5000/files')
      .then(res => setFileList(res.data))
      .catch(err => console.error(err));
  }, []);

  //setSelectedFile to the first file that is uploaded
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert('Please select a file');
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await axios.post('http://localhost:5000/upload', formData);
      alert('File uploaded successfully');
      //refresh list
      const res = await axios.get('http://localhost:5000/files');
      setFileList(res.data);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h2>Secure Drive</h2>

      <div style={{ marginBottom: 20 }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} style={{ marginLeft: 10 }}>Upload</button>
      </div>

      <h3>Uploaded Files</h3>
      <ul>
        {fileList.map((file, idx) => (
          <li key={idx}>
            {file}
            <button style={{ marginLeft: 10 }}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;