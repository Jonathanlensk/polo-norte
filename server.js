require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const systemRoutes = require("./src/routes/system.routes");
const authRoutes = require("./src/routes/auth.routes");
const customerRoutes = require("./src/routes/customer.routes");
const productsRoutes = require("./src/routes/products.routes");
const ordersRoutes = require("./src/routes/orders.routes");
const customerOrdersRoutes = require("./src/routes/customer-orders.routes");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(systemRoutes);
app.use(authRoutes);
app.use(customerRoutes);
app.use(productsRoutes);
app.use(ordersRoutes);
app.use(customerOrdersRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Polo Norte Bebidas rodando em http://localhost:${PORT}`);
});
