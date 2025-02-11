import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb'; // Import ObjectId for MongoDB

const app = express();

app.use(cors({
    origin: '*', // Allow requests from all origins for testing
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json()); // Middleware to parse JSON body

const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/';
const DATABASE_NAME = 'main_db';
const COLLECTION_NAME = 'job_postings';

// Connect to MongoDB once when the server starts
const client = new MongoClient(MONGO_URI);

client.connect().then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit if connection fails
});


app.get('/api/jobs', async (req, res) => {
    try {
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);
        const jobs = await collection.find().toArray();
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Failed to fetch jobs');
    }
});


app.put('/api/jobs/:id', async (req, res) => {
    const jobId = req.params.id;  // Get the job ID from the URL parameter
    const { Bookmarked } = req.body;  // Get the updated Bookmarked status from the request body

    // Validate if the jobId is a valid MongoDB ObjectId
    if (!ObjectId.isValid(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
    }

    try {
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Find the job with the provided _id
        const job = await collection.findOne({ _id: new ObjectId(jobId) });

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Update the job's Bookmarked status
        const result = await collection.updateOne(
            { _id: new ObjectId(jobId) },  // Find the job by its ObjectId
            { $set: { Bookmarked } }       // Update the Bookmarked field
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'No update made to the job' });
        }

        // Return the updated job document
        const updatedJob = await collection.findOne({ _id: new ObjectId(jobId) });
        res.status(200).json(updatedJob);

    } catch (error) {
        console.error('Error updating bookmark:', error);
        res.status(500).json({ message: 'Error updating bookmark', error });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
