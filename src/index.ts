import app from "./app";
import prisma from "./lib/prisma";
import cors from "cors"

const PORT = 8000;

app.use(
  cors({
    origin: "http://your-frontend-domain.com", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

(async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {}
})();
