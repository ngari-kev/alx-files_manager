import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

export default class AuthController {
  static async getConnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
      }

      const user = await dbClient.client.db().collection('users').findOne({ _id: userId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: user not found' });
      }

      const newToken = uuidv4();

      await redisClient.set(`auth_${newToken}`, user._id.toString(), 24 * 60 * 60);

      res.status(200).json({ token: newToken });
    } catch (error) {
      console.error('Error connecting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await redisClient.del(`auth_${token}`);
      if (!result) {
        return res.status(401).json({ error: 'Unauthorized: invalid token' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error disconnecting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
