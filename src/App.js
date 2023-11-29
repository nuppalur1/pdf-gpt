import React from 'react';
import Chatbot from './components/Chatbot';
import UploadPDF from './components/UploadPDF';

function App() {
  return (
    <div>
      <h1>PDF Chatbot Application</h1>
      <Chatbot />
      <UploadPDF />
    </div>
  );
}

export default App;
