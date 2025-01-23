import sha1 from 'sha1';
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(req, res) {
    // Check if email is provided
    if (!req.body.email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Check if password is provided
    if (!req.body.password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const { email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await (
        await dbClient.usersCollection()
      ).findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Create a new user
      const hashedPassword = sha1(password);
      const result = await (
        await dbClient.usersCollection()
      ).insertOne({
        email,
        password: hashedPassword,
      });

      // Return new user
      return res.status(201).json({
        id: result.insertedId.toString(),
        email,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await (await dbClient.usersCollection())
        .findOne({ _id: dbClient.client.ObjectID(userId) });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        id: user._id.toString(),
        email: user.email,
      });
    } catch (error) {
      console.error('Error in getMe:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
