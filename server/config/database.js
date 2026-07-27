const mongoose = require("mongoose");
require("dotenv").config();

const { MONGODB_URL, MONGO_URI } = process.env;
const DATABASE_URL = MONGODB_URL || MONGO_URI;

exports.connectDB = () => {
	if (!DATABASE_URL) {
		throw new Error("Missing database connection string. Set MONGODB_URL or MONGO_URI in the environment.");
	}

	mongoose
		.connect(DATABASE_URL)
		.then(console.log(`DB Connection Success`))
		.catch((err) => {
			console.log(`DB Connection Failed`);
			console.log(err);
			process.exit(1);
		});
};
