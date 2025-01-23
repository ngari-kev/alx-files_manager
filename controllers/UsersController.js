import sha1 from "sha1";
import dbClient from "../utils/db";

export default class UsersController {
  static async postNew(req, res) {
    // Check if email is provided
    if (!req.body.email) {
      return res.status(400).json({ error: "Missing email" });
    }

    // Check if password is provided
    if (!req.body.password) {
      return res.status(400).json({ error: "Missing password" });
    }

    const { email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await (
        await dbClient.usersCollection()
      ).findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: "Already exist" });
      }

      // Create new user
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
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getMe(req, res) {
    const { user } = req;
    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
