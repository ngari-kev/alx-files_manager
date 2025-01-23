import Queue from "bull";
import imageThumbnail from "image-thumbnail";
import fs from "fs";
import { ObjectID } from "mongodb";
import dbClient from "./utils/db";

const fileQueue = new Queue("fileQueue");

const generateThumbnail = async (path, width) => {
  const thumbnail = await imageThumbnail(path, { width });
  const thumbnailPath = `${path}_${width}`;
  await fs.promises.writeFile(thumbnailPath, thumbnail);
};

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error("Missing fileId");
  }

  if (!userId) {
    throw new Error("Missing userId");
  }

  // Find file in DB
  const file = await (
    await dbClient.filesCollection()
  ).findOne({
    _id: ObjectID(fileId),
    userId: ObjectID(userId),
  });

  if (!file) {
    throw new Error("File not found");
  }

  // Generate thumbnails only for images
  if (file.type === "image") {
    const sizes = [500, 250, 100];
    const thumbnailPromises = sizes.map((size) =>
      generateThumbnail(file.localPath, size),
    );

    await Promise.all(thumbnailPromises);
  }
});

export default fileQueue;
