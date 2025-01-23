import { ObjectID } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fileQueue from '../worker';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const ROOT_FOLDER_ID = 0;

export default class FilesController {
  static async postUpload(req, res) {
    const { user } = req;
    const { name, type, parentId = '0', isPublic = false, data } = req.body;

    // Validate request data
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Validate parentId
    if (parentId !== '0') {
      const parentFile = await (
        await dbClient.filesCollection()
      ).findOne({ _id: ObjectID(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create file document
    const newFile = {
      userId: user._id,
      name,
      type,
      parentId: parentId === '0' ? ROOT_FOLDER_ID : ObjectID(parentId),
      isPublic,
    };

    // Handle file data if not a folder
    if (type !== 'folder') {
      // Create folder if it doesn't exist
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
      }

      // Save file locally
      const fileData = Buffer.from(data, 'base64');
      const fileName = uuidv4();
      const localPath = path.join(FOLDER_PATH, fileName);
      fs.writeFileSync(localPath, fileData);
      newFile.localPath = localPath;
    }

    // Save to database
    const result = await (await dbClient.filesCollection()).insertOne(newFile);

    // Queue thumbnail generation if it's an image
    if (type === 'image') {
      await fileQueue.add({
        userId: user._id.toString(),
        fileId: result.insertedId.toString(),
      });
    }

    return res.status(201).json({
      id: result.insertedId.toString(),
      userId: newFile.userId.toString(),
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId.toString(),
    });
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;
    const token = req.headers['x-token'];

    // Validate size parameter if provided
    const validSizes = ['500', '250', '100'];
    if (size && !validSizes.includes(size)) {
      return res.status(400).json({ error: 'Invalid size parameter' });
    }

    try {
      // Get file document
      const file = await (
        await dbClient.filesCollection()
      ).findOne({ _id: ObjectID(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check file permissions
      if (!file.isPublic) {
        if (!token) {
          return res.status(404).json({ error: 'Not found' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId || userId !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      // Determine which file path to use
      let filePath = file.localPath;
      if (size && file.type === 'image') {
        filePath = `${file.localPath}_${size}`;
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name);
      const fileContent = fs.readFileSync(filePath);
      res.setHeader('Content-Type', mimeType);
      return res.send(fileContent);
    } catch (error) {
      console.error('Error in getFile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
