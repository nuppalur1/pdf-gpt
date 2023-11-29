# PDF GPT React Project
WILP AI Assignment

## Overview

This project combines React for the front end and Node.js with Express for the back end to create a chatbot that utilizes OpenAI's GPT models. The chatbot can answer user queries by searching through PDF content using text embeddings and cosine similarity.

### Components

#### `pdf-gpt/src/components/Chatbot.js`

This React component represents the chatbot interface. It allows users to interact with the chatbot by typing queries and receiving responses.

#### `pdf-gpt/src/components/UploadPDF.js`

This React component handles the PDF file upload functionality. Users can upload PDF files, and the content is processed to generate embeddings, which are stored for later use.

#### `pdf-gpt/server/index.js`

This Node.js and Express server acts as the back end for the project. It handles PDF file uploads, generates embeddings for the PDF content, and uses OpenAI's GPT models to respond to user queries.

## Setup Instructions

1. **Clone the Repository**

      ```bash
      git clone https://github.com/nuppalur1/pdf-gpt.git
2. **Navigate to the Project Directory**
      cd pdf-gpt
3. **Install Dependencies**
      Install dependencies for the React app
      cd src
      npm install
   
      Navigate to the server directory
      cd ../server
      npm install

4. **Set Up OpenAI API Key**

     Obtain an API key from OpenAI and set it as an environment variable in the server. Create a .env file in the server directory and add:
     OPENAI_API_KEY=your_openai_api_key

5. **Run the application**
     Start the React app
     cd ../src
     npm start
     
     Start the server
     cd ../server
     node index.js
6. **Access the Application**

   Open your browser and go to http://localhost:3000 to use the chatbot.
   
## Code Overview
   1. The React app (pdf-gpt/src) provides the user interface for interacting with the chatbot and uploading PDF files.
   2. The Node.js server (pdf-gpt/server) handles PDF processing, embedding generation, and communicates with the OpenAI API for chat responses.

## Key Components
   1. Chatbot.js: React component for user interaction with the chatbot.
   2. UploadPDF.js: React component for uploading PDF files.
   3. index.js (server): Express server handling PDF uploads, embedding generation, and chat responses.
   4. text-embedding-ada-002: OpenAI model for generating text embeddings.
5. text-davinci-003: OpenAI model for chat responses.
