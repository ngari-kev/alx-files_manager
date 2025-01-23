import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const databaseURL = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(databaseURL, { useUnifiedTopology: true });
    this.client
      .connect()
      .then(() => console.log('Connected to MongoDB'))
      .catch((err) => console.error('Failed to connect to MongoDB:', err));
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

  async usersCollection() {
    return this.client.db().collection('users');
  }

  async filesCollection() {
    return this.client.db().collection('files');
  }
}

const dbClient = new DBClient();
export default dbClient;
