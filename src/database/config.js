const dotenv = require('dotenv')

dotenv.config()



const configMongoDB = {
  user: process.env.USER_DB_MONGO_DB,
  password: process.env.PASSWORD_DB_MONGO_DB,
  database: process.env.NAME_DB_MONGO_DB,
  app_name: process.env.APP_NAME_MONGO_DB
}

module.exports = { configMongoDB }
