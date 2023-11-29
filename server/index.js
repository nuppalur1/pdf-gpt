const express = require('express');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const Excel = require('exceljs');
const cors = require('cors');
const similarity = require('compute-cosine-similarity');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors()); 
app.use(bodyParser.json());
app.use(fileUpload());

// Initialize OpenAI API key and organization ID
const openaiApiKey = process.env.OPENAI_API_KEY || 'YOUR_DEFAULT_API_KEY';

// Store PDF embeddings in memory 
const pdfEmbeddings = [];

// Function to split the PDF content into smaller chunks
function splitPdfContent(text, wordLimit) {
  const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s/);
  const chunks = [];
  let currentChunk = [];

  for (const sentence of sentences) {
    const words = sentence.split(' ');
    if ((currentChunk.join(' ') + ' ' + words.join(' ')).length <= wordLimit) {
      currentChunk = currentChunk.concat(words);
    } else {
      chunks.push(currentChunk.join(' '));
      currentChunk = words;
    }
  }

  if (currentChunk.length) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

// Read the existing embeddings.xlsx file and populate pdfEmbeddings array
async function readEmbeddingsFile() {
  try {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('embeddings.xlsx');

    const worksheet = workbook.getWorksheet('Embeddings');
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const pdfName = row.getCell(1).text;
        const chunk = row.getCell(2).text;
        const embedding = row.getCell(3).text;
        pdfEmbeddings.push({ pdfName, chunk, embedding });
      }
    });

    console.log('Embeddings file read successfully.');
  } catch (error) {
    console.error('Error reading embeddings file:', error);
  }
}

// Initialize by reading the existing embeddings file
readEmbeddingsFile();

// Handle PDF file upload
app.post('/upload', async (req, res) => {
  try {
    // Ensure that a file is present in the request
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const { pdf } = req.files;

    // Log the received file
    console.log('Received file:', pdf.name);

    // Read the existing workbook or create a new one if it doesn't exist
    let workbook = new Excel.Workbook();

    try {
      await workbook.xlsx.readFile('embeddings.xlsx');
    } catch (readError) {
      // If the file doesn't exist, create a new workbook and worksheet
      workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Embeddings');
      worksheet.getCell('A1').value = 'PDF Name';
      worksheet.getCell('B1').value = 'Chunk';
      worksheet.getCell('C1').value = 'Embedding';
    }

    // Read the existing worksheet
    const worksheet = workbook.getWorksheet('Embeddings');

    // Read the content of the PDF file using pdf-parse
    const pdfData = await pdfParse(pdf.data);

    // Split the PDF content into chunks
    const chunks = splitPdfContent(pdfData.text, 150); 

    // Save each chunk along with its embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding from the chunk using text-embedding-ada-002
      const embeddingResponse = await axios.post(
        'https://api.openai.com/v1/engines/text-embedding-ada-002/completions',
        {
          prompt: chunk,
          max_tokens: 150,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
        }
      );

      // Extract the embedding from the response
      const embedding = embeddingResponse.data.choices[0].text;

      // Save the PDF name, chunk, and embedding to the existing worksheet
      const rowCount = worksheet.rowCount + 1;
      worksheet.getCell(`A${rowCount}`).value = pdf.name;
      worksheet.getCell(`B${rowCount}`).value = chunk;
      worksheet.getCell(`C${rowCount}`).value = embedding;

      // Store the embedding in the pdfEmbeddings array
      pdfEmbeddings.push({ pdfName: pdf.name, chunk, embedding });
    }

    // Write the workbook after all chunks are processed
    await workbook.xlsx.writeFile('embeddings.xlsx');

    // Log success message
    console.log(`Uploaded to 'embeddings.xlsx' successfully`);

    // Send the response after all chunks are processed
    res.json({ success: true });
  } catch (error) {
    console.error('Error in /upload route:', error);
    res.status(500).json({ success: false, error: 'Error processing PDF' });
  }
});

app.post('/answer', async (req, res) => {
  const { userQuery } = req.body;

  try {
    // Generate embedding from the user query using text-embedding-ada-002
    const userQueryEmbeddingResponse = await axios.post(
      'https://api.openai.com/v1/engines/text-embedding-ada-002/completions',
      {
        prompt: userQuery,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      }
    );

    // Extract the embedding from the response
    const userQueryEmbedding = userQueryEmbeddingResponse.data.choices[0].text;

    // Compare user query embedding with PDF embeddings to find the most relevant answer
    const mostRelevantAnswer = findMostRelevantAnswer(userQueryEmbedding);

    if (mostRelevantAnswer) {
      // Concatenate the user query and the most relevant answer
      const concatenatedText = `${userQuery} ${mostRelevantAnswer}`;

      // Use text-davinci-003 to get the answer
      const response = await axios.post(
        'https://api.openai.com/v1/engines/text-davinci-003/completions',
        {
          prompt: concatenatedText,
          max_tokens: 150,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
        }
      );

      // Return the response from text-davinci-003 to the user
      res.json({ answer: response.data.choices[0].text.trim(), source: 'text-davinci-003' });
    } else {
      // If no answer found in PDF embeddings, provide a default response
      res.json({ answer: 'No relevant answer found in PDF embeddings.', source: 'Default' });
    }
  } catch (error) {
    console.error('Error in /answer route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Function to find the most relevant answer using cosine similarity
async function findMostRelevantAnswer(userQueryEmbedding) {
  try {
    // Tokenize the user query embedding
    const userQueryTokens = userQueryEmbedding.split(' ');

    // Initialize variables to keep track of the maximum similarity and the most relevant answer
    let maxSimilarity = -1;
    let mostRelevantAnswer = null;

    // Iterate through each PDF embedding
    for (const pdfEmbedding of pdfEmbeddings) {
      // Tokenize the PDF embedding
      const pdfEmbeddingTokens = pdfEmbedding.embedding.split(' ');

      // Ensure both arrays have the same length
      const maxLength = Math.max(userQueryTokens.length, pdfEmbeddingTokens.length);
      const paddedUserQueryTokens = padArray(userQueryTokens, maxLength);
      const paddedPdfEmbeddingTokens = padArray(pdfEmbeddingTokens, maxLength);

      // Calculate the cosine similarity between the user query embedding and PDF embedding
      const cosSimilarity = similarity(paddedUserQueryTokens, paddedPdfEmbeddingTokens);
      
      // Update the most relevant answer if a higher similarity is found and it exceeds the threshold
      const similarityThreshold = 0.5; 
      if (cosSimilarity > maxSimilarity && cosSimilarity >= similarityThreshold) {
        maxSimilarity = cosSimilarity;
        mostRelevantAnswer = pdfEmbedding.chunk; 
        
      }

    }

    // Return the most relevant answer
    return mostRelevantAnswer;
  } catch (error) {
    console.error('Error in findMostRelevantAnswer:', error);
    return null;
  }
}


// Function to pad an array with zeros to a specified length
function padArray(arr, length) {
  return arr.concat(Array(Math.max(0, length - arr.length)).fill(0));
}



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
