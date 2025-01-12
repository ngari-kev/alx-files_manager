import dbClient from '../utils/db';

export default class FilesController {
  static postUpload (req, res) {
    const { user } = req;
    const file = req.body ? req.body.file : null;
    const type = req.body ? req.body.type : null;
    const parentId = req.body && req.body.parentId ? req.body.parentId : ROOT_FOLDER_ID;
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const base64Data = req.body && req.body.data ? req.body.data : '';
  }
}
