import mongoose from "mongoose"

const AutoAnalysis = new mongoose.Schema({
  ContactTag : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contact",
  },
  Contact : {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contact",
  },
  ProductCategory : { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  Product : { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  }
})

export default mongoose.model("AutoAnalysis", AutoAnalysis)