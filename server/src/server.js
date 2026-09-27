import { createServer } from "node:http";
import { connectDB } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    // Connect to MongoDB first (auth.service.js needs the connection)
    await connectDB();

    // Import app after DB connection is established
    const { createApplication } = await import("./app.js");
    const server = createServer(createApplication());

    server.listen(env.PORT, () => {
      console.log(`HTTP server is listening at PORT: ${env.PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
