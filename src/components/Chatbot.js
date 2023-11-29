import React, { useState } from 'react';
import axios from 'axios';
import './Chatbot.css'; 

const Chatbot = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [messages, setMessages] = useState([]);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSubmit = async () => {
    try {
      const pdfAnswerRes = await axios.post('http://localhost:3001/answer', { userQuery: query });

      if (pdfAnswerRes.data.answer) {
        setResponse(pdfAnswerRes.data.answer);

        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'user', content: query, source: 'User' },
          { role: 'bot', content: pdfAnswerRes.data.answer, source: pdfAnswerRes.data.source },
        ]);
      } 
      setQuery('');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={message.role}>
            {message.role === 'user' ? 'User: ' : `Bot: `}
            {Array.isArray(message.content)
              ? message.content.join(' ')
              : typeof message.content === 'object'
              ? JSON.stringify(message.content)
              : message.content}
          </div>
        ))}
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          placeholder="Type your message..."
          value={query}
          onChange={handleQueryChange}
        />
        <button onClick={handleSubmit}>Send</button>
      </div>
    </div>
  );
};

export default Chatbot;