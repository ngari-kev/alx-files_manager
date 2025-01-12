import express from 'express';
import SetRoutes from './routes';

const server = express();

server.use(express.json());

SetRoutes(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default server;
