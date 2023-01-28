// pgClient.on('error', ()=> console.log('Lost PG Connection'));
// pgClient.query('CREATE TABLE IF NOT EXITS values (number INT)').catch(err=>console.log(err));

const keys = require("./keys");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const pgClient = new Pool({
  host: keys.pgHost,
  user: keys.pgUser,
  database: keys.pdDatabase,
  port: keys.pgPort,
  password: keys.pgPassword,
});

console.log("Database Initialize!!!");
pgClient.on("connect", client => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch(err => console.error(err));
});
// pgClient.query("CREATE TABLE IF NOT EXISTS values (number INT)").catch(err => {
//   console.log("Paso");
//   console.error("Error:", err);
// });

//Redis
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

const redisPublisher = redisClient.duplicate();

//Express route handlers

app.get("/", (req, res) => {
  res.send("Hi!");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values");

  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;
  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high!");
  }
  redisClient.hset("values", index, "Nothing yet!");
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values (number) VALUES($1)", [index]);
  res.send({ working: true });
});

app.listen(5000, err => {
  console.log("Listening on Port 5000!");
});
